/** Severity level used to filter and format outgoing notifications. */
export type LogLevel = "message" | "info" | "warning" | "error" | "fatal";

/** Message payload accepted by Notifygram logging methods. */
export type NotifygramMessage = string | Error;

/** Options added to every notification created by Notifygram. */
export interface NotifygramOptions {
  /** Service name shown in the notification metadata. */
  service?: string;
  /** Environment name. Defaults to NODE_ENV when omitted. */
  env?: string;
  /** Hostname shown in metadata. Defaults to the current OS hostname. */
  hostname?: string;
  /** Minimum level to send. Defaults to "message". */
  minLevel?: LogLevel;
}


/** Runtime configuration loaded from environment variables. */
export interface AppConfig {
  token: string;
  chatId: number;
}

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

/** Metadata appended to formatted Telegram messages (see formatMeta). */
export interface FormatContext {
  /** Service name shown as "Service:" in the message header block. */
  service?: string;
  /** Environment name shown as "Environment:" (e.g. production, staging). */
  env?: string;
  /** Host identifier shown as "Host:" in the message header block. */
  hostname?: string;
}

export interface FormatOptions extends FormatContext {
  count?: number;
}

/* Guard */
export function isErrorObject(value: unknown): value is Error {
  return value instanceof Error
}
