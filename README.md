
# Notifygram

  

Лёгкая Node.js-библиотека для отправки уведомлений приложения в Telegram-канал.

## Возможности

- **Типы уведомлений** — `custom`, `message`, `info`, `warning`, `error`, `fatal`, с опциональным фильтром `minLevel`.
- **Расширенный формат сообщений** — каждое уведомление может включать в себя мета информацию : имя сервиса, окружение и имя хоста, timestamp. Для `Error` в типы `error` / `fatal` дополнительно добавляется stack trace в формате HTML.
- **Ограничение частоты отправки** — исходящие операции ставятся в очередь и выполняются не чаще одного раза в секунду, чтобы не превышать лимиты Telegram.
- **Дедупликация ошибок** — повторяющиеся сообщения уровня `error` / `fatal` с одинаковым текстом (или `Error.name:message`) в течение 60 секунд объединяются в одно уведомление со счётчиком повторов.
- **Кастомные rich-сообщения** — тип `custom` может отправлять кастомные сообщения в формате (`HTML` |  `Markdown`). Используется метод Telegram Bot Api `sendRichMessage`.
- **Корректное завершение** — `flush()` дожидается отправки всех сообщений перед выходом.

## Установка

Требуется Node.js 18+.

```bash
npm install notifygram
```

## Настройка
### Шаг 1.

1. Создайте бота через [@BotFather](https://t.me/BotFather).
2. Вам понадобиться `BOT_TOKEN`
3. Если вы используете в канале или в группе то добавьте бота  и назначьте его администратором.

### Шаг 2.

#### **Если вы знаете ID канала (чата / группы).**

Передайте `token` и `chatId` в коде или задайте переменные окружения в файле `.env`:

js
```js
import { createNotifygram } from 'notifygram';

const notifygram = createNotifygram({
  token: "YOUR BOT TOKEN",
  chatId: "YOUR CHAT ID",
});
```

.env
```env
TELEGRAM_BOT_TOKEN=YOUR BOT TOKEN
TELEGRAM_CHAT_ID=-1001234567890
```

#### **Если вы не знаете ID канала (чата / группы).**

 Выполните в консоли, и следуйте подсказкам.
```bash
npx notifygram init
```

- Если в файле `.env` отсутствует `TELEGRAM_BOT_TOKEN` то вас попросят ввести его в консоли. 
- Затем нужно будет отправить любое сообщение в канал (чат / группу)  
- CLI определит канал и сохранит `TELEGRAM_CHAT_ID` и `TELEGRAM_BOT_TOKEN` в `.env`. 

## Пример использования

```ts
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: '1221212',
  chatId: '-1221212',
  meta: {
    service: "Payments",
    env: "development",
    timeStamp: false
  },
});

await notifygram.message("Deploy started");
await notifygram.info("Server started");
await notifygram.warning("Disk usage above 80%");
await notifygram.error(new Error("DB connection failed"));
await notifygram.fatal(new Error("Unrecoverable error"));
```

> [!WARNING]
> Если вы используете на фронтенде то ваши API ключи доступны


Если `token` и `chatId` не переданы, Notifygram использует `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` из окружения или `.env`:

```ts
const notifygram = createNotifygram({
  meta: {
    service: "Payments",
  },
});
```

  Приоритет настроек (сверху вниз — что важнее):
1. Параметры в коде — `createNotifygram({ token, chatId })`
2. Переменные окружения — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
3. Файл `.env` в корне проекта

> [!TIP]
> Если `token` и `chatId` указаны в коде, они используются всегда, даже если в `.env` лежат другие значения.

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

### Когда вызывать `flush()`

`flush()` дожидается, пока все сообщения уйдут в Telegram.

Вызывайте его в конце короткого скрипта — иначе процесс может завершиться раньше, чем сообщения отправятся:
```ts
await notifygram.info("Backup done");
await notifygram.error(new Error("Disk full"));

await notifygram.flush(); // подождать отправку, потом можно выходить
```

На обычном сервере  вызывать не нужно: сообщения уходят сами в фоне. Там `flush()` полезен только при остановке приложения.
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
await notifygram.error("DB failed");     // отправится
```
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

## Переменные окружения

| Переменная           | Обязательна | Описание              |
|----------------------|-------------|-----------------------|
| `TELEGRAM_BOT_TOKEN` | Да, если `token` не передан | Токен бота |
| `TELEGRAM_CHAT_ID`   | Да, если `chatId` не передан | ID целевого канала |
| `SERVICE_NAME`       | Нет         | Сервис по умолчанию   |
| `NODE_ENV`           | Нет         | Окружение по умолчанию |

## Лицензия

ISC