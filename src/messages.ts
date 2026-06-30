import type { InputRichMessage } from "./telegram-bot-types.js";
import type { TelegramApi } from "./telegram.js";

/** Команда отправки, которую можно выполнить через Telegram API. */
export interface NotifygramMessage {
  send(telegram: TelegramApi, chatId: number): Promise<unknown>;
}


/** Команда отправки обычного HTML-сообщения. */
export class NotifygramNativeMessage implements NotifygramMessage {
  constructor(private readonly text: string) {}

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
    return telegram.sendMessage({
      chatId,
      text: this.text,
      parseMode: "HTML",
    });
  }
}

/** Команда отправки расширенного сообщения. */
export class NotifygramCustomMessage implements NotifygramMessage {
  constructor(private readonly data: InputRichMessage, private readonly options?: {}) {
  }

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
        console.log("▶NotifygramRichMessageCommand", this);
    return telegram.sendRichMessage({
      chatId,
      richMessage: this.data,
    });
  }
}
