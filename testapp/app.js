/**
 * Example application demonstrating NotifyGram usage.
 */

import { createNotifygram, Notifygram } from "../dist/index.js";

const notifygram = createNotifygram({
  meta : {
    service: "Online store",
    hostname: false,
  },
  labels: {
    custom: "Order",
  }
});

notifygram.info("Test message");
notifygram.custom(`
  <b>Test message</b>
  <i>Test message</i>
  <u>Test message</u>
  <s>Test message</s>
  <code>Test message</code>
  <pre>Test message</pre>
  <blockquote>Test message</blockquote>
  <a href="https://www.google.com">Test message</a>
  `, {
    parse_mode: "HTML",
  });
