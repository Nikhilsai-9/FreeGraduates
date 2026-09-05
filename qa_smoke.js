// Quick smoke test to confirm Playwright works in this environment.
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (msg) => console.log("[browser]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));
  try {
    await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log("UA:", await page.evaluate(() => navigator.userAgent));
    console.log("OK");
  } catch (e) {
    console.error("FAIL:", e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
