import { createNotifygram } from "../dist/src/index.js";

const notifygram = createNotifygram({
  // showMeta: false,
  minLevel: "",
  meta : {
    service: "Service testapp",
    // env: null,
    hostname: null,
    // timeStamp: false,
  },
  // labels: {
  //   info: "ИНФО",
  //   error: "ОШИБКА",
  // },
});

async function main() {
  // await notifygram.warning("Test app warning");

  try {
    throw new Error("Test error");
  } catch (error) {
    await notifygram.error(error);
  }

  await notifygram.flush();
}

notifygram.info("Test info");
// notifygram.warning("Test warning");
notifygram.error("Test error");
// notifygram.fatal("Test fatal");
// notifygram.custom(`
// # Footnote with _italic text_ and <u>HTML underline</u>.
// ## Footnote with _italic text_ and <u>HTML underline</u>.
// `);
// await notifygram.message("Test message");
await notifygram.custom(`

  | Metric | Value |
  |:-------|------:|
  | Speed  | **42** <sup>ms</sup> |
  | Status | <tg-spoiler>ready</tg-spoiler> |
`
);
// main();
// main();
// await main();

