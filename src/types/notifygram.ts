import type { EnvironmentSource } from "../env.js";

/** Severity level used to filter and format outgoing notifications. */
export type LogLevel = "custom" | "message" | "info" | "warning" | "error" | "fatal";

/** Custom notification titles keyed by log level. */
export type NotifygramLabels = Partial<Record<LogLevel, string>>;

/** Options for creating a Notifygram instance. */
export interface NotifygramOptions {
  /**
   * Telegram bot token.
   * Falls back to `TELEGRAM_BOT_TOKEN` from `env` when omitted.
   */
  token?: string;
  /**
   * Telegram chat ID.
   * Falls back to `TELEGRAM_CHAT_ID` from `env` when omitted.
   */
  chatId?: number | string;
  /**
   * Source for credential and meta fallbacks (`TELEGRAM_*`, `SERVICE_NAME`, `NODE_ENV`).
   * Defaults to `ProcessEnvironmentSource` (`process.env` when available).
   * Does not read `.env` files — use a bundler/runtime env or a custom `get()`.
   */
  env?: EnvironmentSource;
  /** Show service, env, hostname, and timestamp metadata. Defaults to `true`. */
  showMeta?: boolean;
  /** Minimum level to send. Defaults to `"custom"`. */
  minLevel?: LogLevel;
  /** Custom labels shown as notification headers by log level. */
  labels?: NotifygramLabels;
  /** Metadata options for every notification created by Notifygram. */
  meta?: NotifygramMetaOptions;
}

/** Metadata options for every notification created by Notifygram. */
export interface NotifygramMetaOptions {
  /**
   * Service name shown in the notification metadata.
   * Falls back to `SERVICE_NAME` from `env` when omitted.
   */
  service?: string;
  /**
   * Environment name shown in the notification metadata.
   * Falls back to `NODE_ENV` from `env` when omitted.
   */
  env?: string;
  /**
   * Optional hostname label shown in metadata.
   * Not auto-detected — pass an explicit string when needed.
   */
  hostname?: string;
  /** Show a timestamp in metadata. Defaults to `true`. */
  timeStamp?: boolean;
}

/** Data for every notification created by Notifygram. */
export interface NotifygramMessageData {
  /** Number of messages displayed in the notification during deduplication. */
  count?: number;
}

/** Resolved metadata and formatting fields attached to an outgoing message. */
export interface FormatMessageOptions {
  /** Message title / header label. */
  label?: string;
  /** Service name shown in the metadata block. */
  service?: string;
  /** Environment name shown in the metadata block. */
  env?: string;
  /** Hostname label shown in the metadata block. */
  hostname?: string;
  /** Whether to include a timestamp. */
  timeStamp?: boolean;
  /** Repeat count shown during deduplication. */
  count?: number;
}

export function isErrorObject(value: unknown): value is Error {
  return value instanceof Error;
}
