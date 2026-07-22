<div align="center"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/notifygramlogo.webp" alt="notifygram"></div>

<div align="center">
	🇺🇸 <a href="README.md">English</a> | 🇷🇺 <a href="docs/translations/README.ru-RU.md">Русский</a>
</div>

# Notifygram

> Лёгкая Node.js-библиотека для уведомлений приложения в Telegram.
> Без polling и webhook — только исходящая отправка.
> Никаких зависимостей, ничего лишнего.
> Подключили токен и `chatId` — и вызываете `notifygram.info(...)`.

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

**Если знаете ID канала (чата / группы)** — передайте `token` и `chatId` в коде (как в [Быстром старте](#быстрый-старт)) или загрузите их в окружение процесса (например `node --env-file=.env`, dotenv или переменные хоста):

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

Если `token` и `chatId` не переданы, используются `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` из окружения (`process.env` в Node / SSR):

```ts
const notifygram = createNotifygram({
  meta: {
    service: "Payments",
  },
});
```

Во Vite / Vue / React передайте значения из env бандлера явно или укажите свой источник `env`:

```ts
const notifygram = createNotifygram({
  token: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
  chatId: import.meta.env.VITE_TELEGRAM_CHAT_ID,
});

// или сопоставьте ключи сами:
const notifygramFromEnv = createNotifygram({
  env: {
    get(key) {
      const map: Record<string, string | undefined> = {
        TELEGRAM_BOT_TOKEN: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: import.meta.env.VITE_TELEGRAM_CHAT_ID,
        SERVICE_NAME: import.meta.env.VITE_SERVICE_NAME,
        NODE_ENV: import.meta.env.MODE,
      };
      return map[key];
    },
  },
});
```

> [!WARNING]
> Если вы используете библиотеку на фронтенде, токен бота окажется доступен в браузере. Этот риск — ответственность пользователя.

Rich-сообщения (`custom`), `flush()`, дедупликация и фильтр `minLevel`, изменение `labels` — в [Дополнительно](#дополнительно).

## API

### `createNotifygram(options?)`

| Параметр | Тип | Описание |
|----------|-----|----------|
| `token` | `string` | Токен Telegram-бота. Если не передан, используется `TELEGRAM_BOT_TOKEN`. |
| `chatId` | `number \| string` | ID чата или канала. Если не передан, используется `TELEGRAM_CHAT_ID`. |
| `env` | `EnvironmentSource` | Свой источник env (`get(key)`). По умолчанию — `process.env`, если доступен. |
| `meta.service` | `string` | Имя сервиса, отображаемое в сообщениях. |
| `meta.env` | `string` | Имя окружения. По умолчанию используется `NODE_ENV`. |
| `meta.hostname` | `string` | Опциональная метка хоста. Если не задана — не показывается. |
| `meta.timeStamp` | `boolean` | Показывать timestamp. По умолчанию `true`. |
| `showMeta` | `boolean` | Показывать блок метаданных. По умолчанию `true`. |
| `minLevel` | `LogLevel` | Минимальный уровень логирования; сообщения ниже порога не отправляются. |
| `labels` | `NotifygramLabels` | Пользовательские заголовки сообщений по уровню логирования. |

### Методы

Все методы возвращают `Promise<void>`. Ошибки отправки в Telegram не пробрасываются в приложение: Notifygram пишет их через `console.error`, чтобы логирование не роняло основной процесс. Ошибки конфигурации могут быть выброшены при создании экземпляра.

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
- `ProcessEnvironmentSource` — источник `EnvironmentSource` по умолчанию на базе `process.env`.
- `ConfigError`, `TelegramApiError`, `TelegramNetworkError` — ошибки, полезные для обработки сбоев конфигурации и Telegram API.
- `EnvironmentSource`, `LogLevel`, `NotifygramOptions`, `NotifygramMetaOptions`, `NotifygramLabels`, `NotifygramMessageOptions`, `NotifygramCustomMessageOptions`, `CustomMessageMode` — публичные типы библиотеки.

## Дополнительно

<details>
<summary>Приоритет настроек, переменные окружения, <code>custom</code>, <code>labels</code>, <code>flush</code>, дедупликация, <code>minLevel</code></summary>

### Приоритет настроек

Сверху вниз — что важнее:

1. Параметры в коде — `createNotifygram({ token, chatId })`
2. `EnvironmentSource` — свой `env.get(...)` или `ProcessEnvironmentSource` по умолчанию (`process.env`)

Библиотека **сама не читает** файл `.env`. Загружайте переменные рантаймом (`node --env-file=.env`, dotenv, конфиг хоста) или используйте `npx notifygram init`, который пишет `.env` для CLI/настройки. Бандлеры (Vite и аналоги) подставляют env на сборке — передайте эти значения через опции или свой `env`.

> Если `token` и `chatId` указаны в коде, они используются всегда, даже если в окружении лежат другие значения.


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
    hostname: "web-1",
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

### Изменение заголовков сообщений `labels`

Заголовки стандартных и кастомных сообщений можно задать двумя способами.

**1. При инициализации** — через `labels` по уровню (`custom`, `message`, `info`, `warning`, `error`, `fatal`):

```ts
const notifygram = createNotifygram({
  labels: {
    info: "Information",
    warning: "WARNING",
    error: "ERROR",
    custom: "Order",
  },
});
```

**2. При отправке** — через `label` в опциях сообщения (имеет приоритет над `labels`):

```ts
await notifygram.info("Test message", { label: "INFO LABEL" });
await notifygram.custom("<b>New order</b>", { label: "Order #42" });
```

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
