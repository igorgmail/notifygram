/** Severity level used to filter and format outgoing notifications. */
export type LogLevel = "custom" | "message" | "info" | "warning" | "error" | "fatal";

export type NotifygramLabels = Partial<Record<LogLevel, string>>;

/** Options for creating a Notifygram instance. */
export interface NotifygramOptions {
  /** Telegram bot token. Falls back to TELEGRAM_BOT_TOKEN when omitted. */
  token?: string;
  /** Telegram chat ID. Falls back to TELEGRAM_CHAT_ID when omitted. */
  chatId?: number | string;
  /** Show service, env, hostname, and timestamp metadata. Defaults to true. */
  showMeta?: boolean;
  /** Minimum level to send. Defaults to "custom". */
  minLevel?: LogLevel;
  /** Custom labels shown as notification headers by log level. */
  labels?: NotifygramLabels;
  /** Metadata options for every notification created by Notifygram. */
  meta?: NotifygramMetaOptions;
}

/** Metadata options for every notification created by Notifygram. */
export interface NotifygramMetaOptions {
  /** Service name shown in the notification metadata. */
  service?: string;
  /** Environment name. Defaults to NODE_ENV when omitted. */
  env?: string;
  /** Show the current OS hostname in metadata. Defaults to true. */
  hostname?: boolean;
  /** Show a timestamp in metadata. Defaults to true. */
  timeStamp?: boolean;
}

/** Data for every notification created by Notifygram. */
export interface NotifygramMessageData {
  /** Number of messages displayed in the notification during deduplication. */
  count?: number;
}

export interface FormatMessageOptions {
  label?: string;
  service?: string;
  env?: string;
  hostname?: string;
  timeStamp?: boolean;
  count?: number;
}

export function isErrorObject(value: unknown): value is Error {
  return value instanceof Error;
}
