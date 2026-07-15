

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * This object represents an incoming update.
 * At most one of the optional fields can be present in any given update.
 */
export interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramMessage;
  message?: TelegramMessage;
}

/** Telegram chat type. */
export enum ChatType {
  PRIVATE = "private",
  GROUP = "group",
  SUPERGROUP = "supergroup",
  CHANNEL = "channel"
}

/**
 * This object represents a Telegram chat.
 * @see https://core.telegram.org/bots/api#chat
 */
export interface TelegramChat {
  id: number;
  type: ChatType;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
  is_direct_messages?: boolean;
}

/**
 * This object represents a Telegram message.
 * @see https://core.telegram.org/bots/api#message
 */
export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  sender_chat?: TelegramChat;
}

/**
 * This object represents a Telegram response parameters.
 * @see https://core.telegram.org/bots/api#responseparameters
 */
export interface TelegramResponseParameters {
  migrate_to_chat_id?: number;
  retry_after?: number;
}

/** Successful Bot API JSON response. */
export interface TelegramSuccessResponse<T> {
  ok: true;
  result: T;
  description?: never;
  error_code?: never;
  parameters?: never;
}

/** Failed Bot API JSON response. */
export interface TelegramErrorResponse {
  ok: false;
  result?: never;
  description?: string;
  error_code?: number;
  parameters?: TelegramResponseParameters;
}

/**
 * Bot API JSON response.
 * @see https://core.telegram.org/bots/api#making-requests
 */
export type TelegramResponse<T> =
  | TelegramSuccessResponse<T>
  | TelegramErrorResponse;

/**
 * Parameters for getUpdates.
 * @see https://core.telegram.org/bots/api#getupdates
 */
export interface GetUpdatesParams {
  /** Identifier of the first update to return. */
  offset?: number;
  /** Limits the number of updates to retrieve. */
  limit?: number;
  /** Long polling timeout in seconds. */
  timeout?: number;
}

/**
 * Result returned by sendMessage.
 * @see https://core.telegram.org/bots/api#sendmessage
 */
export interface SendMessageResult {
  message_id: number;
}

/**
 * Тип для параметра rich_message в sendRichMessage и sendRichMessageDraft.
 * Ровно одно из полей (html или markdown) должно быть передано — API требует это.
 *
 * Примеры:
 *   { html: '<b>Жирный текст</b>' }
 *   { markdown: '**Жирный текст**', is_rtl: false }
 */
export type InputRichMessage = InputRichMessageHtml | InputRichMessageMarkdown;

/** Вариант InputRichMessage с HTML-форматированием */
export interface InputRichMessageHtml {
  /** HTML-контент rich-сообщения */
  html: string;
  markdown?: never;
  /** Передайте true для отображения текста справа налево */
  is_rtl?: boolean;
  /**
   * Передайте true чтобы отключить автоматическое определение сущностей
   * (URL, email, упоминания, хэштеги, команды, телефоны и т.д.)
   */
  skip_entity_detection?: boolean;
}

/** Вариант InputRichMessage с Markdown-форматированием */
export interface InputRichMessageMarkdown {
  html?: never;
  /** Markdown-контент rich-сообщения */
  markdown: string;
  /** Передайте true для отображения текста справа налево */
  is_rtl?: boolean;
  /**
   * Передайте true чтобы отключить автоматическое определение сущностей
   * (URL, email, упоминания, хэштеги, команды, телефоны и т.д.)
   */
  skip_entity_detection?: boolean;
}

