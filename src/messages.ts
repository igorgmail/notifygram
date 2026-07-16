import { formatMessage, formatRichMessage } from "./formatter.js";
import type { CustomMessageMode } from "./formatter.js";
import type { TelegramApi } from "./telegram.js";
import type { FormatMessageOptions, LogLevel, NotifygramMessageData } from "./types/notifygram.js";

/** Message that can be sent via the Telegram API. */
export interface NotifygramMessage {
  readonly message: string | Error;
  readonly options?: NotifygramMessageOptions;

  send(telegram: TelegramApi, chatId: number): Promise<unknown>;
}

/** Data and metadata used when formatting a message. */
export interface NotifygramMessageOptions {
  data?: NotifygramMessageData;
  label?: string;
  meta?: FormatMessageOptions;
}

/** Custom message options that set the text markup mode. */
export interface NotifygramCustomMessageOptions {
  mode?: CustomMessageMode;
  /** Message title. If omitted, no title is added. */
  label?: string;
}

/** Regular HTML message. */
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

/** Rich (extended) message. */
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
      label: this.options.label,
    });

    return telegram.sendRichMessage({
      chatId,
      richMessage: data,
    });
  }
}
