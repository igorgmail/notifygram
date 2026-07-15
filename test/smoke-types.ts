import {
  ConfigError,
  TelegramApiError,
  TelegramNetworkError,
  createNotifygram,
} from "notifygram";

import type {
  CustomMessageMode,
  LogLevel,
  NotifygramCustomMessageOptions,
  NotifygramMessageOptions,
  NotifygramOptions,
} from "notifygram";

const level: LogLevel = "error";
const customMode: CustomMessageMode = "html";

const options: NotifygramOptions = {
  token: "123456:test-token",
  chatId: "-1001234567890",
  minLevel: level,
  meta: {
    service: "smoke-test",
    env: "test",
    hostname: false,
    timeStamp: false,
  },
};

const messageOptions: NotifygramMessageOptions = {
  label: "Smoke",
};

const customOptions: NotifygramCustomMessageOptions = {
  mode: customMode,
};

const notifygram = createNotifygram(options);
void notifygram.message("type smoke", messageOptions);
void notifygram.custom("<b>type smoke</b>", customOptions);

void ConfigError;
void TelegramApiError;
void TelegramNetworkError;
