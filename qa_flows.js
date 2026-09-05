// Functional flow tests
const path = require("path");
const { FRONTEND, OUT_DIR, log } = require("./qa_harness");
const { QA_USER_FLAG } = require("./qa_init");

async function newCtx(browser, localInitScript) {
  // QA bypass auth skips Firebase entirely. We still attach QA_USER_FLAG so
  // DOM-level assertions can confirm the active user. The seeded localStorage
  // draft is attached second so the Dashboard sees real content immediately.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(QA_USER_FLAG);
  if (localInitScript) await ctx.addInitScript(localInitScript);
  return ctx;
}

async function attachLoggers(page, errs) {
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
}

async function flowSaveLoad(browser, localInitScript) {
  const ctx = await newCtx(browser, localInitScript);
  const page = await ctx.newPage();
  const errs = [];
  await attachLoggers(page, errs);

  log("flow: open /dashboard");
  await page.goto(FRONTEND + "/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_dashboard.png"), fullPage: true });

  log("flow: open /builder/new?path=form and verify preview");
  await page.goto(FRONTEND + "/builder/new?template=classic&path=form", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_builder.png"), fullPage: true });
  const previewInfo = await page.evaluate(() => {
    const sheet = document.querySelector(".fg-rb__sheet-wrap");
    if (!sheet) return { sheetPresent: false };
    const rect = sheet.getBoundingClientRect();
    return {
      sheetPresent: true,
      sheetWidthPx: rect.width,
      sheetHeightPx: rect.height,
      bodyScrollWidth: document.body.scrollWidth,
      windowWidth: window.innerWidth,
    };
  });
  // Verify the start screen was skipped — we should NOT see the "How would
  // you like to start?" headline on a ?path=form URL.
  const sawStartHeadline = await page.locator("text=How would you like to start?").count();
  const startedOnForm = sawStartHeadline === 0;
  await ctx.close();
  return { previewInfo, startedOnForm, errs };
}

async function flowAnalyzer(browser, localInitScript) {
  const ctx = await newCtx(browser, localInitScript);
  const page = await ctx.newPage();
  const errs = [];
  await attachLoggers(page, errs);

  log("flow: open /analyzer");
  await page.goto(FRONTEND + "/analyzer", { waitUntil: "networkidle" });
  await page.waitForResponse(
    (r) => r.url().includes("/api/resume/analyze") && r.status() === 200,
    { timeout: 20000 }
  ).catch(() => null);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_analyzer_overview.png"), fullPage: true });

  const tabShots = {};
  for (const t of ["Keywords", "Sections", "Recommendations"]) {
    await page.locator(`.az-tab:has-text("${t}")`).first().click().catch(() => null);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "flow_analyzer_" + t.toLowerCase() + ".png"), fullPage: true });
    tabShots[t] = true;
  }

  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  return {
    hasScore: /Resume Score/i.test(text) && /\d+\s*\/\s*100/.test(text),
    hasKeywords: /Matched/i.test(text) && /Missing/i.test(text),
    hasNoFakeNames: !/Nikhil Sai|Engineered\s+scalable\s+REST\s+APIs/i.test(text),
    tabShots, errs,
  };
}

async function flowAts(browser, localInitScript) {
  const ctx = await newCtx(browser, localInitScript);
  const page = await ctx.newPage();
  const errs = [];
  await attachLoggers(page, errs);

  log("flow: open /ats-scanner");
  await page.goto(FRONTEND + "/ats-scanner", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_ats.png"), fullPage: true });

  let scanFired = false;
  const scanBtn = page.locator("button:has-text(\"Scan\")").first();
  if (await scanBtn.count()) {
    await scanBtn.click().catch(() => {});
    scanFired = await page.waitForResponse(
      (r) => r.url().includes("/api/resume/ats-check") && r.status() === 200,
      { timeout: 20000 }
    ).then(() => true).catch(() => false);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "flow_ats_after_scan.png"), fullPage: true });
  }
  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  return { scanFired, noFake: !/96\s*%.*ATS/i.test(text), errs };
}

async function flowOptimizer(browser, localInitScript) {
  const ctx = await newCtx(browser, localInitScript);
  const page = await ctx.newPage();
  const errs = [];
  await attachLoggers(page, errs);

  log("flow: open /optimizer");
  await page.goto(FRONTEND + "/optimizer", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_optimizer.png"), fullPage: true });

  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  return { diffLike: /Approve|Accept|Reject|diff/i.test(text), errs };
}

async function routeIsolation(browser, localInitScript) {
  const ctx = await newCtx(browser, localInitScript);
  const page = await ctx.newPage();
  const out = {};
  for (const r of ["/analyzer", "/ats-scanner", "/optimizer"]) {
    await page.goto(FRONTEND + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    out[r] = await page.evaluate(() => {
      const root = document.querySelector(".unified-view-content-area");
      return root ? root.innerText.slice(0, 400) : "";
    });
  }
  await ctx.close();
  return out;
}

module.exports = {
  flowSaveLoad, flowAnalyzer, flowAts, flowOptimizer, routeIsolation,
};
