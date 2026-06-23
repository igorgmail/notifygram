#!/usr/bin/env node

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadProjectEnv, loadTokenFromEnv } from "../src/config.js";
import { TelegramApi } from "../src/telegram.js";
import { waitForChannel } from "./channel.js";
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

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== "init") {
    console.error("Usage: notifygram init");
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  // Banner
  console.log(c.blue("╔═══════════════════════════════════════════════╗"));
  console.log(c.bold(c.blue("              Notifygram v1.0.0")));
  console.log(c.blue("╚═══════════════════════════════════════════════╝"));
  try {
    loadProjectEnv();

    let tokenInput = loadTokenFromEnv();

    if (!tokenInput) {
      console.log(
        "TELEGRAM_BOT_TOKEN is not set in environment variables or .env file."
      );
      tokenInput = (await rl.question("Bot token: ")).trim();
    }

    if (!tokenInput) {
      console.error("✗ Bot token is required.");
      process.exit(1);
    }

    const telegram = new TelegramApi(tokenInput);
    const me = await telegram.getMe();
    const username = me.result?.username ?? "unknown";

    console.log(c.green(`Bot found: `) + c.magenta(`@${username}`));
    console.log("");
    console.log(c.blue("1. Add the bot to your channel"));
    console.log(c.blue("2. Promote the bot to administrator"));
    console.log(c.blue("3. Send any message to the channel, e.g. 'connect'"));
    console.log("");
    console.log(c.blue("Waiting message from channel..."));
    // await rl.question("Press Enter when ready...");

    const chat = await waitForChannel(telegram);
    console.log("\n\n");
    console.log(c.green(`"channelType": `) + c.magenta(`${chat.type}`));
    console.log(c.green(`"name": `) + c.magenta(`${chat.title ?? chat.username}`));
    console.log(c.green(`"chatId": `) + c.magenta(`${chat.id}`));
    console.log("");
    console.log(c.green("Saving chat ID to .env..."));
    await telegram.sendMessage(
      {
        chatId: chat.id,
        text: "✅ Notifygram connected successfully.\n\nSave this chat ID in your .env:\n\n<b><code>TELEGRAM_CHAT_ID=" +
          chat.id +
          "</code></b>",
        parseMode: "HTML",
      }
    );

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
