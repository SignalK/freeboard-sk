#!/usr/bin/env node
/**
 * Freeboard-SK perf harness — browser profiler.
 *
 * Serves a built app dir, loads it pointed at the dockerised SignalK server,
 * waits for the live data connection, then runs a DETERMINISTIC pan/zoom/cursor
 * gesture sequence while measuring main-thread cost over the gesture window:
 *   - CDP Performance metrics delta (ScriptDuration / LayoutDuration / RecalcStyle)
 *   - long tasks (count + total blocking ms) via PerformanceObserver
 *   - frame stats (rAF cadence: frames, approx fps, long frames)
 *
 * Tier 1 removes per-frame change detection during interaction, so the gesture
 * window should show markedly less ScriptDuration and fewer/shorter long tasks.
 *
 * Env:
 *   BUILD_DIR  dir to serve            (default ../../public)
 *   PORT       static server port      (default 8087)
 *   SKHOST/SKPORT  SignalK host/port   (default localhost / 3010)
 *   HEADLESS   'true'|'false'          (default true)
 *   LABEL      run label               (default run)
 *   OUT        results json path       (default ./results/<label>.json)
 *   SETTLE_MS  wait after load for connect+render (default 9000)
 *   STUB_TILES stub external map tiles (default true)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(__dir, process.env.BUILD_DIR || '../../public');
const PORT = Number(process.env.PORT || 8087);
const SKHOST = process.env.SKHOST || 'localhost';
const SKPORT = process.env.SKPORT || '3010';
const HEADLESS = (process.env.HEADLESS || 'true') !== 'false';
const LABEL = process.env.LABEL || 'run';
const OUT = process.env.OUT || path.join(__dir, 'results', `${LABEL}.json`);
const SETTLE_MS = Number(process.env.SETTLE_MS || 9000);
const STUB_TILES = (process.env.STUB_TILES || 'true') !== 'false';
const ZOOM = Number(process.env.ZOOM || 15);
const STEADY_MS = Number(process.env.STEADY_MS || 0);
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE || 1); // 1 = none; 6 ~ Pi-class

// The static-app + SignalK-proxy server is shared with the smoke test; see
// serve.mjs (startServer).

// 1x1 gray PNG (base64) used to stub external map tiles for determinism/offline.
const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// In-page probe installed before any app code runs.
const INIT_PROBE = `
window.__perf = (function () {
  let longtasks = [], frames = [], rafOn = false, t0 = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longtasks.push({ start: e.startTime, dur: e.duration });
    });
    po.observe({ entryTypes: ['longtask'] });
  } catch (e) {}
  function loop(ts) { if (!rafOn) return; frames.push(ts); requestAnimationFrame(loop); }
  return {
    mark() { t0 = performance.now(); longtasks = []; frames = []; rafOn = true; requestAnimationFrame(loop); },
    collect() {
      rafOn = false;
      const dur = performance.now() - t0;
      const lt = longtasks.filter((l) => l.start >= t0);
      const ltTotal = lt.reduce((s, l) => s + l.dur, 0);
      let longFrames = 0, deltas = [];
      for (let i = 1; i < frames.length; i++) { const d = frames[i] - frames[i - 1]; deltas.push(d); if (d > 32) longFrames++; }
      const avgFrame = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
      const maxFrame = deltas.length ? Math.max(...deltas) : 0;
      return {
        durationMs: Math.round(dur),
        longtasks: { count: lt.length, totalMs: Math.round(ltTotal) },
        frames: frames.length,
        fps: avgFrame ? Math.round((1000 / avgFrame) * 10) / 10 : 0,
        longFrames,
        maxFrameMs: Math.round(maxFrame)
      };
    }
  };
})();
`;

async function cdpMetrics(client) {
  const { metrics } = await client.send('Performance.getMetrics');
  const m = {};
  for (const e of metrics) m[e.name] = e.value;
  return m;
}

async function run() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const { server, getWsUpgrades } = await startServer(BUILD_DIR, PORT, `http://${SKHOST}:${SKPORT}`);
  console.error(`[profile] serving ${BUILD_DIR} on :${PORT} (proxy -> ${SKHOST}:${SKPORT})  label=${LABEL}  headless=${HEADLESS}`);

  // Headless can't reach the GPU reliably, so we fall back to SwiftShader
  // (software GL) there — but that makes canvas rasterisation CPU-bound and
  // dominate, masking JS-side wins. Run headed (HEADLESS=false) to use the real
  // GPU and get real-world render performance.
  const glArgs = HEADLESS
    ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : [];
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [...glArgs, '--no-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(INIT_PROBE);
  // Suppress the first-run onboarding (welcome dialog -> Settings cascade) by
  // pre-seeding the stored version so checkVersion() resolves to 'current'.
  // Key/namespace from State/LocalStorage; version from app.facade FSK const.
  await context.addInitScript(() => {
    try { localStorage.setItem('freeboard_info', JSON.stringify({ name: 'Freeboard-SK', version: '2.24.0' })); } catch (e) {}
  });

  if (STUB_TILES) {
    // stub external raster map tiles (osm/openseamap/etc.) for determinism
    await context.route(/tile\.|tiles\.|\.tile\.|\/tiles\//i, (route) => {
      const url = route.request().url();
      if (/\.png|\.jpg|\.jpeg|\.webp/i.test(url)) return route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG });
      return route.continue();
    });
  }

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  // Simulate low-power hardware (e.g. a Raspberry Pi / tablet) so change-detection
  // overhead actually competes for the main thread, the way it does on the devices
  // freeboard-sk commonly runs on.
  if (CPU_THROTTLE > 1) {
    await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
    console.error(`[profile] CPU throttled ${CPU_THROTTLE}x`);
  }

  // same origin as the proxy => no host/port params, no CORS.
  // perfprobe => main.ts installs window.__cd (change-detection pass counter).
  const url = `http://localhost:${PORT}/?movemap=0&northup=1&zoom=${ZOOM}&perfprobe=1`;
  console.error(`[profile] loading ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // wait for the OL map canvas to exist, then settle for connect + data + render
  await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => console.error('[profile] no canvas yet'));
  console.error(`[profile] settling ${SETTLE_MS}ms for connect + data...`);
  await page.waitForTimeout(SETTLE_MS);

  // Fallback only: the localStorage seed should prevent any first-run dialog.
  // If one slipped through (e.g. app version drifted from the seed), close it
  // without triggering the Settings cascade.
  let dialogPresent = false;
  try {
    if (await page.locator('mat-dialog-container').count()) {
      dialogPresent = true;
      // close via the dialog's close (X) button if present, else Escape
      const x = page.locator('mat-dialog-container').getByRole('button', { name: /close/i }).first();
      if (await x.isVisible({ timeout: 500 }).catch(() => false)) await x.click().catch(() => {});
      else await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    }
  } catch {}
  await page.waitForTimeout(600);

  const canvasCount = await page.locator('canvas').count();
  await page.screenshot({ path: path.join(path.dirname(OUT), `${LABEL}.png`) }).catch(() => {});

  // locate map centre (viewport)
  const cx = 700, cy = 450;

  // ---- optional steady-state window (no interaction): isolates the per-tick
  // data->render cost (e.g. AIS re-styling) from interaction. ----
  let steady = null;
  if (STEADY_MS > 0) {
    const sBefore = await cdpMetrics(client);
    await page.evaluate(() => window.__perf.mark());
    await page.waitForTimeout(STEADY_MS);
    const sProbe = await page.evaluate(() => window.__perf.collect());
    const sAfter = await cdpMetrics(client);
    steady = {
      windowMs: STEADY_MS,
      scriptSec: +(sAfter.ScriptDuration - sBefore.ScriptDuration).toFixed(3),
      longtasks: sProbe.longtasks,
      longFrames: sProbe.longFrames,
      maxFrameMs: sProbe.maxFrameMs
    };
    console.error(`[profile] steady: scriptSec=${steady.scriptSec} longFrames=${steady.longFrames} maxFrameMs=${steady.maxFrameMs} longtasks=${steady.longtasks.count}`);
  }

  // ---- measured gesture window ----
  const before = await cdpMetrics(client);
  await page.evaluate(() => window.__perf.mark());
  const cdBefore = await page.evaluate(() => (typeof window.__cd === 'number' ? window.__cd : -1));
  const gestureStart = Date.now();

  // 1) cursor moves across the map (pointermove storm)
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(cx - 300 + i * 15, cy - 150 + Math.sin(i / 3) * 120);
    await page.waitForTimeout(15);
  }
  // 2) drag-pan in 4 directions
  const drags = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const [dx, dy] of drags) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let s = 1; s <= 20; s++) {
      await page.mouse.move(cx + dx * s * 12, cy + dy * s * 12);
      await page.waitForTimeout(10);
    }
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
  // 3) zoom in/out with wheel
  for (let i = 0; i < 6; i++) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, -240); await page.waitForTimeout(160); }
  for (let i = 0; i < 6; i++) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, 240); await page.waitForTimeout(160); }

  const cdAfter = await page.evaluate(() => (typeof window.__cd === 'number' ? window.__cd : -1));
  const probe = await page.evaluate(() => window.__perf.collect());
  const after = await cdpMetrics(client);
  const gestureMs = Date.now() - gestureStart;
  const cdTicks = cdBefore >= 0 && cdAfter >= 0 ? cdAfter - cdBefore : -1;

  const dScript = +(after.ScriptDuration - before.ScriptDuration).toFixed(3);
  const dLayout = +(after.LayoutDuration - before.LayoutDuration).toFixed(3);
  const dRecalc = +(after.RecalcStyleDuration - before.RecalcStyleDuration).toFixed(3);
  const dTask = +(after.TaskDuration - before.TaskDuration).toFixed(3);

  const result = {
    label: LABEL,
    buildDir: BUILD_DIR,
    gestureMs,
    canvasCount,
    dialogPresent,
    streamConnections: getWsUpgrades(),
    cdTicks,
    steady,
    cdp: { scriptSec: dScript, layoutSec: dLayout, recalcStyleSec: dRecalc, taskSec: dTask },
    probe,
    consoleErrorCount: consoleErrors.length,
    consoleErrorsSample: consoleErrors.slice(0, 5)
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.error('[profile] result:');
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
  server.close();
}

run().catch((e) => { console.error('[profile] FAILED', e); process.exit(1); });
