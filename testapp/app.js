import { createNotifygram } from "../dist/src/index.js";

const notifygram = createNotifygram({
  service: "Service testapp",
  env: "development",
  minLevel: "message"
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
// await notifygram.message("Test message");
await notifygram.custom(`

  | Metric | Value |
  |:-------|------:|
  | Speed  | **42** <sup>ms</sup> |
  | Status | <tg-spoiler>ready</tg-spoiler> |
  
  [^note]: Footnote with _italic text_ and <u>HTML underline</u>.
`
);
// await main();

