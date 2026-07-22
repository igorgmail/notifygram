import { ConfigError } from "./errors.js";
import {
  ProcessEnvironmentSource,
  type EnvironmentSource,
} from "./env.js";

import type { AppConfig } from "./types/app.js";

const INIT_HINT =
  "Run `npx notifygram init` to discover your channel ID.";

export { ConfigError } from "./errors.js";

export interface LoadConfigOptions {
  /** Explicit bot token; otherwise read from `env`. */
  token?: string;
  /** Explicit chat ID; otherwise read from `env`. */
  chatId?: number | string;
  /**
   * Env source for `TELEGRAM_*` fallbacks.
   * Defaults to `ProcessEnvironmentSource` when omitted.
   */
  env?: EnvironmentSource;
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig | never {
  const env = options.env ?? new ProcessEnvironmentSource();

  const token = options.token?.trim() || env.get("TELEGRAM_BOT_TOKEN")?.trim();
  const chatIdRaw =
    options.chatId !== undefined
      ? String(options.chatId).trim()
      : env.get("TELEGRAM_CHAT_ID")?.trim();

  if (!token) {
    throw new ConfigError(
      `TELEGRAM_BOT_TOKEN is missing or empty. ${INIT_HINT}`
    );
  }

  if (!chatIdRaw) {
    throw new ConfigError(
      `TELEGRAM_CHAT_ID is missing or empty. ${INIT_HINT}`
    );
  }

  const chatId = Number(chatIdRaw);
  if (!Number.isFinite(chatId)) {
    throw new ConfigError(
      `TELEGRAM_CHAT_ID must be a number, got "${chatIdRaw}". ${INIT_HINT}`
    );
  }

  return { token, chatId };
}

export function loadTokenFromEnv(
  env: EnvironmentSource = new ProcessEnvironmentSource()
): string | undefined {
  const token = env.get("TELEGRAM_BOT_TOKEN")?.trim();
  return token || undefined;
}
