import { formatMessage, processMessageForTelegram } from "./formatter.js";
import type { TelegramApi } from "./telegram.js";
import type { INotifygramNativeMessageOptions, LogLevel } from "./types/notyfygram.js";

/** Команда отправки, которую можно выполнить через Telegram API. */
export interface NotifygramMessage {
  send(telegram: TelegramApi, chatId: number): Promise<unknown>;
}

/** Настройки пользовательского сообщения, задающие режим разметки текста. */
export interface NotifygramCustomMessageOptions {
  mode?: "html" | "markdown";
}

/** Команда отправки обычного HTML-сообщения. */
export class NotifygramNativeMessage implements NotifygramMessage {
  constructor(
    private readonly level: LogLevel,
    private readonly message: string | Error,
    private readonly options: INotifygramNativeMessageOptions = {}
  ) {}

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
    const text = formatMessage(this.level, this.message, this.options);

    return telegram.sendMessage({
      chatId,
      text,
      parseMode: "HTML",
    });
  }
}

/** Команда отправки расширенного сообщения. */
export class NotifygramCustomMessage implements NotifygramMessage {
  constructor(
    private readonly level: LogLevel,
    private readonly message: string,
    private readonly options: NotifygramCustomMessageOptions
  ) {}

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
    const data = processMessageForTelegram(this.message);

    return telegram.sendRichMessage({
      chatId,
      richMessage: data,
    });
  }
}
