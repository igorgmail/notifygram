/** Severity level used to filter and format outgoing notifications. */
export type LogLevel = "custom" | "message" | "info" | "warning" | "error" | "fatal";

/** Options added to every notification created by Notifygram. */
export interface INotifygramOptions {
  /** Service name shown in the notification metadata. */
  service?: string;
  /** Environment name. Defaults to NODE_ENV when omitted. */
  env?: string;
  /** Hostname shown in metadata. Defaults to the current OS hostname. */
  hostname?: string;
  /** Minimum level to send. Defaults to "message". */
  minLevel?: LogLevel;
}

export interface IFormatMessageOptions extends INotifygramOptions {
  count?: number;
}

/* Guard */
export function isErrorObject(value: unknown): value is Error {
  return value instanceof Error
}