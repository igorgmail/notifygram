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

/** Числовой приоритет уровней логирования (чем выше — тем важнее). */
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

/** Длина окна дедупликации повторяющихся ошибок (мс). */
const DEDUP_WINDOW_MS = 60_000;
/** Задержка перед отправкой сгруппированного сообщения (мс). */
const DEDUP_DEBOUNCE_MS = 2_000;

/** Состояние буфера дедупликации для одного уникального сообщения. */
interface DedupState {
  /** Ключ дедупликации (текст или имя+сообщение ошибки). */
  key: string;
  /** Сколько раз сообщение повторилось в текущем окне. */
  count: number;
  /** Время начала текущего окна дедупликации. */
  windowStart: number;
  /** Уровень логирования. */
  level: LogLevel;
  /** Исходное сообщение или объект ошибки. */
  message: string | Error;
  /** Пользовательский заголовок сообщения. */
  label?: string;
  /** Таймер отложенной отправки; null, если не запланирован. */
  flushTimer: ReturnType<typeof setTimeout> | null;
  /** Ожидающие Promise для вызовов, объединённых в этот буфер. */
  waiters: DedupWaiter[];
}

/** Логгер: форматирует сообщения и отправляет их в Telegram. */
export class Notifygram {
  /** Очередь исходящих операций отправки в Telegram. */
  private queue: MessageQueue;
  /** Текущее состояние дедупликации; null, если буфер пуст. */
  private dedupState: DedupState | null = null;

  /** Клиент Telegram API, через который выполняются операции отправки. */
  private readonly telegram: TelegramApi;
  /** Идентификатор чата, куда отправляются сообщения. */
  private readonly chatId: number;

  /** Настройки логгера. */
  private options!: NotifygramOptions;
  /** Контекст, добавляемый к каждому сообщению, и минимальный уровень логирования. */
  private meta!: FormatMessageOptions;
  /** Пользовательские заголовки сообщений по уровню логирования. */
  private labels: NotifygramLabels = {};


  /**
   * Создаёт логгер с явной конфигурацией или fallback на окружение.
   * @param options — Настройки логгера
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

  /** Отправляет кастомное или расширенное сообщение в Telegram. */
  custom(message: string, options: NotifygramCustomMessageOptions = {}): Promise<void> {
    return this.log("custom", new NotifygramCustomMessage("custom", message, {
      label: options.label ?? this.labelFor("custom"),
      meta: this.metaData,
      mode: options.mode,
    }));
  }

  /** Отправляет простое сообщение в Telegram. */
  message(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.log("message", new NotifygramNativeMessage("message", message, {
      label: options.label ?? this.labelFor("message"),
      meta: this.metaData,
    }));
  }

  /** Отправляет информационное сообщение. */
  info(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.log("info", new NotifygramNativeMessage("info", message, {
      label: options.label ?? this.labelFor("info"),
      meta: this.metaData,
    }));
  }

  /** Отправляет предупреждение. */
  warning(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.log("warning", new NotifygramNativeMessage("warning", message, {
      label: options.label ?? this.labelFor("warning"),
      meta: this.metaData,
    }));
  }

  /** Отправляет ошибку с дедупликацией повторов. */
  error(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.logDedup("error", message, options);
  }

  /** Отправляет критическую ошибку с дедупликацией повторов. */
  fatal(message: string | Error, options: NotifygramMessageOptions = {}): Promise<void> {
    return this.logDedup("fatal", message, options);
  }

  
  /** Получает метаданные для сообщения. */
  get metaData() {
    return this.options.showMeta ? this.meta : undefined;
  }


  /** Немедленно отправляет буфер дедупликации и всю очередь операций. */
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

  /** Записывает сообщение, если его уровень не ниже минимального. */
  private log(level: LogLevel, notifygramMessage: NotifygramMessage): Promise<void> {
    if (!this.shouldLog(level)) {
      return Promise.resolve();
    }

    return this.send(notifygramMessage);
  }

  /** Проверяет, проходит ли уровень сообщения фильтр minLevel. */
  private shouldLog(level: LogLevel): boolean {
    const value = LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.options.minLevel ?? "custom"];
    return value;
  }

  /** Ставит в очередь команду отправки Telegram. */
  private send(notifygramMessage: NotifygramMessage): Promise<void> {
    return this.queue.enqueue(() => notifygramMessage.send(this.telegram, this.chatId));
  }

  /** Возвращает метку (label) для указанного уровня логирования. */
  private labelFor(level: LogLevel): string | undefined {
    return this.labels[level];
  }

  /**
   * Логирует с дедупликацией: одинаковые сообщения в окне объединяются
   * и отправляются одним сообщением с счётчиком повторов.
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

  /** Форматирует и ставит в очередь одно сообщение с учётом счётчика повторов. */
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

  /** Строит ключ дедупликации из строки или ошибки. */
  private dedupKey(message: string | Error, label?: string): string {
    const labelPrefix = label !== undefined ? `label:${label}:` : "";

    if (isErrorObject(message)) {
      return `${labelPrefix}${message.name}:${message.message}`;
    }

    return `${labelPrefix}${message}`;
  }
}

/** Фабрика: создаёт экземпляр Notifygram с опциональными настройками. */
export function createNotifygram(options?: NotifygramOptions): Notifygram {
  return new Notifygram(options);
}
