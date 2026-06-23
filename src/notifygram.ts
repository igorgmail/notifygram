import os from "node:os";
import { loadConfig, loadProjectEnv } from "./config.js";
import { formatMessage } from "./formatter.js";
import { MessageQueue } from "./queue.js";
import {
  RichMessageCommand,
  TextMessageCommand,
  type RichMessagePayload,
  type TelegramSendCommand,
} from "./send-command.js";
import { TelegramApi } from "./telegram.js";
import type { LogLevel, NotifygramMessage, NotifygramOptions } from "./types.js";
import { isErrorObject } from "./types.js";

/** Числовой приоритет уровней логирования (чем выше — тем важнее). */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  message: 1,
  info: 2,
  warning: 3,
  error: 4,
  fatal: 5,
};

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
  message: NotifygramMessage;
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
  private readonly context: NotifygramOptions;
  /** Текущее состояние дедупликации; null, если буфер пуст. */
  private dedupState: DedupState | null = null;

  /**
   * Создаёт логгер с конфигурацией из окружения и переданными опциями.
   * @param options — имя сервиса, окружение, хост и минимальный уровень логов.
   */
  constructor(options: NotifygramOptions = {}) {
    loadProjectEnv()
    const config = loadConfig();

    this.telegram = new TelegramApi(config.token);
    this.chatId = config.chatId;
    this.queue = new MessageQueue();
    this.context = {
      service: options.service ?? process.env.SERVICE_NAME ?? "",
      env: options.env ?? process.env.NODE_ENV ?? "",
      hostname: options.hostname ?? os.hostname(),
      minLevel: options.minLevel ?? "message",
    };
  }

  /** Отправляет кастомное или расширенное сообщение в Telegram. */
  custom(message: NotifygramMessage): Promise<void>;
  custom(message: RichMessagePayload): Promise<void>;
  custom(message: NotifygramMessage | RichMessagePayload): Promise<void> {
    if (this.isRichMessagePayload(message)) {
      return this.send(new RichMessageCommand(message));
    }

    return this.log("message", message);
  }

  /** Отправляет простое сообщение в Telegram. */
  message(message: NotifygramMessage): Promise<void> {
    return this.log("message", message);
  }

  /** Отправляет информационное сообщение. */
  info(message: NotifygramMessage): Promise<void> {
    return this.log("info", message);
  }

  /** Отправляет предупреждение. */
  warning(message: NotifygramMessage): Promise<void> {
    return this.log("warning", message);
  }

  /** Отправляет ошибку с дедупликацией повторов. */
  error(message: NotifygramMessage): Promise<void> {
    return this.logDedup("error", message);
  }

  /** Отправляет критическую ошибку с дедупликацией повторов. */
  fatal(message: NotifygramMessage): Promise<void> {
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
  private log(level: LogLevel, message: NotifygramMessage): Promise<void> {
    if (!this.shouldLog(level)) {
      return Promise.resolve();
    }

    const text = formatMessage(level, message, this.context);
    return this.send(new TextMessageCommand(text));
  }

  /**
   * Логирует с дедупликацией: одинаковые сообщения в окне объединяются
   * и отправляются одним сообщением с счётчиком повторов.
   */
  private logDedup(level: LogLevel, message: NotifygramMessage): Promise<void> {
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
    const text = formatMessage(state.level, state.message, {
      ...this.context,
      count: state.count > 1 ? state.count : undefined,
    });

    if (this.dedupState === state) {
      this.dedupState = null;
    }

    try {
      await this.send(new TextMessageCommand(text));
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

  /** Ставит в очередь команду отправки Telegram. */
  private send(command: TelegramSendCommand): Promise<void> {
    return this.queue.enqueue(() => command.send(this.telegram, this.chatId));
  }

  /** Строит ключ дедупликации из строки или ошибки. */
  private dedupKey(message: NotifygramMessage): string {
    if (isErrorObject(message)) {
      return `${message.name}:${message.message}`;
    }

    return message;
  }

  /** Проверяет, является ли payload расширенным сообщением. */
  private isRichMessagePayload(
    message: NotifygramMessage | RichMessagePayload
  ): message is RichMessagePayload {
    const candidate = message as Partial<RichMessagePayload>;

    return (
      typeof message === "object" &&
      message !== null &&
      candidate.kind === "rich" &&
      typeof candidate.title === "string"
    );
  }

  /** Проверяет, проходит ли уровень сообщения фильтр minLevel. */
  private shouldLog(level: LogLevel): boolean {
    const value = LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.context?.minLevel ?? "message"];
    return value;
  }
}

/** Фабрика: создаёт экземпляр Notifygram с опциональными настройками. */
export function createNotifygram(options?: NotifygramOptions): Notifygram {
  return new Notifygram(options);
}
