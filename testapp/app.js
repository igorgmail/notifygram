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
await notifygram.custom({
  kind: "rich",
  title: "Payment failed",
  body: "User payment was declined",
  fields: [
    { label: "Service", value: "payments" },
    { label: "Amount", value: "$49" },
  ],
});
// await main();