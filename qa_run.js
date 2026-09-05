// Entry point for the QA harness. Seeds a demo resume, runs every route at
// every viewport, then runs the functional flows. Persists a JSON summary.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  BACKEND, OUT_DIR, ROUTES, VIEWPORTS, SUMMARY, log, DEMO_BODY,
} = require("./qa_harness");
const { captureRoute } = require("./qa_capture");
const {
  flowSaveLoad, flowAnalyzer, flowAts, flowOptimizer, routeIsolation,
} = require("./qa_flows");
const { QA_USER_FLAG, localDraftInit } = require("./qa_init");

async function newCtx(browser, vp, localInitScript) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(QA_USER_FLAG);
  await ctx.addInitScript(localInitScript);
  return ctx;
}

async function runRoute(browser, route, localInitScript) {
  const results = {};
  for (const vp of VIEWPORTS) {
    const ctx = await newCtx(browser, vp, localInitScript);
    const page = await ctx.newPage();
    log("rendering " + route.id + " @ " + vp.name);
    try {
      results[vp.name] = await captureRoute(page, route, vp);
    } catch (e) {
      results[vp.name] = { error: e.message };
      log("!! " + route.id + "@" + vp.name + " failed:", e.message);
    }
    await ctx.close();
  }
  return results;
}

(async () => {
  let resumeId = null;
  let seeded = null;
  let localInitScript = "";
  try {
    log("Seeding demo resume via the backend...");
    const saveRes = await fetch(BACKEND + "/api/resume/save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-uid": "qa-demo-user",
        "x-user-email": "qa@freegraduates.test",
      },
      body: JSON.stringify(DEMO_BODY),
    });
    if (!saveRes.ok) throw new Error("save failed: HTTP " + saveRes.status);
    const rec = await saveRes.json();
    resumeId = rec.id;
    seeded = rec;
    log("Saved resume id:", resumeId);
    localInitScript = localDraftInit(seeded);

    const browser = await chromium.launch({ headless: true });

    for (const r of ROUTES) {
      SUMMARY.routes[r.id] = await runRoute(browser, r, localInitScript);
    }
    SUMMARY.flows.dashboard_builder = await flowSaveLoad(browser, localInitScript);
    SUMMARY.flows.analyzer          = await flowAnalyzer(browser, localInitScript);
    SUMMARY.flows.ats               = await flowAts(browser, localInitScript);
    SUMMARY.flows.optimizer         = await flowOptimizer(browser, localInitScript);
    SUMMARY.flows.routeIsolation    = await routeIsolation(browser, localInitScript);

    await browser.close();
  } catch (e) {
    SUMMARY.fatalError = e.message;
    log("fatal:", e.message);
  } finally {
    if (resumeId) {
      await fetch(BACKEND + "/api/resume/" + resumeId, {
        method: "DELETE", headers: { "x-user-uid": "qa-demo-user" },
      }).catch(() => {});
    }
    SUMMARY.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify(SUMMARY, null, 2));
    log("done. summary -> qa_out/summary.json");
  }
})();
