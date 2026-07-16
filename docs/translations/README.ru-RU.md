<div align="center"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/notifygramlogo.webp" alt="notifygram"></div>

<div align="center">
	🇺🇸 <a href="README.md">English</a> | 🇷🇺 <a href="docs/translations/README.ru-RU.md">Русский</a>
</div>

# Notifygram

> Лёгкая Node.js-библиотека для уведомлений приложения в Telegram.
> Без polling и webhook — только исходящая отправка. Подключили токен и `chatId` — и вызываете `notifygram.info(...)`.

## Возможности

- **Типы уведомлений** — `custom`, `message`, `info`, `warning`, `error`, `fatal`
- **Метаданные** — сервис, окружение, хост, timestamp; для `error` / `fatal` — stack trace
- **Очередь отправки** — не чаще одного сообщения в секунду (лимиты Telegram)
- **Дедупликация ошибок** — повторы `error` / `fatal` за 60 секунд объединяются
- **Rich-сообщения** — `custom()` с HTML или Markdown
- **Корректное завершение** — `flush()` дожидается отправки перед выходом

## Установка

Требуется Node.js 18+.

```bash
npm install notifygram
```

## Быстрый старт

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

Нужны токен бота и ID чата — как их получить, см. [Настройка](#настройка). Если ID неизвестен: `npx notifygram init`.

## Настройка

1. Создайте бота через [@BotFather](https://t.me/BotFather) и получите `BOT_TOKEN`.
2. Если уведомления идут в канал или группу — добавьте бота и назначьте администратором.

**Если знаете ID канала (чата / группы)** — передайте `token` и `chatId` в коде (как в [Быстром старте](#быстрый-старт)) или в `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=-1001234567890
```

**Если ID неизвестен** — выполните в консоли и следуйте подсказкам:

```bash
npx notifygram init
```

- Если в `.env` нет `TELEGRAM_BOT_TOKEN`, CLI попросит ввести его.
- Отправьте любое сообщение в канал (чат / группу).
- CLI определит канал и сохранит `TELEGRAM_CHAT_ID` и `TELEGRAM_BOT_TOKEN` в `.env`.

## Пример использования

```ts
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  meta: {
    service: "Payments",
    env: "development",
    timeStamp: false,
  },
});

await notifygram.message("Deploy started");
await notifygram.info("Server started");
await notifygram.warning("Disk usage above 80%");
await notifygram.error(new Error("DB connection failed"));
await notifygram.fatal(new Error("Unrecoverable error"));
```

Если `token` и `chatId` не переданы, используются `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` из окружения или `.env`:

```ts
const notifygram = createNotifygram({
  meta: {
    service: "Payments",
  },
});
```

> [!WARNING]
> Не используйте библиотеку на фронтенде: токен бота окажется доступен в браузере.

Rich-сообщения (`custom`), `flush()`, дедупликация и фильтр `minLevel` — в [Дополнительно](#дополнительно).

## API

### `createNotifygram(options?)`

| Параметр | Тип | Описание |
|----------|-----|----------|
| `token` | `string` | Токен Telegram-бота. Если не передан, используется `TELEGRAM_BOT_TOKEN`. |
| `chatId` | `number \| string` | ID чата или канала. Если не передан, используется `TELEGRAM_CHAT_ID`. |
| `meta.service` | `string` | Имя сервиса, отображаемое в сообщениях. |
| `meta.env` | `string` | Имя окружения. По умолчанию используется `NODE_ENV`. |
| `meta.hostname` | `boolean` | Показывать имя хоста. По умолчанию `true`. |
| `meta.timeStamp` | `boolean` | Показывать timestamp. По умолчанию `true`. |
| `showMeta` | `boolean` | Показывать блок метаданных. По умолчанию `true`. |
| `minLevel` | `LogLevel` | Минимальный уровень логирования; сообщения ниже порога не отправляются. |
| `labels` | `NotifygramLabels` | Пользовательские заголовки сообщений по уровню логирования. |

### Методы

Все методы возвращают `Promise<void>`. Ошибки отправки в Telegram не пробрасываются в приложение: Notifygram пишет их в `stderr`, чтобы логирование не роняло основной процесс. Ошибки конфигурации могут быть выброшены при создании экземпляра.

- `notifygram.message(message: string | Error)`
- `notifygram.info(message: string | Error)`
- `notifygram.warning(message: string | Error)`
- `notifygram.error(message: string | Error)`
- `notifygram.fatal(message: string | Error)`
- `notifygram.custom(message: string, options?: { mode?: "html" | "markdown" })`
- `notifygram.flush()` — дождаться отправки всех сообщений в Telegram

### Экспорты

- `createNotifygram(options?)` — фабрика экземпляра `Notifygram`.
- `Notifygram` — класс логгера.
- `ConfigError`, `TelegramApiError`, `TelegramNetworkError` — ошибки, полезные для обработки сбоев конфигурации и Telegram API.
- `LogLevel`, `NotifygramOptions`, `NotifygramMetaOptions`, `NotifygramLabels`, `NotifygramMessageOptions`, `NotifygramCustomMessageOptions`, `CustomMessageMode` — публичные типы библиотеки.

## Дополнительно

<details>
<summary>Приоритет настроек, переменные окружения, <code>custom</code>, <code>flush</code>, дедупликация, <code>minLevel</code></summary>

### Приоритет настроек

Сверху вниз — что важнее:

1. Параметры в коде — `createNotifygram({ token, chatId })`
2. Переменные окружения — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
3. Файл `.env` в корне проекта

> [!TIP]
> Если `token` и `chatId` указаны в коде, они используются всегда, даже если в `.env` лежат другие значения.

### Переменные окружения

| Переменная | Обязательна | Описание |
|------------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Да, если `token` не передан | Токен бота |
| `TELEGRAM_CHAT_ID` | Да, если `chatId` не передан | ID целевого канала |
| `SERVICE_NAME` | Нет | Сервис по умолчанию |
| `NODE_ENV` | Нет | Окружение по умолчанию |

### Кастомные сообщения

`custom()` принимает строку и отправляет её как rich-сообщение через Telegram API `sendRichMessage`. Разметка (HTML или Markdown) определяется автоматически или задаётся явно через `mode`.

```ts
await notifygram.custom("Manual notification");

await notifygram.custom(`
  <h2>Payment failed</h2>
  <p>User payment was declined</p>
`, {
  mode: "html",
});
```

<details>
  <summary>Пример</summary>

  ```ts
const notifygramOrder = createNotifygram({
  meta : {
    service: "Online store",
    hostname: false,
  },
  labels: {
    custom: "Order",
  },
  token: "8438725980:AAH5BjEvpRMVOXVgne4YP1uau6-0TR3GKNE",
  chatId: -1003962530412,
});


notifygramOrder.custom(`
<h2>You have a new order 💰.</h2>
<details>
  <summary>Order details</summary>
  <table bordered striped>
    <tr><th>Item</th><th>Quantity</th><th>Total cost</th></tr>
    <tr>
      <td>Item 1</td>
      <td>2</td>
      <td>100 USD</td>
    </tr>
    <tr>
      <td>Item 2</td>
      <td>1</td>
      <td>50 USD</td>
    </tr>
  </table>
</details>
`);
```

<div align="left" width="100"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/message-1.webp" alt="custom-message"></div>
</details>


### Когда вызывать `flush()`

`flush()` дожидается, пока все сообщения уйдут в Telegram.

Вызывайте его в конце короткого скрипта — иначе процесс может завершиться раньше, чем сообщения отправятся:

```ts
await notifygram.info("Backup done");
await notifygram.error(new Error("Disk full"));

await notifygram.flush(); // подождать отправку, потом можно выходить
```

На обычном сервере вызывать не нужно: сообщения уходят сами в фоне. Там `flush()` полезен только при остановке приложения.

### Дедупликация

Применяется только к `error()` и `fatal()`. Каждый вызов `message()`, `info()` и `warning()` отправляется отдельно.

Одинаковые сообщения в течение 60 секунд группируются; после 2 секунд тишины (или вызова `flush()`) отправляется одно сообщение, например: `ERROR (3 times in the last 60 seconds)`.

### Фильтр `minLevel`

Минимальный уровень важности, с которого сообщения отправляются в Telegram. Всё «ниже» порога молча отбрасывается.

Порядок уровней: `custom` → `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | Что отправляется |
|------------|------------------|
| `"custom"` (по умолчанию) | custom, message, info, warning, error, fatal |
| `"message"` | message, info, warning, error, fatal |
| `"info"` | info, warning, error, fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | только fatal |

```ts
const notifygram = createNotifygram({
  meta: {
    service: "payments",
  },
  minLevel: "error", // в production — без info и warning
});

await notifygram.info("Server started"); // не отправится
await notifygram.error("DB failed");     // отправится
```

</details>

## Лицензия

[ISC](./LICENSE)
