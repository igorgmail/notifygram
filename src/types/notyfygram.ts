/** Severity level used to filter and format outgoing notifications. */
export type LogLevel = "custom" | "message" | "info" | "warning" | "error" | "fatal";

export type NotifygramLabels = Partial<Record<LogLevel, string>>;


/** Options added to every notification created by Notifygram. */
export interface INotifygramOptions {
  /** Show service, env, hostname in the notification. Defaults to true. */
  showMeta?: boolean;
  /** Minimum level to send. Defaults to "message". */
  minLevel?: LogLevel;
  /** Custom labels shown as notification headers by log level. */
  labels?: NotifygramLabels;
  /** Metadata options for every notification created by Notifygram. */
  meta?: INotifygramMetaOptions;

}

/** Metadata options for every notification created by Notifygram. */
export interface INotifygramMetaOptions {
  /** Service name shown in the notification metadata. */
  service?: string;
  /** Environment name. Defaults to NODE_ENV when omitted. */
  env?: string;
  /** Hostname shown in metadata. Current OS hostname. */
  hostname?: boolean;
  /** Timestamp shown in metadata. Defaults to the current ISO string. */
  timeStamp?: boolean;
}

/** Data for every notification created by Notifygram. */
export interface INotifygramMessageData {
  // /** Level name shown in the notification. (custom, message, info, warning, error, fatal) */
  // levelName: LogLevel;
  /** Number of messages displayed in the notification during deduplication. */
  count?: number;
}

export interface IFormatMessageOptions {
  label?: string;
  service?: string;
  env?: string;
  hostname?: string;
  timeStamp?: boolean;
  count?: number;
}

/* Guard */
export function isErrorObject(value: unknown): value is Error {
  return value instanceof Error
}