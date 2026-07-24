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

> - Biblioteca ligera de Node.js para notificaciones de la app en Telegram.
> - Sin polling ni webhooks — solo envío saliente.
> - Sin dependencias externas.
> - Conecta un token de bot y un `chatId` — y envía mensajes.

## Contenido

- [Instalación](#instalación)
- [Inicio rápido](#inicio-rápido)
- [Configuración del bot](#configuración-del-bot)
- [Ejemplos de uso](#ejemplos-de-uso)
- [API](#api)
- [Configuración](#configuración)
- [Comportamiento](#comportamiento)

## Características

- **Tipos de notificación** — `custom`, `message`, `info`, `warning`, `error`, `fatal`
- **Metadatos** — servicio, entorno, host, timestamp; stack traces para `error` / `fatal`
- **Cola** — como máximo un mensaje por segundo (límites de Telegram)
- **Deduplicación** — los `error` / `fatal` repetidos en 60 segundos se fusionan
- **Mensajes enriquecidos** — `custom()` con HTML o Markdown
- **`flush()`** — espera la entrega antes de que el script termine

## Instalación

Requiere Node.js 18+.

```bash
npm install notifygram
```

## Inicio rápido

Necesitas un token de bot y un ID de chat — consulta [Configuración del bot](#configuración-del-bot). Si aún no conoces el ID: `npx notifygram init`.

```js
import { createNotifygram } from "notifygram";

const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
});

await notifygram.info("Notifygram is ready");
```

## Configuración del bot

1. Crea un bot con [@BotFather](https://t.me/BotFather) y copia el `BOT_TOKEN`.
2. Para un canal o grupo: añade el bot y hazlo administrador.
3. También puedes escribir en un chat privado con el bot.

**Si ya conoces el ID del chat** — pasa `token` y `chatId` en el código, o ponlos en `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**Si no conoces el ID** — ejecuta el CLI y sigue las indicaciones:

```bash
npx notifygram init
```

- El CLI pedirá el token (si aún no está en `.env`).
- Envía cualquier mensaje al canal / chat / grupo.
- El CLI escribe `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.env`.

> La biblioteca **no** lee el archivo `.env` por sí misma. Carga las variables en el entorno antes de ejecutar, por ejemplo:  
> `node --env-file=.env app.js` (Node 20+), dotenv o las variables de entorno del host.

## Ejemplos de uso

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

**Mensaje enriquecido**

```ts
await notifygram.custom(`
  <h2>Payment failed</h2>
  <p>User payment was declined</p>
`, { mode: "html" });
```

**Script de corta duración** — llama a `flush()` al final; si no, el proceso puede terminar antes de la entrega:

```ts
await notifygram.info("Backup done");
await notifygram.flush();
```

<details>
<summary>Ejemplo de mensaje de pedido</summary>

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
| Opción | Tipo | Descripción |
|----------|-----|----------|
| `token` | `string` | Token del bot. Si se omite, se usa `TELEGRAM_BOT_TOKEN`. |
| `chatId` | `number \| string` | ID del chat o canal. Si se omite, se usa `TELEGRAM_CHAT_ID`. |
| `env` | `EnvironmentSource` | Fuente de env personalizada (`get(key)`). Por defecto: `process.env`. |
| `meta.service` | `string` | Nombre del servicio en los mensajes. |
| `meta.env` | `string` | Entorno. Por defecto: `NODE_ENV`. |
| `meta.hostname` | `string` | Etiqueta del host (oculta si no se define). |
| `meta.timeStamp` | `boolean` | Mostrar timestamp. Por defecto: `true`. |
| `showMeta` | `boolean` | Mostrar el bloque de metadatos. Por defecto: `true`. |
| `minLevel` | `LogLevel` | Nivel mínimo; los mensajes por debajo del umbral no se envían. |
| `labels` | `NotifygramLabels` | Títulos personalizados por nivel. |

**NotifygramLabels**

Un mapa parcial `Partial<Record<LogLevel, string>>` — títulos de notificación personalizados por nivel. Los niveles no especificados conservan los valores por defecto.

| Opción | Tipo | Descripción |
|----------|-----|----------|
| `custom` | `string` | Título para `custom`. Sin valor por defecto — el título se oculta si no se define. |
| `message` | `string` | Título para `message`. Por defecto: `💬 MESSAGE`. |
| `info` | `string` | Título para `info`. Por defecto: `ℹ️ INFO`. |
| `warning` | `string` | Título para `warning`. Por defecto: `⚠️ WARNING`. |
| `error` | `string` | Título para `error`. Por defecto: `❌ ERROR`. |
| `fatal` | `string` | Título para `fatal`. Por defecto: `☠️ FATAL`. |

### Métodos

Todos los métodos devuelven `Promise<void>`. Los fallos de entrega a Telegram no detienen la app — se registran con `console.error`. Los errores de configuración pueden lanzarse al crear una instancia.

- `notifygram.message(message: string | Error, options?)`
- `notifygram.info(message: string | Error, options?)`
- `notifygram.warning(message: string | Error, options?)`
- `notifygram.error(message: string | Error, options?)`
- `notifygram.fatal(message: string | Error, options?)`
- `notifygram.custom(message: string, options?)` — `mode`, `label`
- `notifygram.flush()` — esperar la cola

## Configuración

### Precedencia de variables: `token` y `chatId`

1. Opciones en el código — `createNotifygram({ token, chatId })`
2. Variables de entorno — vía `process.env` o un `env.get(...)` personalizado

| Variable | Obligatoria | Descripción |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Sí, salvo que se defina `token` | Token del bot |
| `TELEGRAM_CHAT_ID` | Sí, salvo que se defina `chatId` | ID del chat / canal |
| `SERVICE_NAME` | No | Nombre del servicio por defecto |
| `NODE_ENV` | No | Entorno por defecto |

```ts
// los valores ya deben estar en process.env
const notifygram = createNotifygram({
  meta: { service: "Payments" },
});
```

### Filtro `minLevel`

Todo lo que esté por debajo del umbral se descarta en silencio.

Orden: `custom` → `message` → `info` → `warning` → `error` → `fatal`.

| `minLevel` | Qué se envía |
|------------|------------------|
| `"custom"` (por defecto) | todos los niveles |
| `"message"` | message … fatal |
| `"info"` | info … fatal |
| `"warning"` | warning, error, fatal |
| `"error"` | error, fatal |
| `"fatal"` | solo fatal |

```ts
const notifygram = createNotifygram({
  token: "YOUR_BOT_TOKEN",
  chatId: "YOUR_CHAT_ID",
  minLevel: "error", // en producción — omitir info y warning
});

await notifygram.info("Server started"); // no se envía
await notifygram.error("DB failed");     // se envía
```

### Títulos `labels`

**Puedes definirlos al crear la instancia:**

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
> Para `custom`, por defecto no se muestra título — defínelo en `labels` o con `{ label }` al enviar:

**En el momento del envío** (tiene prioridad sobre `labels`):

```ts
await notifygram.info("Test message", { label: "INFO LABEL" });
await notifygram.custom("<b>New order</b>", { label: "Order #42" });
```

### Vite / Vue / React

El bundler inyecta el env en tiempo de build — pasa los valores explícitamente o mediante un `env` personalizado:

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
> En el frontend, el token del bot terminará en el navegador. Ese riesgo es tu responsabilidad. En producción, preferible enviar las notificaciones desde el servidor.

## Comportamiento

<details>
<summary>Cola, deduplicación</summary>

### Cola

Los mensajes se envían como máximo una vez por segundo — así se respetan los límites de Telegram.

### Deduplicación

Solo para `error()` y `fatal()`. Los mensajes idénticos en 60 segundos se agrupan; tras 2 segundos de silencio (o `flush()`), se envía un solo mensaje, p. ej. `ERROR (3 times in the last 60 seconds)`.

`message()`, `info()` y `warning()` siempre se envían por separado.

</details>

## Licencia

[ISC](../../LICENSE)
