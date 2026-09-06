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
  let keywordsText = "";
  for (const t of ["Keywords", "Sections", "Recommendations"]) {
    await page.locator(`.az-tab:has-text("${t}")`).first().click().catch(() => null);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "flow_analyzer_" + t.toLowerCase() + ".png"), fullPage: true });
    tabShots[t] = true;
    // Capture the body's text WHILE on each tab — the Keywords tab is the
    // only one that exposes the "Matched / Missing" sections, so the original
    // snapshot (taken after the loop) was reading the Recommendations tab.
    if (t === "Keywords") {
      keywordsText = await page.evaluate(() => document.body.innerText);
    }
  }

  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  // hasKeywords is evaluated against the Keywords-tab snapshot, not the
  // final (Recommendations) tab snapshot.
  const keywordsMatched = /Matched/i.test(keywordsText) && /Missing/i.test(keywordsText);
  return {
    hasScore: /Resume Score/i.test(text) && /\d+\s*\/\s*100/.test(text),
    hasKeywords: keywordsMatched,
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
  // The ATS scanner auto-runs on mount (see AtsScannerView useEffect), so wait
  // for the auto-fired POST /api/resume/ats-check round-trip before we snapshot.
  await page.waitForResponse(
    (r) => r.url().includes("/api/resume/ats-check") && r.status() === 200,
    { timeout: 20000 }
  ).catch(() => null);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_ats.png"), fullPage: true });

  // The re-check button (Re-check, not Scan) triggers another round-trip.
  let scanFired = false;
  const reCheckBtn = page.locator("button:has-text(\"Re-check\")").first();
  if (await reCheckBtn.count()) {
    const respPromise = page
      .waitForResponse(
        (r) => r.url().includes("/api/resume/ats-check") && r.status() === 200,
        { timeout: 20000 }
      )
      .then(() => true)
      .catch(() => false);
    await reCheckBtn.click().catch(() => {});
    scanFired = await respPromise;
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
  await page.waitForTimeout(1000);

  // End-to-end: fill the form, create an optimization, then tailor it. The
  // diff/change-list UI only appears AFTER "Tailor to JD" runs, so the
  // original assertion was always going to read empty state.
  const jdSample =
    "We are hiring a Software Engineer to build scalable backend services. " +
    "Requirements: 3+ years with React, Node.js, and PostgreSQL; experience " +
    "shipping production features; comfort with CI/CD pipelines and cloud " +
    "infrastructure. Nice to have: TypeScript, AWS, containerization.";
  const jdTextarea = page.locator('textarea').first();
  await jdTextarea.fill(jdSample).catch(() => null);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_optimizer_form.png"), fullPage: true });

  // Click "Create optimization" and wait for the create round-trip.
  const createBtn = page.locator('button:has-text("Create optimization")').first();
  const createdPromise = page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/resume-optimizer") &&
        r.request().method() === "POST" &&
        !r.url().match(/\/(analyze|tailor)$/) &&
        r.status() === 200,
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);
  await createBtn.click().catch(() => null);
  const created = await createdPromise;
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_optimizer_created.png"), fullPage: true });

  // Click "Tailor to JD" — this is what actually surfaces the diff/change
  // list UI ("Diff against the original resume:" + changesApplied <li> items).
  const tailorBtn = page.locator('button:has-text("Tailor to JD")').first();
  const tailoredPromise = page
    .waitForResponse(
      (r) => r.url().includes("/tailor") && r.request().method() === "POST" && r.status() === 200,
      { timeout: 60000 }
    )
    .then(() => true)
    .catch(() => false);
  await tailorBtn.click().catch(() => null);
  const tailored = await tailoredPromise;
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "flow_optimizer_tailored.png"), fullPage: true });

  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  // "Diff against the original resume:" header appears in OptimizerView once
  // active.tailoredCandidate is set. We also accept Approve/Accept/Reject in
  // case a future variant adds them.
  const diffLike =
    /diff\s+against/i.test(text) ||
    /changes\s*applied/i.test(text) ||
    /Approve|Accept|Reject/i.test(text);
  return { diffLike, created, tailored, errs };
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
