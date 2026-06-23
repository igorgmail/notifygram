# Notifygram

Лёгкая Node.js-библиотека для отправки уведомлений приложения в Telegram-канал.

## Возможности

- **Пять уровней уведомлений** — `message`, `info`, `warning`, `error`, `fatal`, с опциональным фильтром `minLevel`.
- **Расширенный формат сообщений** — каждое уведомление включает имя сервиса, окружение и имя хоста; для `Error` в `error` / `fatal` дополнительно добавляется stack trace в формате HTML.
- **Ограничение частоты отправки** — исходящие сообщения ставятся в очередь и отправляются не чаще одного раза в секунду, чтобы не превышать лимиты Telegram.
- **Дедупликация ошибок** — повторяющиеся сообщения `error` / `fatal` с одинаковым текстом (или `Error.name:message`) в течение 60 секунд объединяются в одно уведомление со счётчиком повторов.
- **Корректное завершение** — `flush()` опустошает буфер дедупликации и ожидает доставки всех сообщений из очереди.

## Установка

```bash
npm install notifygram
```

Требуется Node.js 18+.

## Настройка

1. Создайте бота через [@BotFather](https://t.me/BotFather).
2. Добавьте бота в канал и назначьте его администратором.
3. Задайте переменные окружения:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=-1001234567890
```

Если вы не знаете ID канала, выполните:

```bash
npx notifygram init
```

CLI определит канал и выведет `chatId` для сохранения в `.env`.

## Использование

```ts
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  service: "payments",
  env: "production",
});

await notifygram.message("Deploy started");
await notifygram.info("Server started");
await notifygram.warning("Disk usage above 80%");
await notifygram.error(new Error("DB connection failed"));
await notifygram.fatal(new Error("Unrecoverable error"));

// Дождитесь отправки всех сообщений перед завершением
await notifygram.flush();
```

### Когда вызывать `flush()`

Логирование асинхронное: сообщения проходят через очередь, а `error` / `fatal` ждут до 2 секунд для дедупликации перед постановкой в очередь.

| Сценарий | Нужен `flush()`? |
|----------|------------------|
| Долгоживущий сервер (API, бот, воркер) | Нет — сообщения отправляются в фоне |
| Короткий скрипт, cron-задача, CLI | **Да** — вызовите перед выходом процесса |
| Корректное завершение (`SIGTERM`, `SIGINT`) | **Да** — гарантирует доставку ожидающих логов |
| Тесты или немедленная отправка без debounce | **Да** — пропускает 2-секундную задержку дедупликации |

Для серверов вызывайте `flush()` только при завершении. Для одноразовых скриптов — в конце (или в `finally`):

```ts
try {
  await notifygram.error(new Error("Backup failed"));
} finally {
  await notifygram.flush();
}
```

### Дедупликация

Применяется только к `error()` и `fatal()`. Каждый вызов `message()`, `info()` и `warning()` отправляется отдельно.

Одинаковые сообщения в течение 60 секунд группируются; после 2 секунд тишины (или вызова `flush()`) отправляется одно сообщение, например: `ERROR (3 times in the last 60 seconds)`.

### Фильтр `minLevel`

Минимальный уровень важности, с которого сообщения отправляются в Telegram. Всё «ниже» порога молча отбрасывается.

Порядок уровней: `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | Что отправляется |
|------------|------------------|
| `"message"` (по умолчанию) | message, info, warning, error, fatal |
| `"info"` | info, warning, error, fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | только fatal |

```ts
const notifygram = createNotifygram({
  service: "payments",
  minLevel: "error", // в production — без info и warning
});

await notifygram.info("Server started"); // не отправится
await notifygram.error("DB failed");     // отправится
```

## API

### `createNotifygram(options?)`

| Параметр   | Описание                                              |
|------------|-------------------------------------------------------|
| `service`  | Имя сервиса, отображаемое в сообщениях                |
| `env`      | Имя окружения (по умолчанию — `NODE_ENV`)             |
| `hostname` | Имя хоста (по умолчанию — `os.hostname()`)            |
| `minLevel` | Минимальный уровень логирования; сообщения ниже порога не отправляются (см. раздел выше) |

### Методы

Все методы возвращают `Promise<void>`. Ошибки отправки в Telegram не пробрасываются в приложение: Notifygram пишет их в `stderr`, чтобы логирование не роняло основной процесс. Ошибки конфигурации могут быть выброшены при создании экземпляра.

- `notifygram.message(message: string | Error)`
- `notifygram.info(message: string | Error)`
- `notifygram.warning(message: string | Error)`
- `notifygram.error(message: string | Error)`
- `notifygram.fatal(message: string | Error)`
- `notifygram.flush()` — немедленно сбросить буфер дедупликации и дождаться отправки всех сообщений из очереди в Telegram

### Экспорты

- `createNotifygram(options?)` — фабрика экземпляра `Notifygram`.
- `Notifygram` — класс логгера.
- `ConfigError`, `TelegramApiError`, `TelegramNetworkError` — ошибки, полезные для обработки сбоев конфигурации и Telegram API.
- `LogLevel`, `NotifygramMessage`, `NotifygramOptions` — публичные типы библиотеки.

## Переменные окружения

| Переменная           | Обязательна | Описание              |
|----------------------|-------------|-----------------------|
| `TELEGRAM_BOT_TOKEN` | Да          | Токен бота            |
| `TELEGRAM_CHAT_ID`   | Да          | ID целевого канала    |
| `SERVICE_NAME`       | Нет         | Сервис по умолчанию   |
| `NODE_ENV`           | Нет         | Окружение по умолчанию |

## Лицензия

ISC
