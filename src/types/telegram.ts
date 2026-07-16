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
 * Type for the rich_message parameter in sendRichMessage and sendRichMessageDraft.
 * Exactly one of the fields (html or markdown) must be provided — required by the API.
 *
 * Examples:
 *   { html: '<b>Bold text</b>' }
 *   { markdown: '**Bold text**', is_rtl: false }
 */
export type InputRichMessage = InputRichMessageHtml | InputRichMessageMarkdown;

/** InputRichMessage variant with HTML formatting */
export interface InputRichMessageHtml {
  /** HTML content of the rich message */
  html: string;
  markdown?: never;
  /** Pass true to display text right-to-left */
  is_rtl?: boolean;
  /**
   * Pass true to disable automatic entity detection
   * (URLs, emails, mentions, hashtags, commands, phone numbers, etc.)
   */
  skip_entity_detection?: boolean;
}

/** InputRichMessage variant with Markdown formatting */
export interface InputRichMessageMarkdown {
  html?: never;
  /** Markdown content of the rich message */
  markdown: string;
  /** Pass true to display text right-to-left */
  is_rtl?: boolean;
  /**
   * Pass true to disable automatic entity detection
   * (URLs, emails, mentions, hashtags, commands, phone numbers, etc.)
   */
  skip_entity_detection?: boolean;
}

