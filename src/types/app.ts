/** Resolved bot credentials used by Notifygram at runtime. */
export interface AppConfig {
  /** Telegram bot token. */
  token: string;
  /** Telegram chat / channel ID. */
  chatId: number;
}
