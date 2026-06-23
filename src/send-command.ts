import { escapeHtml } from "./formatter.js";
import type { TelegramApi } from "./telegram.js";

/** Команда отправки, которую можно выполнить через Telegram API. */
export interface TelegramSendCommand {
  send(telegram: TelegramApi, chatId: number): Promise<unknown>;
}

/** Структурированное поле для rich-сообщения. */
export interface RichMessageField {
  label: string;
  value: string;
}

/** Payload для расширенного сообщения. */
export interface RichMessagePayload {
  kind: "rich";
  title: string;
  body?: string;
  fields?: RichMessageField[];
}

/** Команда отправки обычного HTML-сообщения. */
export class TextMessageCommand implements TelegramSendCommand {
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
export class RichMessageCommand implements TelegramSendCommand {
  constructor(private readonly payload: RichMessagePayload) {}

  send(telegram: TelegramApi, chatId: number): Promise<unknown> {
    return telegram.sendMessage({
      chatId,
      text: this.formatHtml(),
      parseMode: "HTML",
    });
  }

  private formatHtml(): string {
    const lines = [`<b>${escapeHtml(this.payload.title)}</b>`];

    if (this.payload.body) {
      lines.push("", escapeHtml(this.payload.body));
    }

    if (this.payload.fields?.length) {
      lines.push("");
      for (const field of this.payload.fields) {
        lines.push(
          `<b>${escapeHtml(field.label)}:</b> ${escapeHtml(field.value)}`
        );
      }
    }

    return lines.join("\n");
  }
}
