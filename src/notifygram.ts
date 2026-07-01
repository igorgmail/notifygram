import os from "node:os";
import { loadConfig, loadProjectEnv } from "./config.js";
import { MessageQueue } from "./queue.js";
import {
  NotifygramNativeMessage,
  NotifygramCustomMessage,
} from "./messages.js";
import { TelegramApi } from "./telegram.js";

import type { NotifygramMessage, NotifygramCustomMessageOptions } from "./messages.js";
import type { LogLevel, INotifygramOptions,  } from "./types/notyfygram.js";
import { isErrorObject } from "./types/notyfygram.js";

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

function normalizeMinLevel(minLevel: unknown): LogLevel {
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
  /** Таймер отложенной отправки; null, если не запланирован. */
  flushTimer: ReturnType<typeof setTimeout> | null;
  /** Ожидающие Promise для вызовов, объединённых в этот буфер. */
  waiters: DedupWaiter[];
}

/** Логгер: форматирует сообщения и отправляет их в Telegram. */
export class Notifygram {
  /** Очередь исходящих операций отправки в Telegram. */
  private readonly queue: MessageQueue;
  /** Клиент Telegram API, через который выполняются операции отправки. */
  private readonly telegram: TelegramApi;
  /** Идентификатор чата, куда отправляются сообщения. */
  private readonly chatId: number;
  /** Контекст, добавляемый к каждому сообщению, и минимальный уровень логирования. */
  private readonly context: INotifygramOptions;
  /** Текущее состояние дедупликации; null, если буфер пуст. */
  private dedupState: DedupState | null = null;

  /**
   * Создаёт логгер с конфигурацией из окружения и переданными опциями.
   * @param options — имя сервиса, окружение, хост и минимальный уровень логов.
   */
  constructor(options: INotifygramOptions = {}) {
    loadProjectEnv()
    const config = loadConfig();

    this.telegram = new TelegramApi(config.token);
    this.chatId = config.chatId;
    this.queue = new MessageQueue();
    this.context = {
      service: options.service ?? process.env.SERVICE_NAME ?? "",
      env: options.env ?? process.env.NODE_ENV ?? "",
      hostname: options.hostname ?? os.hostname(),
      minLevel: normalizeMinLevel(options.minLevel),
    };
  }

  /** Отправляет кастомное или расширенное сообщение в Telegram. */
  custom(
    message: string,
    options: NotifygramCustomMessageOptions = { mode: "html" }
  ): Promise<void> {
    return this.log("custom", new NotifygramCustomMessage(message, options));
  }

  /** Отправляет простое сообщение в Telegram. */
  message(message: string | Error): Promise<void> {
    return this.log("message", new NotifygramNativeMessage("message", message, this.context));
  }

  /** Отправляет информационное сообщение. */
  info(message: string | Error): Promise<void> {
    return this.log("info", new NotifygramNativeMessage("info", message, this.context));
  }

  /** Отправляет предупреждение. */
  warning(message: string | Error): Promise<void> {
    return this.log("warning", new NotifygramNativeMessage("warning", message, this.context));
  }

  /** Отправляет ошибку с дедупликацией повторов. */
  error(message: string | Error): Promise<void> {
    return this.logDedup("error", message);
  }

  /** Отправляет критическую ошибку с дедупликацией повторов. */
  fatal(message: string | Error): Promise<void> {
    return this.logDedup("fatal", message);
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
    const value = LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.context?.minLevel ?? "custom"];
    return value;
  }

  /** Ставит в очередь команду отправки Telegram. */
  private send(notifygramMessage: NotifygramMessage): Promise<void> {
    return this.queue.enqueue(() => notifygramMessage.send(this.telegram, this.chatId));
  }

  /**
   * Логирует с дедупликацией: одинаковые сообщения в окне объединяются
   * и отправляются одним сообщением с счётчиком повторов.
   */
  private logDedup(level: LogLevel, message: string | Error): Promise<void> {
    if (!this.shouldLog(level)) {
      return Promise.resolve();
    }

    const key = this.dedupKey(message);
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
        new NotifygramNativeMessage(state.level, state.message, {
          ...this.context,
          count: state.count > 1 ? state.count : undefined,
        })
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
  private dedupKey(message: string | Error): string {
    if (isErrorObject(message)) {
      return `${message.name}:${message.message}`;
    }

    return message;
  }
}

/** Фабрика: создаёт экземпляр Notifygram с опциональными настройками. */
export function createNotifygram(options?: INotifygramOptions): Notifygram {
  return new Notifygram(options);
}
