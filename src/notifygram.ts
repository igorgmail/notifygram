import os from "node:os";
import { loadConfig } from "./config.js";
import { MessageQueue } from "./queue.js";
import {
  NotifygramNativeMessage,
  NotifygramCustomMessage,
} from "./messages.js";
import { TelegramApi } from "./telegram.js";

import type { NotifygramMessage, NotifygramCustomMessageOptions, NotifygramMessageOptions } from "./messages.js";
import type { FormatMessageOptions, LogLevel, NotifygramLabels, NotifygramOptions } from "./types/notifygram.js";
import { isErrorObject } from "./types/notifygram.js";

/** Numeric priority of log levels (higher means more important). */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  custom: 0,
  message: 1,
  info: 2,
  warning: 3,
  error: 4,
  fatal: 5,
};

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LEVEL_PRIORITY, value);
}

function normalizeMinLevel(minLevel: string): LogLevel {
  if (isLogLevel(minLevel)) {
    return minLevel;
  }

  console.warn(`[notifygram] Invalid minLevel value: ${String(minLevel)}`);
  return "custom";
}

interface DedupWaiter {
  resolve: () => void;
  reject: (error: unknown) => void;
}

type NotifygramDefaultOptions = Required<Pick<NotifygramOptions, "minLevel" | "showMeta">> & {
  meta: Required<NonNullable<NotifygramOptions["meta"]>>;
};

const DEFAULT_NOTIFYGRAM_OPTIONS: NotifygramDefaultOptions = {
  minLevel: "custom",
  showMeta: true,
  meta: {
    service: "",
    env: "",
    hostname: true,
    timeStamp: true,
  },
};

/** Deduplication window length for repeated errors (ms). */
const DEDUP_WINDOW_MS = 60_000;
/** Delay before sending a grouped message (ms). */
const DEDUP_DEBOUNCE_MS = 2_000;

/** Deduplication buffer state for a single unique message. */
interface DedupState {
  /** Deduplication key (text, or error name + message). */
  key: string;
  /** How many times the message repeated in the current window. */
  count: number;
  /** Start time of the current deduplication window. */
  windowStart: number;
  /** Log level. */
  level: LogLevel;
  /** Original message or error object. */
  message: string | Error;
  /** Custom message title. */
  label?: string;
  /** Deferred send timer; null if not scheduled. */
  flushTimer: ReturnType<typeof setTimeout> | null;
  /** Pending promises for calls merged into this buffer. */
  waiters: DedupWaiter[];
}

/** Logger: formats messages and sends them to Telegram. */
export class Notifygram {
  /** Queue of outgoing Telegram send operations. */
  private queue: MessageQueue;
  /** Current deduplication state; null if the buffer is empty. */
  private dedupState: DedupState | null = null;

  /** Telegram API client used for send operations. */
  private readonly telegram: TelegramApi;
  /** Chat ID where messages are sent. */
  private readonly chatId: number;

  /** Logger options. */
  private options!: NotifygramOptions;
  /** Context added to every message, plus the minimum log level. */
  private meta!: FormatMessageOptions;
  /** Custom message titles by log level. */
  private labels: NotifygramLabels = {};


  /**
   * Creates a logger with explicit config or falls back to environment.
   * @param options — Logger options
   */
  constructor(options: NotifygramOptions = {}) {
    const config = loadConfig({
      token: options.token,
      chatId: options.chatId,
    });

    this.telegram = new TelegramApi(config.token);
    this.chatId = config.chatId;
    this.queue = new MessageQueue();

    this.init(options);
  }

  init(options: NotifygramOptions = {}) {
    this.meta = {
      service: options.meta?.service ?? process.env.SERVICE_NAME ?? DEFAULT_NOTIFYGRAM_OPTIONS.meta.service,
      env: options.meta?.env ?? process.env.NODE_ENV ?? DEFAULT_NOTIFYGRAM_OPTIONS.meta.env,
      hostname: (options.meta?.hostname ?? DEFAULT_NOTIFYGRAM_OPTIONS.meta.hostname) ? os.hostname() : undefined,
      timeStamp: options.meta?.timeStamp ?? DEFAULT_NOTIFYGRAM_OPTIONS.meta.timeStamp,
    };

    this.options = {
      minLevel: normalizeMinLevel(options.minLevel ?? DEFAULT_NOTIFYGRAM_OPTIONS.minLevel),
      showMeta: options.showMeta ?? DEFAULT_NOTIFYGRAM_OPTIONS.showMeta,
    };
    this.labels = { ...options.labels };
  }

  /** Sends a custom or rich message to Telegram. */
  custom(message: string, options: NotifygramCustomMessageOptions = {}): Promise<void> {
    return this.log("custom", new NotifygramCustomMessage("custom", message, {
      label: options.label ?? this.labelFor("custom"),
      meta: this.metaData,
      mode: options.mode,
    }));
  }

  /** Sends a plain message to Telegram. */
  message(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.log("message", new NotifygramNativeMessage("message", message, {
      label: options.label ?? this.labelFor("message"),
      meta: this.metaData,
    }));
  }

  /** Sends an informational message. */
  info(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.log("info", new NotifygramNativeMessage("info", message, {
      label: options.label ?? this.labelFor("info"),
      meta: this.metaData,
    }));
  }

  /** Sends a warning. */
  warning(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.log("warning", new NotifygramNativeMessage("warning", message, {
      label: options.label ?? this.labelFor("warning"),
      meta: this.metaData,
    }));
  }

  /** Sends an error with deduplication of repeats. */
  error(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.logDedup("error", message, options);
  }

  /** Sends a fatal error with deduplication of repeats. */
  fatal(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.logDedup("fatal", message, options);
  }

  
  /** Returns metadata for a message. */
  get metaData() {
    return this.options.showMeta ? this.meta : undefined;
  }


  /** Immediately flushes the deduplication buffer and the entire operation queue. */
  async flush(): Promise<void> {
    if (this.dedupState) {
      const state = this.dedupState;
      if (state.flushTimer) {
        clearTimeout(state.flushTimer);
        state.flushTimer = null;
      }
      await this.flushDedup(state);
    }

    return this.queue.flush();
  }

  /** Logs a message if its level is at or above the minimum. */
  private log(level: LogLevel, notifygramMessage: NotifygramMessage): Promise<void> {
    if (!this.shouldLog(level)) {
      return Promise.resolve();
    }

    return this.send(notifygramMessage);
  }

  /** Checks whether the message level passes the minLevel filter. */
  private shouldLog(level: LogLevel): boolean {
    const value = LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.options.minLevel ?? "custom"];
    return value;
  }

  /** Enqueues a Telegram send operation. */
  private send(notifygramMessage: NotifygramMessage): Promise<void> {
    return this.queue.enqueue(() => notifygramMessage.send(this.telegram, this.chatId));
  }

  /** Returns the label for the given log level. */
  private labelFor(level: LogLevel): string | undefined {
    return this.labels[level];
  }

  /**
   * Logs with deduplication: identical messages in the window are merged
   * and sent as a single message with a repeat count.
   */
  private logDedup(
    level: LogLevel,
    message: string | Error,
    options: NotifygramMessageOptions = {}
  ): Promise<void> {
    if (!this.shouldLog(level)) {
      return Promise.resolve();
    }

    const label = options.label ?? this.labelFor(level);
    const key = this.dedupKey(message, label);
    const now = Date.now();
    const isSameWindow =
      this.dedupState &&
      this.dedupState.key === key &&
      now - this.dedupState.windowStart < DEDUP_WINDOW_MS;

    if (this.dedupState && !isSameWindow) {
      const previous = this.dedupState;
      if (previous.flushTimer) {
        clearTimeout(previous.flushTimer);
        previous.flushTimer = null;
      }
      void this.flushDedup(previous);
    }

    if (isSameWindow && this.dedupState) {
      this.dedupState.count += 1;
    } else {
      this.dedupState = {
        key,
        count: 1,
        windowStart: now,
        level,
        message,
        label,
        flushTimer: null,
        waiters: [],
      };
    }

    const state = this.dedupState;

    if (state.flushTimer) {
      clearTimeout(state.flushTimer);
    }

    return new Promise((resolve, reject) => {
      state.waiters.push({ resolve, reject });
      state.flushTimer = setTimeout(() => {
        state.flushTimer = null;
        void this.flushDedup(state);
      }, DEDUP_DEBOUNCE_MS);
    });
  }

  /** Formats and enqueues a single message, including the repeat count. */
  private async flushDedup(state: DedupState): Promise<void> {
    if (this.dedupState === state) {
      this.dedupState = null;
    }

    try {
      await this.send(
        new NotifygramNativeMessage(
          state.level,
          state.message,
          {
            data: {
              count: state.count > 1 ? state.count : undefined,
            },
            label: state.label,
            meta: this.metaData,
          }
        )
      );
      for (const waiter of state.waiters) {
        waiter.resolve();
      }
    } catch (error) {
      for (const waiter of state.waiters) {
        waiter.reject(error);
      }
      throw error;
    }
  }

  /** Builds a deduplication key from a string or error. */
  private dedupKey(message: string | Error, label?: string): string {
    const labelPrefix = label !== undefined ? `label:${label}:` : "";

    if (isErrorObject(message)) {
      return `${labelPrefix}${message.name}:${message.message}`;
    }

    return `${labelPrefix}${message}`;
  }
}

/** Factory: creates a Notifygram instance with optional settings. */
export function createNotifygram(options?: NotifygramOptions): Notifygram {
  return new Notifygram(options);
}
