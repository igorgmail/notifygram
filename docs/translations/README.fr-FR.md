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

> - Bibliothèque Node.js légère pour les notifications d'application dans Telegram.
> - Pas de polling, pas de webhooks — uniquement l'envoi sortant.
> - Zéro dépendance externe.
> - Branchez un token de bot et un `chatId` — puis envoyez des messages.

## Sommaire

- [Installation](#installation)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration du bot](#configuration-du-bot)
- [Exemples d'utilisation](#exemples-dutilisation)
- [API](#api)
- [Configuration](#configuration)
- [Comportement](#comportement)

## Fonctionnalités

- **Types de notification** — `custom`, `message`, `info`, `warning`, `error`, `fatal`
- **Métadonnées** — service, environnement, hôte, horodatage ; traces de pile pour `error` / `fatal`
- **File d'attente** — au plus un message par seconde (limites de débit Telegram)
- **Déduplication** — les `error` / `fatal` répétés dans les 60 secondes sont fusionnés
- **Messages enrichis** — `custom()` avec HTML ou Markdown
- **`flush()`** — attendre la livraison avant la fin d'un script

## Installation

Nécessite Node.js 18+.

```bash
npm install notifygram
```

## Démarrage rapide

Vous avez besoin d'un token de bot et d'un ID de chat — voir [Configuration du bot](#configuration-du-bot). Si vous ne connaissez pas encore l'ID : `npx notifygram init`.

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

## Configuration du bot

1. Créez un bot avec [@BotFather](https://t.me/BotFather) et copiez le `BOT_TOKEN`.
2. Pour un canal ou un groupe : ajoutez le bot et donnez-lui le rôle d'administrateur.
3. Vous pouvez aussi écrire en chat privé avec le bot.

**Si vous connaissez déjà l'ID du chat** — passez `token` et `chatId` dans le code, ou placez-les dans `.env` :

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**Si vous ne connaissez pas l'ID** — lancez le CLI et suivez les instructions :

```bash
npx notifygram init
```

- Le CLI demandera le token (s'il n'est pas déjà dans `.env`).
- Envoyez un message quelconque au canal / chat / groupe.
- Le CLI écrit `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID` dans `.env`.

> La bibliothèque ne lit **pas** elle-même un fichier `.env`. Chargez les variables dans l'environnement avant l'exécution, par exemple :  
> `node --env-file=.env app.js` (Node 20+), dotenv, ou les variables d'environnement de votre hébergeur.

## Exemples d'utilisation

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

**Message enrichi**

```ts
await notifygram.custom(`
  <h2>Payment failed</h2>
  <p>User payment was declined</p>
`, { mode: "html" });
```

**Script de courte durée** — appelez `flush()` à la fin, sinon le processus peut se terminer avant la livraison :

```ts
await notifygram.info("Backup done");
await notifygram.flush();
```

<details>
<summary>Exemple de message de commande</summary>

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
| Option | Type | Description |
|----------|-----|----------|
| `token` | `string` | Token du bot. S'il est omis, repli sur `TELEGRAM_BOT_TOKEN`. |
| `chatId` | `number \| string` | ID du chat ou du canal. S'il est omis, repli sur `TELEGRAM_CHAT_ID`. |
| `env` | `EnvironmentSource` | Source d'environnement personnalisée (`get(key)`). Par défaut : `process.env`. |
| `meta.service` | `string` | Nom du service dans les messages. |
| `meta.env` | `string` | Environnement. Par défaut : `NODE_ENV`. |
| `meta.hostname` | `string` | Libellé de l'hôte (masqué s'il n'est pas défini). |
| `meta.timeStamp` | `boolean` | Afficher l'horodatage. Par défaut : `true`. |
| `showMeta` | `boolean` | Afficher le bloc de métadonnées. Par défaut : `true`. |
| `minLevel` | `LogLevel` | Niveau minimum ; les messages en dessous du seuil ne sont pas envoyés. |
| `labels` | `NotifygramLabels` | Titres personnalisés par niveau. |

**NotifygramLabels**

Une map partielle `Partial<Record<LogLevel, string>>` — titres de notification personnalisés par niveau. Les niveaux non précisés conservent les valeurs par défaut.

| Option | Type | Description |
|----------|-----|----------|
| `custom` | `string` | Titre pour `custom`. Pas de défaut — le titre est masqué s'il n'est pas défini. |
| `message` | `string` | Titre pour `message`. Défaut : `💬 MESSAGE`. |
| `info` | `string` | Titre pour `info`. Défaut : `ℹ️ INFO`. |
| `warning` | `string` | Titre pour `warning`. Défaut : `⚠️ WARNING`. |
| `error` | `string` | Titre pour `error`. Défaut : `❌ ERROR`. |
| `fatal` | `string` | Titre pour `fatal`. Défaut : `☠️ FATAL`. |

### Méthodes

Toutes les méthodes renvoient `Promise<void>`. Les échecs de livraison Telegram ne font pas planter l'application — ils sont journalisés avec `console.error`. Les erreurs de configuration peuvent être levées à la création de l'instance.

- `notifygram.message(message: string | Error, options?)`
- `notifygram.info(message: string | Error, options?)`
- `notifygram.warning(message: string | Error, options?)`
- `notifygram.error(message: string | Error, options?)`
- `notifygram.fatal(message: string | Error, options?)`
- `notifygram.custom(message: string, options?)` — `mode`, `label`
- `notifygram.flush()` — attendre la file d'attente

## Configuration

### Priorité des variables : `token` et `chatId`

1. Options dans le code — `createNotifygram({ token, chatId })`
2. Variables d'environnement — via `process.env` ou un `env.get(...)` personnalisé

| Variable | Requis | Description |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Oui, sauf si `token` est défini | Token du bot |
| `TELEGRAM_CHAT_ID` | Oui, sauf si `chatId` est défini | ID du chat / canal |
| `SERVICE_NAME` | Non | Nom de service par défaut |
| `NODE_ENV` | Non | Environnement par défaut |

```ts
// les valeurs doivent déjà être dans process.env
const notifygram = createNotifygram({
  meta: { service: "Payments" },
});
```

### Filtre `minLevel`

Tout ce qui est en dessous du seuil est ignoré silencieusement.

Ordre : `custom` → `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | Ce qui est envoyé |
|------------|------------------|
| `"custom"` (défaut) | tous les niveaux |
| `"message"` | message … fatal |
| `"info"` | info … fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | fatal uniquement |

```ts
const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  minLevel: "error", // en production — ignorer info et warning
});

await notifygram.info("Server started"); // non envoyé
await notifygram.error("DB failed");     // envoyé
```

### Titres `labels`

**Vous pouvez les définir à la création de l'instance :**

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
> Pour `custom`, aucun titre n'est affiché par défaut — définissez-le dans `labels` ou via `{ label }` à l'envoi :

**Au moment de l'envoi** (remplace `labels`) :

```ts
await notifygram.info("Test message", { label: "INFO LABEL" });
await notifygram.custom("<b>New order</b>", { label: "Order #42" });
```

### Vite / Vue / React

Le bundler injecte l'environnement au build — passez les valeurs explicitement ou via un `env` personnalisé :

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
> Sur le frontend, le token du bot se retrouvera dans le navigateur. Ce risque est de votre responsabilité. En production, préférez envoyer les notifications depuis le serveur.

## Comportement

<details>
<summary>File d'attente, déduplication</summary>

### File d'attente

Les messages sont envoyés au plus une fois par seconde — cela respecte les limites de débit de Telegram.

### Déduplication

Uniquement pour `error()` et `fatal()`. Les messages identiques dans les 60 secondes sont regroupés ; après 2 secondes de silence (ou `flush()`), un seul message est envoyé, par ex. `ERROR (3 times in the last 60 seconds)`.

`message()`, `info()` et `warning()` sont toujours envoyés séparément.

</details>

## Licence

[ISC](../../LICENSE)
