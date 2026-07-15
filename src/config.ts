import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConfigError } from "./errors.js";

import type { AppConfig } from "./types/app.js";

const INIT_HINT =
  "Run `npx notifygram init` to discover your channel ID.";

export { ConfigError } from "./errors.js";

export interface LoadConfigOptions {
  token?: string;
  chatId?: number | string;
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig | never {
  const hasExplicitConfig =
    options.token !== undefined && options.chatId !== undefined;

  if (!hasExplicitConfig) {
    loadProjectEnv();
  }

  const token = options.token?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIdRaw =
    options.chatId !== undefined
      ? String(options.chatId).trim()
      : process.env.TELEGRAM_CHAT_ID?.trim();

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

export function loadProjectEnv(
  envPath = resolve(process.cwd(), ".env")
): void {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function loadTokenFromEnv(): string | undefined {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || undefined;
}
