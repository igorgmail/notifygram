import type { InputRichMessage } from "./types/telegram.js";

import { isErrorObject } from "./types/notifygram.js";
import type { FormatMessageOptions, LogLevel } from "./types/notifygram.js";

export type CustomMessageMode = "html" | "markdown";

export interface FormatRichMessageOptions {
  mode?: CustomMessageMode;
  meta?: FormatMessageOptions;
  /** Заголовок сообщения. Если не задан — заголовок не добавляется. */
  label?: string;
}

type MessageFormat = "html" | "markdown";

const LEVEL_LABELS: Record<LogLevel, string> = {
  custom: "CUSTOM",
  message: "💬 MESSAGE",
  info: "ℹ️ INFO",
  warning: "⚠️ WARNING",
  error: "❌ ERROR",
  fatal: "☠️ FATAL",
};


/* ── Общие хелперы ──────────────────────────────────────────────── */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function formatLabel(label: string, format: MessageFormat): string {
  return format === "markdown" ? `**${label}:**` : `<b>${label}:</b>`;
}

function formatMetaLines(
  meta: FormatMessageOptions = {},
  format: MessageFormat = "html"
): string[] {
  const lines: string[] = [];
  const escapeValue = format === "markdown" ? escapeMarkdown : escapeHtml;

  if (meta.service) {
    lines.push(`${formatLabel("Service", format)} ${escapeValue(meta.service)}`);
  }
  if (meta.env) {
    lines.push(`${formatLabel("Environment", format)} ${escapeValue(meta.env)}`);
  }
  if (meta.hostname) {
    lines.push(`${formatLabel("Host", format)} ${escapeValue(meta.hostname)}`);
  }
  if (meta.timeStamp) {
    const time = new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(new Date());
    lines.push(`${formatLabel("Timestamp", format)} ${time}`);
  }
  return lines;
}


/* ── Обычные сообщения (parse_mode: HTML) ───────────────────────── */

function formatMeta(
  meta: FormatMessageOptions = {},
  format: MessageFormat = "html"
): string {
  const lines = formatMetaLines(meta, format);
  if (lines.length === 0) return "";
  return `${lines.join("\n")}\n\n`;
}

function normalizeInput(input: string | Error): { message: string; stack?: string } {
  if (isErrorObject(input)) {
    return {
      message: input.message || input.name,
      stack: input.stack,
    };
  }

  return { message: input };
}

/**
 * Собирает текст обычного лога для Telegram (parse_mode: HTML).
 * Структура: заголовок → meta → тело → stack (для error/fatal).
 */
export function formatMessage(
  levelName: LogLevel,
  input: string | Error,
  options: FormatMessageOptions = {}
): string {
  const { message, stack } = normalizeInput(input);

  const countSuffix =
    options.count && options.count > 1
      ? ` (${options.count} times in the last 60 seconds)`
      : "";

  const label = escapeHtml(options.label ?? LEVEL_LABELS[levelName]);
  const header = `<b>${label}${countSuffix}</b>`;
  const meta = formatMeta(options);
  const body = escapeHtml(message);

  let text = `${header}\n\n${meta}${body}`;

  if (stack && (levelName === "error" || levelName === "fatal")) {
    text += `\n\n<pre>${escapeHtml(stack)}</pre>`;
  }

  return text;
}


/* ── Custom / rich сообщения ────────────────────────────────────── */

/** Заголовок custom/rich-сообщения (только если label передан). */
function formatRichHeader(label: string, format: MessageFormat): string {
  if (format === "markdown") {
    return `**${escapeMarkdown(label)}**\n\n`;
  }

  return `<p><b>${escapeHtml(label)}</b></p><p>&nbsp;</p>`;
}

function formatRichMeta(
  meta: FormatMessageOptions = {},
  format: MessageFormat = "html"
): string {
  const lines = formatMetaLines(meta, format);
  if (lines.length === 0) return "";

  if (format === "markdown") {
    return `${lines.join("  \n")}\n\n`;
  }

  return `${lines.map((line) => `<p>${line}</p>`).join("")}<p>&nbsp;</p>`;
}

/** Обычный текст → HTML-параграфы для rich_message. */
function formatTelegramRichHtml(rawText: string): string {
  if (!rawText) return "";

  const lines = rawText.split(/\r?\n/);

  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      return "<p>&nbsp;</p>";
    }

    return `<p>${escapeHtml(trimmed)}</p>`;
  });

  return formattedLines.join("");
}

/** Готовый HTML → безопасный для Telegram rich_message (теги сохраняются). */
function prepareTelegramRichHtml(htmlText: string): string {
  if (!htmlText) return "";

  let processed = htmlText.trim();
  processed = processed.replace(/^\s*[\r\n]/gm, "<p>&nbsp;</p>");
  processed = processed.replace(/[\r\n]+/g, "");

  return processed;
}

function hasHtmlMarkup(text: string): boolean {
  return /<\/?[a-z][\s\S]*?>|&[a-z#0-9]+;/i.test(text);
}

function hasMarkdownBlockMarkup(text: string): boolean {
  return [
    /^#{1,6}\s+\S/m,
    /^>\s+\S/m,
    /^[-*+]\s+\S/m,
    /^\d+\.\s+\S/m,
    /^```/m,
    /^\[\^[^\]]+\]:\s+\S/m,
    /^\s*\|.+\|\s*$/m,
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/m,
  ].some((pattern) => pattern.test(text));
}

function hasMarkdownInlineMarkup(text: string): boolean {
  return /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^)]+\))/.test(text);
}

function detectMessageFormat(text: string): MessageFormat {
  if (hasMarkdownBlockMarkup(text)) {
    return "markdown";
  }

  if (!hasHtmlMarkup(text) && hasMarkdownInlineMarkup(text)) {
    return "markdown";
  }

  return "html";
}

/**
 * Публичный вход для custom/rich: собирает InputRichMessage (html | markdown).
 * Структура: заголовок (опционально) → meta → тело.
 */
export function formatRichMessage(
  rawText: string,
  options: CustomMessageMode | FormatRichMessageOptions = {}
): InputRichMessage {
  const normalizedOptions =
    typeof options === "string" ? { mode: options } : options;
  const mode = normalizedOptions.mode ?? detectMessageFormat(rawText);
  const header = normalizedOptions.label
    ? formatRichHeader(normalizedOptions.label, mode)
    : "";
  const meta = formatRichMeta(normalizedOptions.meta, mode);

  if (mode === "markdown") {
    return { markdown: `${header}${meta}${rawText.trim()}` };
  }

  const body = hasHtmlMarkup(rawText)
    ? prepareTelegramRichHtml(rawText)
    : formatTelegramRichHtml(rawText);

  return {
    html: `${header}${meta}${body}`,
  };
}
