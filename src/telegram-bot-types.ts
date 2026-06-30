/**
 * Telegram Bot API — TypeScript Types
 * Основано на Bot API 10.1 (июнь 2026)
 * https://core.telegram.org/bots/api
 *
 * Архитектура:
 *   - TelegramApiResponse<T>       — универсальная обёртка ответа
 *   - BaseSendParams               — общие параметры для всех send-методов
 *   - SendMessageParams            — специфичные параметры sendMessage
 *   - InputRichMessage             — входные данные для sendRichMessage (html | markdown)
 *   - SendRichMessageParams        — параметры sendRichMessage
 */

// ─────────────────────────────────────────────
// Вспомогательные типы
// ─────────────────────────────────────────────

/** chat_id может быть числом (user/group id) или строкой (@username канала) */
export type ChatId = number | string;

/** Режим форматирования текста */
export type ParseMode = 'MarkdownV2' | 'HTML' | 'Markdown';

/** Клавиатуры / разметка */
export type ReplyMarkup =
  | InlineKeyboardMarkup
  | ReplyKeyboardMarkup
  | ReplyKeyboardRemove
  | ForceReply;

// ─────────────────────────────────────────────
// Универсальная обёртка ответа API
// ─────────────────────────────────────────────

/**
 * Все методы Telegram Bot API возвращают JSON-объект с полем ok.
 * Если ok === true — результат лежит в result.
 * Если ok === false — описание ошибки в description, код в error_code.
 *
 * T — тип поля result (Message, boolean, и т.д.)
 */
export interface TelegramApiResponse<T> {
  /** true при успешном запросе */
  ok: boolean;
  /** Результат запроса (присутствует только при ok === true) */
  result?: T;
  /** Описание ошибки (присутствует при ok === false) */
  description?: string;
  /** Код ошибки (присутствует при ok === false) */
  error_code?: number;
  /** Дополнительные параметры для автоматической обработки ошибок */
  parameters?: ResponseParameters;
}

/** Параметры для автоматической обработки некоторых ошибок API */
export interface ResponseParameters {
  /** Если превышен лимит запросов — сколько секунд ждать */
  retry_after?: number;
  /** Если бот перенесён в другой дата-центр — новый ID */
  migrate_to_chat_id?: number;
}

// ─────────────────────────────────────────────
// Общие параметры для всех send-методов
// ─────────────────────────────────────────────

/**
 * Параметры, которые присутствуют во всех методах отправки:
 * sendMessage, sendRichMessage, sendPhoto, sendVideo и т.д.
 */
export interface BaseSendParams {
  /** ID чата или @username канала — ОБЯЗАТЕЛЬНЫЙ */
  chat_id: ChatId;

  /** ID бизнес-соединения (для работы через Business API) */
  business_connection_id?: string;

  /**
   * ID топика форума/темы.
   * Используется в супергруппах-форумах и в приватных чатах с топиками.
   */
  message_thread_id?: number;

  /** Параметры для ответа на сообщение (reply) */
  reply_parameters?: ReplyParameters;

  /** Клавиатура / inline-кнопки / force-reply */
  reply_markup?: ReplyMarkup;

  /** Отправить без уведомления (silently) */
  disable_notification?: boolean;

  /** Защита от пересылки и сохранения */
  protect_content?: boolean;

  /** ID эффекта сообщения */
  message_effect_id?: string;
}

// ─────────────────────────────────────────────
// Параметры конкретных методов
// ─────────────────────────────────────────────

/** Параметры метода sendMessage */
export interface SendMessageParams extends BaseSendParams {
  /** Текст сообщения (1–4096 символов) — ОБЯЗАТЕЛЬНЫЙ */
  text: string;

  /** Режим форматирования (MarkdownV2, HTML, Markdown) */
  parse_mode?: ParseMode;

  /** Список entities (альтернатива parse_mode) */
  entities?: MessageEntity[];

  /** Настройки предпросмотра ссылок */
  link_preview_options?: LinkPreviewOptions;
}

/** Параметры метода sendRichMessage (Bot API 10.1+) */
export interface SendRichMessageParams extends BaseSendParams {
  /** Rich-контент сообщения — ОБЯЗАТЕЛЬНЫЙ */
  rich_message: InputRichMessage;
}

/** Параметры метода sendMessageDraft (стриминг черновика) */
export interface SendMessageDraftParams {
  chat_id: ChatId;
  draft_id: string;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  business_connection_id?: string;
  message_thread_id?: number;
}

/** Параметры метода sendRichMessageDraft (стриминг rich-черновика) */
export interface SendRichMessageDraftParams {
  chat_id: ChatId;
  draft_id: string;
  rich_message: InputRichMessage;
  business_connection_id?: string;
  message_thread_id?: number;
}

// ─────────────────────────────────────────────
// Rich Message (Bot API 10.1)
// ─────────────────────────────────────────────

/**
 * Описывает rich-сообщение для отправки.
 * https://core.telegram.org/bots/api#inputrichmessage
 *
 * ВАЖНО: должно быть использовано ровно одно из полей — html или markdown.
 * TypeScript-реализация через discriminated union (XOR) гарантирует это статически.
 *
 * Поля:
 *   html                  — контент в HTML-разметке
 *   markdown              — контент в Markdown-разметке
 *   is_rtl                — true для отображения текста справа налево
 *   skip_entity_detection — true для отключения автодетекции сущностей
 *                           (URL, email, @упоминания, хэштеги, команды, телефоны)
 */

/** Вариант InputRichMessage с HTML-форматированием */
export interface InputRichMessageHtml {
  /** HTML-контент rich-сообщения */
  html: string;
  markdown?: never;
  /** Передайте true для отображения текста справа налево */
  is_rtl?: boolean;
  /**
   * Передайте true чтобы отключить автоматическое определение сущностей
   * (URL, email, упоминания, хэштеги, команды, телефоны и т.д.)
   */
  skip_entity_detection?: boolean;
}

/** Вариант InputRichMessage с Markdown-форматированием */
export interface InputRichMessageMarkdown {
  html?: never;
  /** Markdown-контент rich-сообщения */
  markdown: string;
  /** Передайте true для отображения текста справа налево */
  is_rtl?: boolean;
  /**
   * Передайте true чтобы отключить автоматическое определение сущностей
   * (URL, email, упоминания, хэштеги, команды, телефоны и т.д.)
   */
  skip_entity_detection?: boolean;
}

/**
 * Тип для параметра rich_message в sendRichMessage и sendRichMessageDraft.
 * Ровно одно из полей (html или markdown) должно быть передано — API требует это.
 *
 * Примеры:
 *   { html: '<b>Жирный текст</b>' }
 *   { markdown: '**Жирный текст**', is_rtl: false }
 */
export type InputRichMessage = InputRichMessageHtml | InputRichMessageMarkdown;

/**
 * Объект RichMessage — то, что Telegram возвращает в поле Message.rich_message.
 * Это уже обработанное представление на стороне сервера.
 *
 * Документация описывает множество классов (RichBlock*, RichText*), которые
 * используются во внутреннем представлении, но их точная JSON-схема
 * для ответа API не специфицирована в Bot API docs (только для MTProto).
 *
 * Используем Record<string, unknown> как безопасный fallback.
 * Если вам нужна более детальная типизация — опишите её на основе
 * реальных ответов API (через Postman / console.log).
 */
export type RichMessage = Record<string, unknown>;

// ─────────────────────────────────────────────
// Объект Message (ответ на send-методы)
// ─────────────────────────────────────────────

/**
 * Объект сообщения, который Telegram возвращает при успешной отправке.
 * sendMessage и sendRichMessage оба возвращают TelegramApiResponse<Message>.
 */
export interface Message {
  message_id: number;
  message_thread_id?: number;
  from?: User;
  sender_chat?: Chat;
  sender_boost_count?: number;
  sender_tag?: string;
  date: number;
  chat: Chat;
  forward_origin?: MessageOrigin;
  is_topic_message?: boolean;
  is_automatic_forward?: boolean;
  reply_to_message?: Message;
  external_reply?: ExternalReplyInfo;
  quote?: TextQuote;
  reply_to_story?: Story;
  via_bot?: User;
  edit_date?: number;
  has_protected_content?: boolean;
  is_from_offline?: boolean;
  media_group_id?: string;
  author_signature?: string;

  /** Присутствует для обычных текстовых сообщений (sendMessage) */
  text?: string;
  entities?: MessageEntity[];

  /** Присутствует для rich-сообщений (sendRichMessage) — Bot API 10.1+ */
  rich_message?: RichMessage;

  /** Медиа-поля */
  animation?: Animation;
  audio?: Audio;
  document?: Document;
  photo?: PhotoSize[];
  video?: Video;
  voice?: Voice;

  /** Клавиатура */
  reply_markup?: InlineKeyboardMarkup;

  /** Настройки ссылок */
  link_preview_options?: LinkPreviewOptions;

  /** Guest mode (Bot API 10.0+) */
  guest_bot_caller_user?: User;
  guest_bot_caller_chat?: Chat;
  guest_query_id?: string;

  /** Managed bots (Bot API 9.6+) */
  managed_bot_created?: ManagedBotCreated;
}

// ─────────────────────────────────────────────
// Вспомогательные интерфейсы
// ─────────────────────────────────────────────

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  can_manage_bots?: boolean;
  supports_guest_queries?: boolean;
  supports_join_request_queries?: boolean;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
}

export interface MessageEntity {
  type:
    | 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email'
    | 'phone_number' | 'bold' | 'italic' | 'underline' | 'strikethrough'
    | 'spoiler' | 'code' | 'pre' | 'text_link' | 'text_mention'
    | 'custom_emoji' | 'blockquote' | 'expandable_blockquote';
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
  custom_emoji_id?: string;
}

export interface LinkPreviewOptions {
  is_disabled?: boolean;
  url?: string;
  prefer_small_media?: boolean;
  prefer_large_media?: boolean;
  show_above_text?: boolean;
}

export interface ReplyParameters {
  message_id: number;
  chat_id?: ChatId;
  allow_sending_without_reply?: boolean;
  quote?: string;
  quote_parse_mode?: ParseMode;
  quote_entities?: MessageEntity[];
  quote_position?: number;
  poll_option_id?: number;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: WebAppInfo;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  pay?: boolean;
}

export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
  is_persistent?: boolean;
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  web_app?: WebAppInfo;
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export interface ForceReply {
  force_reply: true;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface WebAppInfo { url: string }

// Заглушки для сложных типов (расширьте при необходимости)
export interface MessageOrigin   { type: string }
export interface ExternalReplyInfo { origin: MessageOrigin }
export interface TextQuote       { text: string; entities?: MessageEntity[]; position: number }
export interface Story           { chat: Chat; id: number }
export interface PhotoSize       { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }
export interface Animation       { file_id: string; file_unique_id: string; width: number; height: number; duration: number }
export interface Audio           { file_id: string; file_unique_id: string; duration: number }
export interface Document        { file_id: string; file_unique_id: string }
export interface Video           { file_id: string; file_unique_id: string; width: number; height: number; duration: number }
export interface Voice           { file_id: string; file_unique_id: string; duration: number }
export interface ManagedBotCreated { bot: User }

// ─────────────────────────────────────────────
// Псевдонимы ответов — удобно для использования
// ─────────────────────────────────────────────

/** Ответ на sendMessage */
export type SendMessageResponse = TelegramApiResponse<Message>;

/** Ответ на sendRichMessage */
export type SendRichMessageResponse = TelegramApiResponse<Message>;

/** Ответ на sendMessageDraft */
export type SendMessageDraftResponse = TelegramApiResponse<true>;

/** Ответ на sendRichMessageDraft */
export type SendRichMessageDraftResponse = TelegramApiResponse<true>;

// ─────────────────────────────────────────────
// Примеры использования (можно удалить)
// ─────────────────────────────────────────────

async function exampleUsage(token: string) {
  // sendMessage
  const msgBody: SendMessageParams = {
    chat_id: 123456789,
    text: 'Привет, *мир*!',
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [[{ text: 'OK', callback_data: 'ok' }]],
    },
  };

  const msgRes: SendMessageResponse = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msgBody) }
  ).then(r => r.json());

  if (msgRes.ok && msgRes.result) {
    console.log('Отправлено сообщение ID:', msgRes.result.message_id);
  }

  // sendRichMessage — вариант HTML
  const richBodyHtml: SendRichMessageParams = {
    chat_id: 123456789,
    rich_message: {
      html: '<h1>Заголовок</h1><p><b>Важный текст</b></p><ul><li>Пункт 1</li><li>Пункт 2</li></ul>',
      is_rtl: false,
      skip_entity_detection: false,
    },
  };

  // sendRichMessage — вариант Markdown
  const richBodyMd: SendRichMessageParams = {
    chat_id: 123456789,
    rich_message: {
      markdown: '# Заголовок\n\n**Важный текст**\n\n- Пункт 1\n- Пункт 2',
    },
  };

  // Это вызовет ошибку TypeScript — нельзя передать оба поля одновременно:
  // const wrong: InputRichMessage = { html: '...', markdown: '...' }; // ❌

  const richRes: SendRichMessageResponse = await fetch(
    `https://api.telegram.org/bot${token}/sendRichMessage`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(richBodyHtml) }
  ).then(r => r.json());

  if (richRes.ok && richRes.result) {
    console.log('Rich message отправлен, ID:', richRes.result.message_id);
    console.log('rich_message в ответе:', richRes.result.rich_message);
  }
}
