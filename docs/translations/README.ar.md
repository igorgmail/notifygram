<div align="center"><img src="https://raw.githubusercontent.com/igorgmail/myproject-assets/refs/heads/main/images/notifygramlogo.webp" alt="notifygram"></div>

<div align="center">

  [![npm version](https://img.shields.io/npm/v/notifygram.svg?logo=npm&logoColor=white)](https://www.npmjs.com/package/notifygram)
  [![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](../../LICENSE)
  [![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-10.2-26A5E4.svg?logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![ESM](https://img.shields.io/badge/ESM-native-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
  [![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](../../package.json)

</div>

<div align="center">
	🇺🇸 <a href="../../README.md">English</a> | 🇷🇺 <a href="README.ru-RU.md">Русский</a> | 🇮🇳 <a href="README.hi-IN.md">हिन्दी</a> | 🇪🇸 <a href="README.es-ES.md">Español</a> | 🇸🇦 <a href="README.ar.md">العربية</a> | 🇫🇷 <a href="README.fr-FR.md">Français</a>
</div>


# Notifygram

> - مكتبة Node.js خفيفة لإشعارات التطبيق في Telegram.
> - بدون polling وبدون webhooks — إرسال صادر فقط.
> - بدون تبعيات خارجية.
> - وصّل رمز البوت و`chatId` — ثم أرسل الرسائل.

## المحتويات

- [التثبيت](#التثبيت)
- [البداية السريعة](#البداية-السريعة)
- [إعداد البوت](#إعداد-البوت)
- [أمثلة الاستخدام](#أمثلة-الاستخدام)
- [API](#api)
- [الإعدادات](#الإعدادات)
- [السلوك](#السلوك)

## الميزات

- **أنواع الإشعارات** — `custom`، `message`، `info`، `warning`، `error`، `fatal`
- **البيانات الوصفية** — الخدمة، البيئة، المضيف، الطابع الزمني؛ تتبع المكدس لـ `error` / `fatal`
- **الطابور** — رسالة واحدة في الثانية كحد أقصى (حدود معدل Telegram)
- **إزالة التكرار** — تُدمج رسائل `error` / `fatal` المتكررة خلال 60 ثانية
- **رسائل غنية** — `custom()` مع HTML أو Markdown
- **`flush()`** — انتظار التسليم قبل خروج السكربت

## التثبيت

يتطلب Node.js 18+.

```bash
npm install notifygram
```

## البداية السريعة

تحتاج إلى رمز بوت ومعرف محادثة — انظر [إعداد البوت](#إعداد-البوت). إذا لم تعرف المعرف بعد: `npx notifygram init`.

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

## إعداد البوت

1. أنشئ بوتًا عبر [@BotFather](https://t.me/BotFather) وانسخ `BOT_TOKEN`.
2. للقناة أو المجموعة: أضف البوت واجعله مشرفًا.
3. يمكنك أيضًا المراسلة في محادثة خاصة مع البوت.

**إذا كنت تعرف معرف المحادثة بالفعل** — مرّر `token` و`chatId` في الكود، أو ضعهما في `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**إذا لم تعرف المعرف** — شغّل واجهة سطر الأوامر واتبع التعليمات:

```bash
npx notifygram init
```

- سيطلب CLI الرمز (إن لم يكن موجودًا بالفعل في `.env`).
- أرسل أي رسالة إلى القناة / المحادثة / المجموعة.
- يكتب CLI قيمتي `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID` في `.env`.

> المكتبة **لا** تقرأ ملف `.env` بنفسها. حمّل المتغيرات إلى البيئة قبل التشغيل، على سبيل المثال:  
> `node --env-file=.env app.js` (Node 20+)، أو dotenv، أو متغيرات بيئة المضيف.

## أمثلة الاستخدام

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

**رسالة غنية**

```ts
await notifygram.custom(`
  <h2>Payment failed</h2>
  <p>User payment was declined</p>
`, { mode: "html" });
```

**سكربت قصير العمر** — استدعِ `flush()` في النهاية، وإلا قد ينتهي العملية قبل التسليم:

```ts
await notifygram.info("Backup done");
await notifygram.flush();
```

<details>
<summary>مثال رسالة طلب</summary>

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
| الخيار | النوع | الوصف |
|----------|-----|----------|
| `token` | `string` | رمز البوت. إن حُذف، يُستخدم `TELEGRAM_BOT_TOKEN`. |
| `chatId` | `number \| string` | معرف المحادثة أو القناة. إن حُذف، يُستخدم `TELEGRAM_CHAT_ID`. |
| `env` | `EnvironmentSource` | مصدر بيئة مخصص (`get(key)`). الافتراضي: `process.env`. |
| `meta.service` | `string` | اسم الخدمة في الرسائل. |
| `meta.env` | `string` | البيئة. الافتراضي: `NODE_ENV`. |
| `meta.hostname` | `string` | تسمية المضيف (مخفية إن لم تُحدَّد). |
| `meta.timeStamp` | `boolean` | إظهار الطابع الزمني. الافتراضي: `true`. |
| `showMeta` | `boolean` | إظهار كتلة البيانات الوصفية. الافتراضي: `true`. |
| `minLevel` | `LogLevel` | المستوى الأدنى؛ الرسائل دون العتبة لا تُرسل. |
| `labels` | `NotifygramLabels` | عناوين مخصصة لكل مستوى. |

**NotifygramLabels**

خريطة جزئية `Partial<Record<LogLevel, string>>` — عناوين إشعارات مخصصة لكل مستوى. المستويات غير المحددة تحتفظ بالقيم الافتراضية.

| الخيار | النوع | الوصف |
|----------|-----|----------|
| `custom` | `string` | عنوان لـ `custom`. بلا افتراضي — يُخفى العنوان ما لم يُحدَّد. |
| `message` | `string` | عنوان لـ `message`. الافتراضي: `💬 MESSAGE`. |
| `info` | `string` | عنوان لـ `info`. الافتراضي: `ℹ️ INFO`. |
| `warning` | `string` | عنوان لـ `warning`. الافتراضي: `⚠️ WARNING`. |
| `error` | `string` | عنوان لـ `error`. الافتراضي: `❌ ERROR`. |
| `fatal` | `string` | عنوان لـ `fatal`. الافتراضي: `☠️ FATAL`. |

### الطرق

جميع الطرق تُرجع `Promise<void>`. فشل التسليم إلى Telegram لا يوقف التطبيق — يُسجَّل عبر `console.error`. قد تُرمى أخطاء الإعداد عند إنشاء المثيل.

- `notifygram.message(message: string | Error, options?)`
- `notifygram.info(message: string | Error, options?)`
- `notifygram.warning(message: string | Error, options?)`
- `notifygram.error(message: string | Error, options?)`
- `notifygram.fatal(message: string | Error, options?)`
- `notifygram.custom(message: string, options?)` — `mode`، `label`
- `notifygram.flush()` — انتظار الطابور

## الإعدادات

### أولوية المتغيرات: `token` و`chatId`

1. الخيارات في الكود — `createNotifygram({ token, chatId })`
2. متغيرات البيئة — عبر `process.env` أو `env.get(...)` مخصص

| المتغير | مطلوب | الوصف |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | نعم، ما لم يُحدَّد `token` | رمز البوت |
| `TELEGRAM_CHAT_ID` | نعم، ما لم يُحدَّد `chatId` | معرف المحادثة / القناة |
| `SERVICE_NAME` | لا | اسم الخدمة الافتراضي |
| `NODE_ENV` | لا | البيئة الافتراضية |

```ts
// يجب أن تكون القيم موجودة مسبقًا في process.env
const notifygram = createNotifygram({
  meta: { service: "Payments" },
});
```

### مرشح `minLevel`

كل ما دون العتبة يُتجاهل بصمت.

الترتيب: `custom` → `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | ما يُرسَل |
|------------|------------------|
| `"custom"` (الافتراضي) | جميع المستويات |
| `"message"` | message … fatal |
| `"info"` | info … fatal |
| `"warning"` | warning، error، fatal |
| `"error"` | error، fatal |
| `"fatal"` | fatal فقط |

```ts
const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  minLevel: "error", // في الإنتاج — تخطي info و warning
});

await notifygram.info("Server started"); // لا يُرسل
await notifygram.error("DB failed");     // يُرسل
```

### عناوين `labels`

**يمكنك تعيينها عند إنشاء المثيل:**

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
> لـ `custom`، لا يُعرض عنوان افتراضيًا — عيّنه في `labels` أو عبر `{ label }` عند الإرسال:

**عند الإرسال** (يتجاوز `labels`):

```ts
await notifygram.info("Test message", { label: "INFO LABEL" });
await notifygram.custom("<b>New order</b>", { label: "Order #42" });
```

### Vite / Vue / React

يحقن المجمّع متغيرات البيئة وقت البناء — مرّر القيم صراحةً أو عبر `env` مخصص:

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
> في الواجهة الأمامية، سينتهي رمز البوت في المتصفح. هذه المخاطرة مسؤوليتك. في الإنتاج، يُفضَّل إرسال الإشعارات من الخادم.

## السلوك

<details>
<summary>الطابور، إزالة التكرار</summary>

### الطابور

تُرسل الرسائل مرة واحدة في الثانية كحد أقصى — احترامًا لحدود معدل Telegram.

### إزالة التكرار

فقط لـ `error()` و`fatal()`. الرسائل المتطابقة خلال 60 ثانية تُجمَّع؛ بعد ثانيتين من الصمت (أو `flush()`)، تُرسل رسالة واحدة، مثلًا `ERROR (3 times in the last 60 seconds)`.

`message()` و`info()` و`warning()` تُرسل دائمًا بشكل منفصل.

</details>

## الترخيص

[ISC](../../LICENSE)
