import { createNotifygram } from "../dist/index.js";

const notifygram = createNotifygram({
  // showMeta: false,
  minLevel: "custom",
  meta : {
    service: "Online store",
    // env: null,
    hostname: false,
    // timeStamp: false,
  },
  labels: {
    info: "ИНФО",
    error: "ОШИБКА",
  },
  token: "8438725980:AAH5BjEvpRMVOXVgne4YP1uau6-0TR3GKNE",
  chatId: -1003962530412,
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

// notifygram.info("Test info");
// notifygram.warning("Test warning");
// notifygram.error("Test error");
// notifygram.fatal("Test fatal");
// notifygram.custom(`
// # Footnote with _italic text_ and <u>HTML underline</u>.
// ## Footnote with _italic text_ and <u>HTML underline</u>.
// `);
// await notifygram.message("Test message");

// await notifygram.custom(`
// <h2>You have a new order 💰.</h2>

// <details>
//   summary><h3>Order details</h3></summary>


// </details>


// View details.
// <h3>Heading 3</h3>
// <h4>Heading 4</h4>
// <hr/>
// <ul><li>unordered list item</li></ul>
// <ol><li>ordered list item</li></ol>
// <ol start="3" type="a" reversed><li>ordered list item</li></ol>
// <ol><li value="7" type="i">ordered list item with explicit number</li></ol>


// <hr/>


// <details>
// <summary>Title</summary>

// <table>
// <tr>
// <th>Header 1</th>
// <th>Header 2</th>
// </tr><tr>
// <td>Value 1</td>
// <td>Value 2</td>
// </tr></table>
// <table bordered striped><caption>Table caption</caption>
// <tr><td colspan="2" rowspan="2" align="left">Value</td><td align="center">Value2</td><td align="right">Value3</td></tr>
// <tr>

// </tr>

// </table>

// </details>
// Item. Quantity. Total cost.
// `
// );

const notifygramOrder = createNotifygram({
  // showMeta: false,
  meta : {
    service: "Online store",
    hostname: false,
    // timeStamp: false,
  },
  labels: {
    info: "New order INFO",
    custom: "New order",
  },
  token: "8438725980:AAH5BjEvpRMVOXVgne4YP1uau6-0TR3GKNE",
  chatId: -1003962530412,
});

notifygramOrder.info("New order", { label: "New order INFO" });
notifygramOrder.custom(`
<h2>You have a new order 💰.</h2>
<details>
  <summary>Order details</summary>
  <table bordered striped>
    <tr><th>Item</th><th>Quantity</th><th>Total cost</th></tr>
    <tr>
      <td>Item 1</td>
      <td>2</td>
      <td>100 USD</td>
    </tr>
    <tr>
      <td>Item 2</td>
      <td>1</td>
      <td>50 USD</td>
    </tr>
  </table>
</details>
`, { label: "New order CUSTOM" });
// main();

// main();
// await main();

