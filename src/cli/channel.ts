import type { TelegramApi } from "../telegram.js";
import type { TelegramChat, TelegramUpdate } from "../types/telegram.js";
import { ChatType } from "../types/telegram.js";

const CHANNEL_TIMEOUT_MS = 120_000;

export async function waitForChannel(
  telegram: TelegramApi,
  timeoutMs = CHANNEL_TIMEOUT_MS
): Promise<TelegramChat> {
  const deadline = Date.now() + timeoutMs;

  const initial = await telegram.getUpdates({ offset: -1 });
  const lastUpdateId = initial.result?.at(-1)?.update_id ?? 0;
  let offset = lastUpdateId + 1;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const timeout = Math.min(30, Math.ceil(remaining / 1000));

    if (timeout <= 0) {
      break;
    }

    const response = await telegram.getUpdates({ offset, timeout });
    const updates = response.result ?? [];

    for (const update of updates) {
      offset = update.update_id + 1;
      const chat = extractChat(update);

      if (chat !== undefined) {
        return chat;
      }
    }
  }

  throw new Error(
    "✗ Timeout: no channel event received within 120 seconds.\n" +
      "Make sure the bot was added to the channel and promoted to administrator."
  );
}

function extractChat(update: TelegramUpdate): TelegramChat | undefined {
  if ("channel_post" in update && update.channel_post?.chat.type === ChatType.CHANNEL) {
    return update.channel_post.chat;
  }

  if ("message" in update && update.message?.chat.type === ChatType.SUPERGROUP) {
    return update.message.chat;
  }

  if ("message" in update && update.message?.chat.type === ChatType.GROUP) {
    return update.message.chat;
  }

  if ("message" in update && update.message?.chat.type === ChatType.PRIVATE) {
    return update.message.chat;
  }

  return undefined;
}
