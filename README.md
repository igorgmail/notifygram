<div align="center"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/notifygramlogo.webp" alt="notifygram"></div>

<div align="center">
<details><summary><b>Read this in other languages</b></summary>

🇺🇸 <a href="README.md">English</a> | 🇷🇺 <a href="docs/translations/README.ru-RU.md">Русский</a>

</details>
</div>

# Notifygram

> A lightweight Node.js library for sending app notifications to Telegram.
> No polling, no webhooks — outbound delivery only. Drop in a bot token and `chatId`, then call `notifygram.info(...)`.

## Features

- **Notification types** — `custom`, `message`, `info`, `warning`, `error`, `fatal`
- **Metadata** — service, environment, host, timestamp; stack traces for `error` / `fatal`
- **Send queue** — at most one message per second (Telegram rate limits)
- **Error deduplication** — repeated `error` / `fatal` messages within 60 seconds are merged
- **Rich messages** — `custom()` with HTML or Markdown
- **Graceful shutdown** — `flush()` waits for pending messages before exit

## Install

Requires Node.js 18+.

```bash
npm install notifygram
```

## Quick start

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

You'll need a bot token and a chat ID — see [Setup](#setup) for how to get them. If you don't know the chat ID yet, run `npx notifygram init`.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the `BOT_TOKEN`.
2. For a channel or group, add the bot and make it an admin.

**If you already know the channel (chat / group) ID** — pass `token` and `chatId` in code (as in [Quick start](#quick-start)), or load them into the process environment (for example `node --env-file=.env`, dotenv, or your host's env vars):

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=-1001234567890
```

**If you don't know the ID** — run this in your terminal and follow the prompts:

```bash
npx notifygram init
```

- If `.env` has no `TELEGRAM_BOT_TOKEN`, the CLI will ask for it.
- Send any message to the channel (chat / group).
- The CLI detects the chat and writes `TELEGRAM_CHAT_ID` and `TELEGRAM_BOT_TOKEN` to `.env`.

## Usage

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

If you omit `token` and `chatId`, Notifygram falls back to `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from the environment (`process.env` in Node / SSR):

```ts
const notifygram = createNotifygram({
  meta: {
    service: "Payments",
  },
});
```

On Vite / Vue / React, pass values from your bundler env explicitly, or provide a custom `env` source:

```ts
const notifygram = createNotifygram({
  token: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
  chatId: import.meta.env.VITE_TELEGRAM_CHAT_ID,
});

// or map keys yourself:
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
> If you use this library in the browser, the bot token will be visible to clients. That risk is your responsibility.

For rich messages (`custom`), `flush()`, deduplication, and the `minLevel` filter, see [Advanced](#advanced).

## API

### `createNotifygram(options?)`

| Option | Type | Description |
|----------|-----|----------|
| `token` | `string` | Telegram bot token. Falls back to `TELEGRAM_BOT_TOKEN` if omitted. |
| `chatId` | `number \| string` | Chat or channel ID. Falls back to `TELEGRAM_CHAT_ID` if omitted. |
| `env` | `EnvironmentSource` | Custom env reader (`get(key)`). Defaults to `process.env` when available. |
| `meta.service` | `string` | Service name shown in messages. |
| `meta.env` | `string` | Environment name. Defaults to `NODE_ENV`. |
| `meta.hostname` | `string` | Optional hostname label. Omitted when not set. |
| `meta.timeStamp` | `boolean` | Include a timestamp. Defaults to `true`. |
| `showMeta` | `boolean` | Show the metadata block. Defaults to `true`. |
| `minLevel` | `LogLevel` | Minimum log level; messages below this threshold are not sent. |
| `labels` | `NotifygramLabels` | Custom message titles per log level. |

### Methods

All methods return `Promise<void>`. Telegram delivery failures are not thrown into your app — Notifygram logs them with `console.error` so logging never takes down the main process. Configuration errors may still be thrown when you create an instance.

- `notifygram.message(message: string | Error)`
- `notifygram.info(message: string | Error)`
- `notifygram.warning(message: string | Error)`
- `notifygram.error(message: string | Error)`
- `notifygram.fatal(message: string | Error)`
- `notifygram.custom(message: string, options?: { mode?: "html" | "markdown" })`
- `notifygram.flush()` — wait until all queued messages have been sent to Telegram

### Exports

- `createNotifygram(options?)` — factory for a `Notifygram` instance.
- `Notifygram` — the logger class.
- `ProcessEnvironmentSource` — default `EnvironmentSource` backed by `process.env`.
- `ConfigError`, `TelegramApiError`, `TelegramNetworkError` — errors useful when handling configuration or Telegram API failures.
- `EnvironmentSource`, `LogLevel`, `NotifygramOptions`, `NotifygramMetaOptions`, `NotifygramLabels`, `NotifygramMessageOptions`, `NotifygramCustomMessageOptions`, `CustomMessageMode` — public library types.

## Advanced

<details>
<summary>Config precedence, environment variables, <code>custom</code>, <code>flush</code>, deduplication, <code>minLevel</code></summary>

### Config precedence

Highest priority first:

1. Options in code — `createNotifygram({ token, chatId })`
2. `EnvironmentSource` — custom `env.get(...)` or the default `ProcessEnvironmentSource` (`process.env`)

The library does **not** read a `.env` file itself. Load env vars with your runtime (`node --env-file=.env`, dotenv, host config), or use `npx notifygram init` which writes `.env` for CLI/setup. Bundlers (Vite and similar) inject their own env at build time — pass those values via options or a custom `env` source.

> [!TIP]
> When `token` and `chatId` are set in code, they always win — even if the environment has different values.

### Environment variables

| Variable | Required | Description |
|------------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Yes, unless `token` is passed | Bot token |
| `TELEGRAM_CHAT_ID` | Yes, unless `chatId` is passed | Target chat / channel ID |
| `SERVICE_NAME` | No | Default service name |
| `NODE_ENV` | No | Default environment name |

### Custom messages

`custom()` takes a string and sends it as a rich message via the Telegram API `sendRichMessage`. Markup (HTML or Markdown) is detected automatically, or you can set it explicitly with `mode`.

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
  <summary>Example</summary>

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


### When to call `flush()`

`flush()` waits until every queued message has been delivered to Telegram.

Call it at the end of a short-lived script — otherwise the process may exit before messages go out:

```ts
await notifygram.info("Backup done");
await notifygram.error(new Error("Disk full"));

await notifygram.flush(); // wait for delivery, then it's safe to exit
```

On a long-running server you usually don't need it — messages are sent in the background. Use `flush()` there only during shutdown.

### Deduplication

Applies only to `error()` and `fatal()`. Every `message()`, `info()`, and `warning()` call is sent on its own.

Identical messages within a 60-second window are grouped; after 2 seconds of silence (or a `flush()` call), a single message is sent, e.g. `ERROR (3 times in the last 60 seconds)`.

### `minLevel` filter

Minimum severity required for a message to be sent to Telegram. Anything below the threshold is silently dropped.

Level order: `custom` → `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | What gets sent |
|------------|------------------|
| `"custom"` (default) | custom, message, info, warning, error, fatal |
| `"message"` | message, info, warning, error, fatal |
| `"info"` | info, warning, error, fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | fatal only |

```ts
const notifygram = createNotifygram({
  meta: {
    service: "payments",
  },
  minLevel: "error", // production — skip info and warning
});

await notifygram.info("Server started"); // not sent
await notifygram.error("DB failed");     // sent
```

</details>

## License

[ISC](./LICENSE)
