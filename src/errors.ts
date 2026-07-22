import type { TelegramResponseParameters } from "./types/telegram.js";

/** Thrown when required Notifygram configuration is missing or invalid. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Thrown when Telegram Bot API returns an unsuccessful response. */
export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly errorCode?: number,
    public readonly parameters?: TelegramResponseParameters
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

/** Thrown when a Telegram request fails before receiving an API response. */
export class TelegramNetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "TelegramNetworkError";
  }
}
