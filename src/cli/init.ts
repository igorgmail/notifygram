#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadTokenFromEnv } from "../config.js";
import { TelegramApiError } from "../errors.js";
import { TelegramApi } from "../telegram.js";
import { waitForChannel } from "./channel.js";
import { loadProjectEnv } from "./env-file.js";
import { clr } from "./utils.js";

const supportsAnsi = process.stdout.isTTY && !process.env.NO_COLOR;
const c = supportsAnsi
  ? clr
  : {
      red: (text: string) => text,
      green: (text: string) => text,
      blue: (text: string) => text,
      yellow: (text: string) => text,
      magenta: (text: string) => text,
      bold: (text: string) => text,
      underline: (text: string) => text,
      error: (text: string) => text,
      success: (text: string) => text,
    };

function saveProjectEnvValue(
  key: string,
  value: string,
  envPath = resolve(process.cwd(), ".env")
): void {
  const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const entry = `${key}=${value}`;
  let updated = false;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const existingKey = trimmed.slice(0, separator).trim();
    if (existingKey === key) {
      lines[i] = entry;
      updated = true;
      break;
    }
  }

  if (!updated) {
    if (lines.length === 1 && lines[0] === "") {
      lines[0] = entry;
    } else if (lines.at(-1) === "") {
      lines.splice(lines.length - 1, 0, entry);
    } else {
      lines.push(entry);
    }
  }

  writeFileSync(envPath, lines.join(lineEnding), "utf8");
}

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== "init") {
    console.error("Usage: notifygram init");
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  console.log(c.blue("╔═══════════════════════════════════════════════╗"));
  console.log(c.bold(c.blue("              Notifygram v1.0.0")));
  console.log(c.blue("╚═══════════════════════════════════════════════╝"));
  try {
    loadProjectEnv();

    let tokenInput = loadTokenFromEnv();
    let shouldSaveToken = false;

    if (!tokenInput) {
      console.log(
        "TELEGRAM_BOT_TOKEN is not set in environment variables or .env file."
      );
      tokenInput = (await rl.question("Bot token: ")).trim();
      shouldSaveToken = true;
    }

    if (!tokenInput) {
      console.error("✗ Bot token is required.");
      process.exit(1);
    }

    const telegram = new TelegramApi(tokenInput);
    const me = await telegram.getMe().catch((error: unknown) => {
      if (error instanceof TelegramApiError) {
        console.error(c.red("✗ Bot was not found. Check TELEGRAM_BOT_TOKEN and try again."));
        console.error(c.red(`Telegram API: ${error.message}`));
        process.exit(1);
      }

      throw error;
    });
    const username = me.result?.username ?? "unknown";

    console.log(c.green(`Bot found: `) + c.magenta(`@${username}`));
    if (shouldSaveToken) {
      saveProjectEnvValue("TELEGRAM_BOT_TOKEN", tokenInput);
      console.log(c.green("Saved TELEGRAM_BOT_TOKEN to .env."));
    }
    console.log("");
    console.log(c.blue("1. Add the bot to your channel"));
    console.log(c.blue("2. Promote the bot to administrator"));
    console.log(c.blue("3. Send any message to the channel, e.g. 'connect'"));
    console.log("");
    console.log(c.blue("Waiting message from channel..."));

    const chat = await waitForChannel(telegram);
    console.log("\n\n");
    console.log(c.green(`"channelType": `) + c.magenta(`${chat.type}`));
    console.log(c.green(`"name": `) + c.magenta(`${chat.title ?? chat.username}`));
    console.log(c.green(`"chatId": `) + c.magenta(`${chat.id}`));
    console.log("");
    console.log(c.green("Saving chat ID to .env..."));
    saveProjectEnvValue("TELEGRAM_CHAT_ID", String(chat.id));
    await telegram.sendMessage({
      chatId: chat.id,
      text:
        "✅ Notifygram connected successfully.\n\nThis chat ID was saved to your .env:\n\n<b><code>TELEGRAM_CHAT_ID=" +
        chat.id +
        "</code></b>",
      parseMode: "HTML",
    });

    console.log(c.green("✓ Done."));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(c.red(message));
    console.error(c.red("Try again or contact support."));
    process.exit(1);
  } finally {
    rl.close();
  }
}

void main();
