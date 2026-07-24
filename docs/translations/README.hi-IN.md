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

> - Telegram में ऐप नोटिफ़िकेशन के लिए हल्की Node.js लाइब्रेरी।
> - कोई polling नहीं, कोई webhook नहीं — केवल आउटबाउंड डिलीवरी।
> - कोई बाहरी निर्भरता नहीं।
> - बॉट टोकन और `chatId` जोड़ें — फिर संदेश भेजें।

## विषय सूची

- [इंस्टॉल](#इंस्टॉल)
- [त्वरित शुरुआत](#त्वरित-शुरुआत)
- [बॉट सेटअप](#बॉट-सेटअप)
- [उपयोग के उदाहरण](#उपयोग-के-उदाहरण)
- [API](#api)
- [कॉन्फ़िगरेशन](#कॉन्फ़िगरेशन)
- [व्यवहार](#व्यवहार)

## विशेषताएँ

- **नोटिफ़िकेशन प्रकार** — `custom`, `message`, `info`, `warning`, `error`, `fatal`
- **मेटाडेटा** — सेवा, एनवायरनमेंट, होस्ट, टाइमस्टैम्प; `error` / `fatal` के लिए स्टैक ट्रेस
- **क्यू** — अधिकतम एक संदेश प्रति सेकंड (Telegram रेट लिमिट)
- **डेडुप्लिकेशन** — 60 सेकंड के भीतर दोहराए गए `error` / `fatal` मिला दिए जाते हैं
- **रिच संदेश** — HTML या Markdown के साथ `custom()`
- **`flush()`** — स्क्रिप्ट बंद होने से पहले डिलीवरी का इंतज़ार

## इंस्टॉल

Node.js 18+ आवश्यक है।

```bash
npm install notifygram
```

## त्वरित शुरुआत

आपको बॉट टोकन और चैट ID चाहिए — देखें [बॉट सेटअप](#बॉट-सेटअप)। अगर ID अभी नहीं पता: `npx notifygram init`।

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

## बॉट सेटअप

1. [@BotFather](https://t.me/BotFather) से बॉट बनाएँ और `BOT_TOKEN` कॉपी करें।
2. चैनल या ग्रुप के लिए: बॉट जोड़ें और उसे एडमिन बनाएँ।
3. आप बॉट के साथ निजी चैट में भी संदेश भेज सकते हैं।

**अगर चैट ID पहले से पता है** — कोड में `token` और `chatId` पास करें, या `.env` में रखें:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**अगर ID नहीं पता** — CLI चलाएँ और संकेतों का पालन करें:

```bash
npx notifygram init
```

- CLI टोकन माँगेगा (अगर वह पहले से `.env` में नहीं है)।
- चैनल / चैट / ग्रुप में कोई भी संदेश भेजें।
- CLI `TELEGRAM_BOT_TOKEN` और `TELEGRAM_CHAT_ID` को `.env` में लिख देगा।

> लाइब्रेरी स्वयं `.env` फ़ाइल **नहीं** पढ़ती। चलाने से पहले वेरिएबल एनवायरनमेंट में लोड करें, उदाहरण:  
> `node --env-file=.env app.js` (Node 20+), dotenv, या होस्ट के env vars।

## उपयोग के उदाहरण

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

**रिच संदेश**

```ts
await notifygram.custom(`
  <h2>Payment failed</h2>
  <p>User payment was declined</p>
`, { mode: "html" });
```

**छोटी स्क्रिप्ट** — अंत में `flush()` कॉल करें, वरना प्रक्रिया डिलीवरी से पहले बंद हो सकती है:

```ts
await notifygram.info("Backup done");
await notifygram.flush();
```

<details>
<summary>ऑर्डर संदेश का उदाहरण</summary>

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
| विकल्प | प्रकार | विवरण |
|----------|-----|----------|
| `token` | `string` | बॉट टोकन। अगर न दिया जाए, तो `TELEGRAM_BOT_TOKEN` से लिया जाता है। |
| `chatId` | `number \| string` | चैट या चैनल ID। अगर न दिया जाए, तो `TELEGRAM_CHAT_ID` से लिया जाता है। |
| `env` | `EnvironmentSource` | कस्टम env स्रोत (`get(key)`)। डिफ़ॉल्ट: `process.env`। |
| `meta.service` | `string` | संदेशों में सेवा का नाम। |
| `meta.env` | `string` | एनवायरनमेंट। डिफ़ॉल्ट: `NODE_ENV`। |
| `meta.hostname` | `string` | होस्ट लेबल (सेट न होने पर छिपा रहता है)। |
| `meta.timeStamp` | `boolean` | टाइमस्टैम्प दिखाएँ। डिफ़ॉल्ट: `true`। |
| `showMeta` | `boolean` | मेटाडेटा ब्लॉक दिखाएँ। डिफ़ॉल्ट: `true`। |
| `minLevel` | `LogLevel` | न्यूनतम स्तर; थ्रेशहोल्ड से नीचे के संदेश नहीं भेजे जाते। |
| `labels` | `NotifygramLabels` | प्रत्येक स्तर के कस्टम शीर्षक। |

**NotifygramLabels**

आंशिक मैप `Partial<Record<LogLevel, string>>` — प्रत्येक स्तर के कस्टम नोटिफ़िकेशन शीर्षक। अनिर्दिष्ट स्तर डिफ़ॉल्ट रखते हैं।

| विकल्प | प्रकार | विवरण |
|----------|-----|----------|
| `custom` | `string` | `custom` का शीर्षक। कोई डिफ़ॉल्ट नहीं — सेट न होने पर शीर्षक छिपा रहता है। |
| `message` | `string` | `message` का शीर्षक। डिफ़ॉल्ट: `💬 MESSAGE`। |
| `info` | `string` | `info` का शीर्षक। डिफ़ॉल्ट: `ℹ️ INFO`। |
| `warning` | `string` | `warning` का शीर्षक। डिफ़ॉल्ट: `⚠️ WARNING`। |
| `error` | `string` | `error` का शीर्षक। डिफ़ॉल्ट: `❌ ERROR`। |
| `fatal` | `string` | `fatal` का शीर्षक। डिफ़ॉल्ट: `☠️ FATAL`। |

### मेथड्स

सभी मेथड `Promise<void>` लौटाते हैं। Telegram डिलीवरी की विफलता ऐप को क्रैश नहीं करती — वे `console.error` से लॉग होती हैं। कॉन्फ़िगरेशन त्रुटियाँ इंस्टेंस बनाते समय फेंकी जा सकती हैं।

- `notifygram.message(message: string | Error, options?)`
- `notifygram.info(message: string | Error, options?)`
- `notifygram.warning(message: string | Error, options?)`
- `notifygram.error(message: string | Error, options?)`
- `notifygram.fatal(message: string | Error, options?)`
- `notifygram.custom(message: string, options?)` — `mode`, `label`
- `notifygram.flush()` — क्यू का इंतज़ार

## कॉन्फ़िगरेशन

### वेरिएबल प्राथमिकता: `token` और `chatId`

1. कोड में विकल्प — `createNotifygram({ token, chatId })`
2. एनवायरनमेंट वेरिएबल — `process.env` या कस्टम `env.get(...)` के माध्यम से

| वेरिएबल | आवश्यक | विवरण |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | हाँ, जब तक `token` सेट न हो | बॉट टोकन |
| `TELEGRAM_CHAT_ID` | हाँ, जब तक `chatId` सेट न हो | चैट / चैनल ID |
| `SERVICE_NAME` | नहीं | डिफ़ॉल्ट सेवा नाम |
| `NODE_ENV` | नहीं | डिफ़ॉल्ट एनवायरनमेंट |

```ts
// values must already be in process.env
const notifygram = createNotifygram({
  meta: { service: "Payments" },
});
```

### `minLevel` फ़िल्टर

थ्रेशहोल्ड से नीचे का सब कुछ चुपचाप छोड़ दिया जाता है।

क्रम: `custom` → `message` → `info` → `warning` → `error` → `fatal`।

| `minLevel` | क्या भेजा जाता है |
|------------|------------------|
| `"custom"` (डिफ़ॉल्ट) | सभी स्तर |
| `"message"` | message … fatal |
| `"info"` | info … fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | केवल fatal |

```ts
const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  minLevel: "error", // in production — skip info and warning
});

await notifygram.info("Server started"); // not sent
await notifygram.error("DB failed");     // sent
```

### `labels` शीर्षक

**इंस्टेंस बनाते समय सेट कर सकते हैं:**

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
> `custom` के लिए डिफ़ॉल्ट रूप से कोई शीर्षक नहीं दिखता — इसे `labels` में या कॉल के समय `{ label }` से सेट करें:

**भेजते समय** (`labels` को ओवरराइड करता है):

```ts
await notifygram.info("Test message", { label: "INFO LABEL" });
await notifygram.custom("<b>New order</b>", { label: "Order #42" });
```

### Vite / Vue / React

बंडलर बिल्ड समय पर env इंजेक्ट करता है — मान स्पष्ट रूप से या कस्टम `env` से पास करें:

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
> फ्रंटएंड पर बॉट टोकन ब्राउज़र में चला जाएगा। यह जोखिम आपकी ज़िम्मेदारी है। प्रोडक्शन में सर्वर से नोटिफ़िकेशन भेजना बेहतर है।

## व्यवहार

<details>
<summary>क्यू, डेडुप्लिकेशन</summary>

### क्यू

संदेश अधिकतम एक प्रति सेकंड भेजे जाते हैं — इससे Telegram रेट लिमिट का सम्मान होता है।

### डेडुप्लिकेशन

केवल `error()` और `fatal()` के लिए। 60 सेकंड के भीतर समान संदेश समूहित होते हैं; 2 सेकंड की चुप्पी (या `flush()`) के बाद एक संदेश जाता है, जैसे: `ERROR (3 times in the last 60 seconds)`।

`message()`, `info()`, और `warning()` हमेशा अलग भेजे जाते हैं।

</details>

## लाइसेंस

[ISC](../../LICENSE)
