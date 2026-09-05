// Per-route browser capture
const path = require("path");
const { FRONTEND, OUT_DIR, VIEWPORTS, log } = require("./qa_harness");

async function captureRoute(page, route, vp) {
  const url = `${FRONTEND}${route.path}`;
  const consoleErrors = [];
  const failedRequests = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onReqFail = (req) => {
    const u = req.url();
    if (!u.startsWith("chrome-extension") && !u.includes("/__vite_ping")) {
      failedRequests.push({ url: u, failure: req.failure() && req.failure().errorText });
    }
  };
  page.on("console", onConsole);
  page.on("requestfailed", onReqFail);

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    log(`warn: ${route.id}@${vp.name} networkidle timeout, continuing…`);
  }
  await page.waitForTimeout(1500);

  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    return {
      docScrollWidth: docW,
      bodyScrollWidth: document.body.scrollWidth,
      windowWidth: winW,
      overflow: docW > winW + 1,
      overflowAmount: docW - winW,
    };
  });

  const file = path.join(OUT_DIR, `${route.id}_${vp.name}.png`);
  await page.screenshot({ path: file, fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText || "");
  page.off("console", onConsole);
  page.off("requestfailed", onReqFail);
  return { overflow, consoleErrors, failedRequests, file, bodyText };
}

async function runOne(browser, route) {
  const results = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    log(`rendering ${route.id} @ ${vp.name}…`);
    try {
      results[vp.name] = await captureRoute(page, route, vp);
    } catch (e) {
      results[vp.name] = { error: e.message };
      log(`!! ${route.id}@${vp.name} failed:`, e.message);
    }
    await ctx.close();
  }
  return results;
}

module.exports = { captureRoute, runOne };
