import { formatMessage, formatRichMessage } from "./formatter.js";
import type { CustomMessageMode } from "./formatter.js";
import type { TelegramApi } from "./telegram.js";
import type { FormatMessageOptions, LogLevel, NotifygramMessageData } from "./types/notifygram.js";

/** Сообщение, которое можно отправить через Telegram API. */
export interface NotifygramMessage {
  readonly message: string | Error;
  readonly options?: NotifygramMessageOptions;

  send(telegram: TelegramApi, chatId: number): Promise<unknown>;
}

/** Данные и метаданные, используемые при форматировании сообщения. */
export interface NotifygramMessageOptions {
  data?: NotifygramMessageData;
  label?: string;
  meta?: FormatMessageOptions;
}

/** Настройки пользовательского сообщения, задающие режим разметки текста. */
export interface NotifygramCustomMessageOptions {
  mode?: CustomMessageMode;
}

/** Обычное HTML-сообщение. */
export class NotifygramNativeMessage implements NotifygramMessage {

  constructor(
    public levelName: LogLevel,
    public message: string | Error,
    public options: NotifygramMessageOptions = {}
  ) {
    this.levelName = levelName;
    this.message = message;
    this.options = {
      label: options.label,
      meta: {...options.meta},
      data: options.data ? { ...options.data } : undefined,
    };
  }

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
    const text = formatMessage(this.levelName, this.message, {
      ...this.options.meta,
      label: this.options.label,
      count: this.options.data?.count,
    });

    return telegram.sendMessage({
      chatId,
      text,
      parseMode: "HTML",
    });
  }
}

/** Расширенное (rich) сообщение. */
export class NotifygramCustomMessage implements NotifygramMessage {
  constructor(
    public levelName: LogLevel,
    public message: string,
    public options: NotifygramMessageOptions & NotifygramCustomMessageOptions = {}
  ) {
    this.message = message;
    this.options = {
      ...options,
      meta: { ...options.meta },
      data: options.data ? { ...options.data } : undefined,
    };
  }

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
    const data = formatRichMessage(this.message, {
      mode: this.options.mode,
      meta: this.options.meta,
    });

    return telegram.sendRichMessage({
      chatId,
      richMessage: data,
    });
  }
}
