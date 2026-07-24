<div align="center"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/notifygramlogo.webp" alt="notifygram"></div>

<div align="center">

  [![npm version](https://img.shields.io/npm/v/notifygram.svg?logo=npm&logoColor=white)](https://www.npmjs.com/package/notifygram)
  [![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](./LICENSE)
  [![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-10.2-26A5E4.svg?logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![ESM](https://img.shields.io/badge/ESM-native-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
  [![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)

</div>

<div align="center">
	🇺🇸 <a href="../../README.md">English</a> | 🇷🇺 <a href="README.ru-RU.md">Русский</a> | 🇮🇳 <a href="README.hi-IN.md">हिन्दी</a> | 🇪🇸 <a href="README.es-ES.md">Español</a> | 🇸🇦 <a href="README.ar.md">العربية</a> | 🇫🇷 <a href="README.fr-FR.md">Français</a>
</div>

# Notifygram

> - Лёгкая Node.js-библиотека для уведомлений приложения в Telegram.
> - Без polling и webhook — только исходящая отправка.
> - Без внешних зависимостей.
> - Подключили бот-токен и `chatId` — и отправляете сообщения.

## Содержание

- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Настройка бота](#настройка-бота)
- [Примеры использования](#примеры-использования)
- [API](#api)
- [Конфигурация](#конфигурация)
- [Поведение](#поведение)

## Возможности

- **Типы уведомлений** — `custom`, `message`, `info`, `warning`, `error`, `fatal`
- **Метаданные** — сервис, окружение, хост, timestamp; для `error` / `fatal` — stack trace
- **Очередь** — не чаще одного сообщения в секунду (лимиты Telegram)
- **Дедупликация** — повторы `error` / `fatal` за 60 секунд объединяются
- **Rich-сообщения** — `custom()` с HTML или Markdown
- **`flush()`** — дождаться отправки перед выходом из скрипта

## Установка

Нужен Node.js 18+.

```bash
npm install notifygram
```

## Быстрый старт

Нужны токен бота и ID чата — как получить, см. [Настройка бота](#настройка-бота). Если ID неизвестен: `npx notifygram init`.

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

## Настройка бота

1. Создайте бота через [@BotFather](https://t.me/BotFather) и скопируйте `BOT_TOKEN`.
2. Для канала или группы: добавьте бота и сделайте администратором.
3. Можно писать и в личный чат с ботом.

**Если ID чата уже известен** — передайте `token` и `chatId` в коде или положите в `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**Если ID неизвестен** — запустите CLI и следуйте подсказкам:

```bash
npx notifygram init
```

- CLI попросит токен (если его ещё нет в `.env`).
- Отправьте любое сообщение в канал / чат / группу.
- CLI сохранит `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`.

> Библиотека **не читает** файл `.env` сама. Перед запуском загрузите переменные в окружение, например:  
> `node --env-file=.env app.js` (Node 20+), dotenv или переменные хоста.

## Примеры использования

```ts
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  meta: {
    service: "Payments",
    env: "development",
  },
});

await notifygram.message("Deploy started");
await notifygram.info("Server started");
await notifygram.warning("Disk usage above 80%");
await notifygram.error(new Error("DB connection failed"));
await notifygram.fatal(new Error("Unrecoverable error"));
```

**Rich-сообщение**

```ts
await notifygram.custom(`
  <h2>Payment failed</h2>
  <p>User payment was declined</p>
`, { mode: "html" });
```

**Короткий скрипт** — в конце вызовите `flush()`, иначе процесс может завершиться раньше отправки:

```ts
await notifygram.info("Backup done");
await notifygram.flush();
```

<details>
<summary>Пример сообщения заказа</summary>

```ts
const notifygramOrder = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  meta: {
    service: "Online store",
    hostname: "web-1",
  },
  labels: {
    custom: "Order",
  },
});

await notifygramOrder.custom(`
<h2>You have a new order 💰.</h2>
<details>
  <summary>Order details</summary>
  <table bordered striped>
    <tr><th>Item</th><th>Quantity</th><th>Total cost</th></tr>
    <tr><td>Item 1</td><td>2</td><td>100 USD</td></tr>
    <tr><td>Item 2</td><td>1</td><td>50 USD</td></tr>
  </table>
</details>
`);
```

<div align="left"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/message-1.webp" alt="custom-message"></div>
</details>


## API

### `createNotifygram(options?: NotifygramOptions)`

**NotifygramOptions**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `token` | `string` | Токен бота. Если не передан — берётся `TELEGRAM_BOT_TOKEN`. |
| `chatId` | `number \| string` | ID чата или канала. Если не передан — берётся `TELEGRAM_CHAT_ID`. |
| `env` | `EnvironmentSource` | Свой источник env (`get(key)`). По умолчанию — `process.env`. |
| `meta.service` | `string` | Имя сервиса в сообщениях. |
| `meta.env` | `string` | Окружение. По умолчанию — `NODE_ENV`. |
| `meta.hostname` | `string` | Метка хоста (если не задана — не показывается). |
| `meta.timeStamp` | `boolean` | Показывать timestamp. По умолчанию `true`. |
| `showMeta` | `boolean` | Показывать блок метаданных. По умолчанию `true`. |
| `minLevel` | `LogLevel` | Минимальный уровень; сообщения ниже порога не отправляются. |
| `labels` | `NotifygramLabels` | Свои заголовки по уровням. |

**NotifygramLabels**

Частичная карта `Partial<Record<LogLevel, string>>` — свои заголовки уведомлений по уровню. Неуказанные уровни используют значения по умолчанию.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `custom` | `string` | Заголовок для `custom`. По умолчанию нет — заголовок не показывается. |
| `message` | `string` | Заголовок для `message`. По умолчанию `💬 MESSAGE`. |
| `info` | `string` | Заголовок для `info`. По умолчанию `ℹ️ INFO`. |
| `warning` | `string` | Заголовок для `warning`. По умолчанию `⚠️ WARNING`. |
| `error` | `string` | Заголовок для `error`. По умолчанию `❌ ERROR`. |
| `fatal` | `string` | Заголовок для `fatal`. По умолчанию `☠️ FATAL`. |

### Методы

Все методы возвращают `Promise<void>`. Ошибки отправки в Telegram не роняют приложение — пишутся в `console.error`. Ошибки конфигурации могут быть выброшены при создании экземпляра.

- `notifygram.message(message: string | Error, options?)`
- `notifygram.info(message: string | Error, options?)`
- `notifygram.warning(message: string | Error, options?)`
- `notifygram.error(message: string | Error, options?)`
- `notifygram.fatal(message: string | Error, options?)`
- `notifygram.custom(message: string, options?)` — `mode`, `label`
- `notifygram.flush()` — дождаться очереди

## Конфигурация

### Приоритет переменных: `token` и `chatId`

1. Параметры в коде — `createNotifygram({ token, chatId })`
2. Переменные окружения — через `process.env` или свой `env.get(...)`

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Да, если нет `token` | Токен бота |
| `TELEGRAM_CHAT_ID` | Да, если нет `chatId` | ID чата / канала |
| `SERVICE_NAME` | Нет | Сервис по умолчанию |
| `NODE_ENV` | Нет | Окружение по умолчанию |

```ts
// значения уже должны быть в process.env
const notifygram = createNotifygram({
  meta: { service: "Payments" },
});
```

### Фильтр `minLevel`

Всё ниже порога молча отбрасывается.

Порядок: `custom` → `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | Что отправляется |
|------------|------------------|
| `"custom"` (по умолчанию) | все уровни |
| `"message"` | message … fatal |
| `"info"` | info … fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | только fatal |

```ts
const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  minLevel: "error", // в production — без info и warning
});

await notifygram.info("Server started"); // не отправится
await notifygram.error("DB failed");     // отправится
```

### Заголовки `labels`

**Можно изменить при создании экземпляра:**

```ts
const notifygram = createNotifygram({
  labels: {
    info: "Information",
    warning: "WARNING",
    error: "ERROR",
    custom: "Order"
  },
});
```
> Для `custom` заголовок по умолчанию не показывается — задайте его в `labels` или в `{ label }` при вызове:

**При отправке** (важнее, чем `labels`):

```ts
await notifygram.info("Test message", { label: "INFO LABEL" });
await notifygram.custom("<b>New order</b>", { label: "Order #42" });
```

### Vite / Vue / React

Бандлер подставляет env на сборке — передайте значения явно или через свой `env`:

```ts
const notifygram = createNotifygram({
  token: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
  chatId: import.meta.env.VITE_TELEGRAM_CHAT_ID,
});
```

```ts
const notifygram = createNotifygram({
  env: {
    get(key) {
      const map = {
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
> На фронтенде токен бота попадёт в браузер. Этот риск — на вашей ответственности. Для продакшена лучше слать уведомления с сервера.

## Поведение

<details>
<summary>Очередь, дедупликация</summary>

### Очередь

Сообщения уходят не чаще одного в секунду — так соблюдаются лимиты Telegram.

### Дедупликация

Только для `error()` и `fatal()`. Одинаковые сообщения за 60 секунд группируются; после 2 секунд тишины (или `flush()`) уходит одно, например: `ERROR (3 times in the last 60 seconds)`.

`message()`, `info()` и `warning()` всегда отправляются отдельно.

</details>

## Лицензия

[ISC](../../LICENSE)
