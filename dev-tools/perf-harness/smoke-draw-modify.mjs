#!/usr/bin/env node
/**
 * Freeboard-SK — draw/modify functional smoke test.
 *
 * Drives the real draw + modify plumbing end-to-end against the dockerised
 * SignalK server and asserts it still works and still triggers change detection:
 *   1. Draw Route  -> draws a 3-point route (onDrawEnd).
 *   2. click route -> popover -> MODIFY -> enters modify mode.
 *   3. drag a vertex + release (onModifyEnd) -> the app schedules a
 *      change-detection pass (measured via window.__cd, the ?perfprobe CD-pass
 *      counter installed in main.ts) and does not accidentally pan (the map
 *      centre is unchanged, i.e. the vertex grab hit).
 *
 * Scope / what it does NOT prove: this is a FUNCTIONAL guard, not a strict
 * regression test for the onDrawEnd/onModifyEnd ngZone.run change. With the map
 * host on default change detection (its current strategy), any CD pass re-checks
 * the whole tree, and the draw/modify flows already trigger one (a save dialog
 * attaches a view; a route draft / live-measure writes a signal on release), so
 * this passes with or without that ngZone.run wrap. It catches the flows
 * breaking outright, or zone containment regressing so far that a modify
 * schedules NO change detection at all. It becomes a true RED/GREEN guard for
 * that specific fix only if the host is switched to OnPush.
 *
 * The server runs quiescent (no sk-feed) so background data doesn't drive CD.
 *
 * Env:
 *   BUILD_DIR  built app dir to serve  (default ../../public)
 *   PORT       static server port      (default 8091)
 *   SKHOST/SKPORT  SignalK host/port   (default localhost / 3010)
 *   HEADLESS   'true'|'false'          (default true)
 *
 * Exit 0 = flows drove and a modify scheduled a CD pass. Exit 1 = a flow broke
 * or no CD pass fired. Prereqs: a built app in BUILD_DIR (built with the
 * ?perfprobe hook, i.e. current main.ts) and the dockerised SignalK server
 * running (see performance-testing.md / docker-compose.yml).
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
// The app shows a first-run / "what's new" dialog unless the stored version
// matches the current one, so seed the exact app version (its single source of
// truth is the root package.json — same as the app reads).
const APP_VERSION = JSON.parse(
  readFileSync(path.resolve(__dir, '../../package.json'), 'utf8')
).version;
const BUILD_DIR = path.resolve(__dir, process.env.BUILD_DIR || '../../public');
const PORT = Number(process.env.PORT || 8091);
const SKHOST = process.env.SKHOST || 'localhost';
const SKPORT = process.env.SKPORT || '3010';
const HEADLESS = (process.env.HEADLESS || 'true') !== 'false';

const log = (...a) => console.error('[smoke]', ...a);
const cd = (page) => page.evaluate(() => window.__cd);
// Wait until the change-detection counter stops advancing for `quietMs` (initial
// connect/render churn settles well before we measure). Returns true if it went
// quiet, false on timeout.
async function waitForQuiet(page, quietMs = 500, timeoutMs = 8000) {
  let last = await cd(page);
  let quietSince = Date.now();
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(100);
    const now = await cd(page);
    if (now === last) {
      if (Date.now() - quietSince >= quietMs) return true;
    } else {
      last = now;
      quietSince = Date.now();
    }
  }
  return false;
}
// The "Lat: .. Lon: .. Zm: .." status readout — used to detect an accidental
// map pan (which would mean the vertex grab missed).
const centre = (page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) =>
      /^Lat:.*Lon:.*Zm:/.test((e.textContent || '').trim())
    );
    return el ? el.textContent.trim() : '';
  });

async function connect(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  // wait for the SignalK connection (the draw tools are disabled until connected)
  for (let i = 0; i < 40; i++) {
    const disconnected = await page
      .locator('body')
      .innerText()
      .then((t) => t.includes('Unable to contact Signal K'))
      .catch(() => true);
    if (!disconnected) break;
    await page.waitForTimeout(500);
  }
  // dismiss a first-run dialog if one slipped past the version seed
  if (await page.locator('mat-dialog-container').count()) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function drawRoute(page, P1, P2, P3) {
  await page
    .locator('button')
    .filter({ has: page.locator('mat-icon', { hasText: 'edit' }) })
    .first()
    .click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: 'Draw Route' }).click();
  await page.waitForTimeout(300);
  await page.mouse.click(...P1);
  await page.waitForTimeout(180);
  await page.mouse.click(...P2);
  await page.waitForTimeout(180);
  await page.mouse.click(...P3);
  await page.waitForTimeout(180);
  await page.mouse.dblclick(...P3);
  await page.waitForTimeout(700);
}

async function enterModify(page, routeLinePoint) {
  await page.mouse.click(...routeLinePoint); // open the route popover
  await page.waitForTimeout(600);
  const modify = page.getByRole('button', { name: /modify/i }).first();
  if (!(await modify.count())) throw new Error('route popover / MODIFY button not found');
  await modify.click();
  await page.waitForTimeout(600);
  const inModify = (await page.locator('body').innerText()).includes('FINISH');
  if (!inModify) throw new Error('did not enter modify mode (no FINISH control)');
}

// Drag the vertex from -> to, hold it still, then release; return the __cd delta
// caused by the release (pointerup -> modifyend -> onModifyEnd).
async function measureModifyEndCd(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.waitForTimeout(120);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      Math.round(from[0] + ((to[0] - from[0]) * i) / steps),
      Math.round(from[1] + ((to[1] - from[1]) * i) / steps)
    );
    await page.waitForTimeout(25);
  }
  // vertex held still: wait for the drag's pointer-move CD passes to fully
  // settle so `before` is read during a quiescent window
  const quiet = await waitForQuiet(page);
  const centreBefore = await centre(page);
  const before = await cd(page);
  await page.mouse.up(); // -> modifyend -> onModifyEnd
  await page.waitForTimeout(800);
  const after = await cd(page);
  const centreAfter = await centre(page);
  return { before, after, delta: after - before, centreBefore, centreAfter, quiet };
}

async function run() {
  const { server } = await startServer(BUILD_DIR, PORT, `http://${SKHOST}:${SKPORT}`);
  log(`serving ${BUILD_DIR} on :${PORT} (SignalK proxy -> ${SKHOST}:${SKPORT})`);
  const browser = await chromium.launch({ headless: HEADLESS, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  // suppress the first-run / what's-new onboarding dialog
  await context.addInitScript((v) => {
    try {
      localStorage.setItem('freeboard_info', JSON.stringify({ name: 'Freeboard-SK', version: v }));
    } catch {
      /* ignore */
    }
  }, APP_VERSION);
  const page = await context.newPage();

  let exitCode = 1;
  try {
    // host/port pin the app to the same-origin proxy; perfprobe installs window.__cd
    const url = `http://localhost:${PORT}/?movemap=0&northup=1&zoom=15&perfprobe=1&host=localhost&port=${PORT}`;
    await connect(page, url);
    if ((await cd(page)) === undefined)
      throw new Error('window.__cd missing — build lacks the ?perfprobe hook (main.ts)');

    // quiescent baseline: __cd should be ~stable when idle (nothing else driving CD)
    const idle0 = await cd(page);
    await page.waitForTimeout(1500);
    const idleRate = (await cd(page)) - idle0;
    log(`idle CD passes over 1.5s: ${idleRate}`);

    const box = await page.locator('canvas').first().boundingBox();
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    const P1 = [cx - 140, cy - 40];
    const P2 = [cx, cy + 30]; // middle vertex we will drag
    const P3 = [cx + 140, cy - 20];
    const routeLine = [Math.round((P1[0] + P2[0]) / 2), Math.round((P1[1] + P2[1]) / 2)];

    await drawRoute(page, P1, P2, P3);
    await enterModify(page, routeLine);
    const r = await measureModifyEndCd(page, P2, [P2[0] - 90, P2[1] + 110]);

    log(`modify: __cd ${r.before} -> ${r.after} (delta ${r.delta})`);
    log(`centre before: "${r.centreBefore}"  after: "${r.centreAfter}"`);
    if (!r.quiet)
      log('WARN: change detection did not fully settle before the release — result may be noisy.');
    if (r.centreBefore && r.centreBefore !== r.centreAfter)
      log('WARN: map centre changed during the vertex drag — the grab may have panned instead of grabbing the vertex.');

    if (r.delta >= 1) {
      log('PASS: draw + modify drove end-to-end and releasing the vertex scheduled a change-detection pass.');
      exitCode = 0;
    } else {
      log('FAIL: modify end scheduled NO change-detection pass — the draw/modify flow or zone containment is broken.');
      exitCode = 1;
    }
  } catch (e) {
    log('ERROR', e.message);
    await page.screenshot({ path: path.join(__dir, 'results', 'smoke-failure.png') }).catch(() => {});
    exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exitCode);
}

run();
