import type { InputRichMessage } from "./telegram-bot-types.js";

import { isErrorObject, IFormatMessageOptions } from "./types/notyfygram.js";
import type { LogLevel, INotifygramOptions } from "./types/notyfygram.js";
const LEVEL_LABELS: Record<LogLevel, string> = {
  custom: "CUSTOM",
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
function formatMeta(context: INotifygramOptions): string {
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
  options: IFormatMessageOptions = {}
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

/**
 * Преобразует обычный текст в валидную HTML-строку для поля rich_message в Telegram.
 * @param rawText Сырой текст с обычными переносами строк \n
 * @returns Строка, готовая для вставки в JSON-поле "html"
 */
function formatTelegramRichHtml(rawText: string): string {
  if (!rawText) return "";

  // 1. Разбиваем текст на абзацы по переносам строк.
  // Используем регулярку, которая захватывает как одиночные, так и множественные \n
  const lines = rawText.split(/\r?\n/);

  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    
    // Если строка пустая (был двойной перенос \n\n), превращаем её в гарантированный отступ
    if (trimmed === "") {
      return "<p>&nbsp;</p>";
    }
    
    // Экранируем кавычки, чтобы они не ломали JSON, если внутри текста будут атрибуты
    // (Хотя для обычного текста это просто защита)
    const safeText = trimmed
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'");

    // Орачиваем обычный текст в тег параграфа
    return `<p>${safeText}</p>`;
  });

  // Соединяем всё обратно в одну сплошную строку
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

type MarkupType = 'HTML' | 'Markdown' | 'Plain';

/**
 * Определяет, в каком формате написан текст: HTML, Markdown или обычный текст.
 */
function detectMarkupType(text: string): MarkupType {
  if (!text) return 'Plain';

  // 1. Строгие маркеры Markdown, которые НИКОГДА не используются в чистом HTML:
  const strictMarkdownRegex = /(^\s*\|.*?\|)|(\[\^.*?\])|(^\s*#{1,6}\s+\S+)|(\[.*?\]\(.*?\))|(^\s*[\*\-]\s+\S+)/m;

  // 2. Стандартный HTML (ищет теги)
  const htmlRegex = /<\/?[a-z][\s\S]*?>|&[a-z#0-9]+;/i;

  // 3. Мягкий Markdown (жирный/курсив через звездочки и подчеркивания), если нет HTML-тегов
  const softMarkdownRegex = /([\*_`~].*?[\*_`~])/;

  // СНАЧАЛА проверяем на строгий Markdown (как в вашем случае с таблицей и сноской)
  if (strictMarkdownRegex.test(text)) {
    return 'Markdown';
  }

  // Если строгих маркеров Markdown нет, проверяем на чистый HTML
  if (htmlRegex.test(text)) {
    return 'HTML';
  }

  // Если тегов нет, но есть звездочки/курсив — это Markdown
  if (softMarkdownRegex.test(text)) {
    return 'Markdown';
  }

  return 'Plain';
}

export function processMessageForTelegram(rawText: string): InputRichMessage {
  const format = detectMarkupType(rawText);
  
  let finalHtml = "";

  if (format === 'HTML') {
    // Если это HTML, используем функцию очистки для готового HTML
    finalHtml = prepareTelegramRichHtml(rawText); 
  } else if (format === 'Markdown') {
    // Если это Markdown, вы можете либо отправить его как есть в поле "markdown",
    // либо конвертировать в HTML на вашей стороне перед отправкой.
    return { markdown: rawText.trim() } ;
  } else {
    // Если это обычный текст, используем первую функцию, которая расставит <p> и пробелы
    finalHtml = formatTelegramRichHtml(rawText);
  }

  return { html: finalHtml } ;
}
