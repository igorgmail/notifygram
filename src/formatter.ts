import type { FormatContext, FormatOptions, LogLevel } from "./types.js";
import { isErrorObject } from "./types.js";

const LEVEL_LABELS: Record<LogLevel, string> = {
  message: "MESSAGE",
  info: "INFO",
  warning: "WARNING",
  error: "ERROR",
  fatal: "FATAL",
};

/** Экранирует символы &, < и > для безопасной вставки текста в HTML (parse_mode Telegram). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Форматирует метаданные сообщения.*/
function formatMeta(context: FormatContext): string {
  const lines: string[] = [];

  if (context.service) {
    lines.push(`<b>Service:</b> ${escapeHtml(context.service)}`);
  }
  if (context.env) {
    lines.push(`<b>Environment:</b> ${escapeHtml(context.env)}`);
  }
  if (context.hostname) {
    lines.push(`<b>Host:</b> ${escapeHtml(context.hostname)}`);
  }

  if (lines.length === 0) {
    return "";
  }

  return `${lines.join("\n")}\n\n`;
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
  level: LogLevel,
  input: string | Error,
  options: FormatOptions = {}
): string {
  const { message, stack } = normalizeInput(input);

  // Суффикс при агрегации одинаковых сообщений за последние 60 секунд
  const countSuffix =
    options.count && options.count > 1
      ? ` (${options.count} times in the last 60 seconds)`
      : "";

  const header = `<b>${LEVEL_LABELS[level]}${countSuffix}</b>`;
  const meta = formatMeta(options);
  const body = escapeHtml(message);

  let text = `${header}\n\n${meta}${body}`;

  // Стек показываем только для критичных уровней, чтобы не раздувать info/warning
  if (stack && (level === "error" || level === "fatal")) {
    text += `\n\n<pre>${escapeHtml(stack)}</pre>`;
  }

  return text;
}
