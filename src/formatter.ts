import type { InputRichMessage } from "./types/telegram-bot.js";

import { isErrorObject } from "./types/notyfygram.js";
import type { LogLevel, IFormatMessageOptions } from "./types/notyfygram.js";

export type CustomMessageMode = "html" | "markdown";

export interface ProcessRichMessageOptions {
  mode?: CustomMessageMode;
  meta?: IFormatMessageOptions;
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


/**
 * INFO:
 * Обработка дефолтных сообщений.
 */

/** Экранирует символы &, < и > для безопасной вставки текста в HTML (parse_mode Telegram). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Экранирует служебные символы Markdown в значениях метаданных. */
function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function formatLabel(label: string, format: MessageFormat): string {
  return format === "markdown" ? `**${label}:**` : `<b>${label}:</b>`;
}

/** Форматирует метаданные сообщения.*/
function formatMetaLines(
  meta: IFormatMessageOptions = {},
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

/** Форматирует метаданные сообщения.*/
function formatMeta(
  meta: IFormatMessageOptions = {},
  format: MessageFormat = "html"
): string {
  const lines = formatMetaLines(meta, format);
  if (lines.length === 0) return "";
  return `${lines.join("\n")}\n\n`;
}

/** Форматирует метаданные для rich_message, где обычные \n могут схлопываться. */
function formatRichMeta(
  meta: IFormatMessageOptions = {},
  format: MessageFormat = "html"
): string {
  const lines = formatMetaLines(meta, format);
  if (lines.length === 0) return "";

  if (format === "markdown") {
    return `${lines.join("  \n")}\n\n`;
  }

  return `${lines.map((line) => `<p>${line}</p>`).join("")}<p>&nbsp;</p>`;
}

/** Нормализует входные данные в строку и стек ошибки. */
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
 * Собирает текст лога для отправки в Telegram (parse_mode: HTML).
 *
 * Структура результата:
 * 1. Заголовок — уровень лога (MESSAGE, INFO, …) и, при дедупликации, счётчик повторов.
 * 2. Метаданные — service, env, hostname (если переданы в options).
 * 3. Тело — текст сообщения или Error.message с экранированием HTML.
 * 4. Стек — для error/fatal добавляется stack trace в блоке <pre>.
 */
export function formatMessage(
  levelName: LogLevel,
  input: string | Error,
  options: IFormatMessageOptions = {}
): string {
  const { message, stack } = normalizeInput(input);

  // Суффикс при агрегации одинаковых сообщений за последние 60 секунд
  const countSuffix =
    options.count && options.count > 1
      ? ` (${options.count} times in the last 60 seconds)`
      : "";

  const label = escapeHtml(options.label ?? LEVEL_LABELS[levelName]);
  const header = `<b>${label}${countSuffix}</b>`;
  const meta = formatMeta(options);
  const body = escapeHtml(message);

  let text = `${header}\n\n${meta}${body}`;

  // Стек показываем только для критичных уровней, чтобы не раздувать info/warning
  if (stack && (levelName === "error" || levelName === "fatal")) {
    text += `\n\n<pre>${escapeHtml(stack)}</pre>`;
  }

  return text;
}

/**
 * INFO:
 * Обработка кастомных сообщений.
 */

/**
 * Преобразует обычный текст в валидную HTML-строку для поля rich_message в Telegram.
 * @param rawText Сырой текст с обычными переносами строк \n
 * @returns Строка, готовая для вставки в JSON-поле "html"
 */
function formatTelegramRichHtml(rawText: string): string {
  if (!rawText) return "";

  const lines = rawText.split(/\r?\n/);

  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();

    // Если строка пустая (был двойной перенос \n\n), превращаем её в гарантированный отступ
    if (trimmed === "") {
      return "<p>&nbsp;</p>";
    }

    return `<p>${escapeHtml(trimmed)}</p>`;
  });

  return formattedLines.join("");
}

/**
 * Готовит существующую HTML-строку для отправки в Telegram rich_message.
 * Сохраняет все теги и кавычки, корректно обрабатывая только пустые переносы.
 */
function prepareTelegramRichHtml(htmlText: string): string {
  if (!htmlText) return "";

  // 1. Очищаем от лишних пробелов по краям
  let processed = htmlText.trim();

  // 2. Находим пустые строки между тегами и заменяем их на пустые параграфы с неразрывным пробелом,
  // чтобы Telegram их не схлопывал.
  processed = processed.replace(/^\s*[\r\n]/gm, "<p>&nbsp;</p>");

  // 3. Убираем физические переносы строк внутри самого HTML, так как блоки (p, pre, ul) 
  // сами перенесут строку, а лишние \n могут превратиться в ненужные пробелы.
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

export function processMessageForTelegram(
  rawText: string,
  options: CustomMessageMode | ProcessRichMessageOptions = {}
): InputRichMessage {
  const normalizedOptions =
    typeof options === "string" ? { mode: options } : options;
  const mode = normalizedOptions.mode ?? detectMessageFormat(rawText);
  const meta = formatRichMeta(normalizedOptions.meta, mode);

  if (mode === "markdown") {
    return { markdown: `${meta}${rawText.trim()}` };
  }

  const body = hasHtmlMarkup(rawText)
    ? prepareTelegramRichHtml(rawText)
    : formatTelegramRichHtml(rawText);

  return {
    html: `${meta}${body}`,
  };
}
