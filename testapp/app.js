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
await notifygram.message("Test message");
// await main();