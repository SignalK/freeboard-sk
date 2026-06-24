#!/usr/bin/env node
/**
 * Freeboard-SK perf harness — before/after comparison.
 *
 * Profiles two build dirs (default: builds/baseline vs builds/tier1) under the
 * identical scripted gesture sequence, REPEATS times each (alternating to cancel
 * drift), and reports median metrics + deltas.
 *
 * Spawns the SignalK data feed for the duration. Requires the dockerised SignalK
 * server already up (docker compose up -d).
 *
 * Env:
 *   REPEATS    runs per build      (default 3)
 *   AIS_COUNT  ais targets          (default 50)
 *   BUILD_A/LABEL_A  baseline dir/label (default builds/baseline / baseline)
 *   BUILD_B/LABEL_B  candidate dir/label (default builds/tier1 / tier1)
 *   ZOOM       initial zoom         (default 15)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const REPEATS = Number(process.env.REPEATS || 3);
const AIS_COUNT = Number(process.env.AIS_COUNT || 50);
const ZOOM = process.env.ZOOM || '15';
const VARIANTS = [
  { label: process.env.LABEL_A || 'baseline', dir: process.env.BUILD_A || 'builds/baseline' },
  { label: process.env.LABEL_B || 'tier1', dir: process.env.BUILD_B || 'builds/tier1' }
];

function run(cmd, args, env, label) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: __dir, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve({ out, err }) : reject(new Error(`${label} exited ${code}\n${err.slice(-500)}`))));
    return p;
  });
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (base, cand) => (base === 0 ? 0 : Math.round(((cand - base) / base) * 1000) / 10);

async function main() {
  console.log(`[compare] feed: ${AIS_COUNT} AIS @1Hz | ${REPEATS} repeats/build | zoom ${ZOOM}`);
  const feed = spawn('node', ['sk-feed.mjs'], {
    cwd: __dir,
    env: { ...process.env, DURATION_S: String(60 + REPEATS * VARIANTS.length * 40), AIS_COUNT: String(AIS_COUNT), RATE_HZ: '1', CENTER: '0,0' },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  await new Promise((r) => setTimeout(r, 2500));

  const samples = Object.fromEntries(VARIANTS.map((v) => [v.label, []]));
  let port = 8090;
  for (let i = 0; i < REPEATS; i++) {
    // alternate order each repeat to cancel warm-up/thermal drift
    const order = i % 2 === 0 ? VARIANTS : [...VARIANTS].reverse();
    for (const v of order) {
      const label = `${v.label}-${i}`;
      const outFile = path.join(__dir, 'results', `${label}.json`);
      process.stdout.write(`[compare] run ${label} (port ${port}) ... `);
      await run('node', ['profile.mjs'], {
        BUILD_DIR: path.resolve(__dir, v.dir), LABEL: label, OUT: outFile,
        PORT: String(port++), ZOOM, HEADLESS: 'true'
      }, label);
      const r = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      samples[v.label].push(r);
      console.log(`cdTicks=${r.cdTicks} script=${r.cdp.scriptSec}s gestureMs=${r.gestureMs} longFrames=${r.probe.longFrames} maxFrame=${r.probe.maxFrameMs}ms streams=${r.streamConnections}`);
    }
  }
  try { feed.kill('SIGTERM'); } catch {}

  const agg = (rs) => ({
    cdTicks: median(rs.map((r) => r.cdTicks)),
    scriptSec: median(rs.map((r) => r.cdp.scriptSec)),
    taskSec: median(rs.map((r) => r.cdp.taskSec)),
    layoutSec: median(rs.map((r) => r.cdp.layoutSec)),
    gestureMs: median(rs.map((r) => r.gestureMs)),
    longFrames: median(rs.map((r) => r.probe.longFrames)),
    maxFrameMs: median(rs.map((r) => r.probe.maxFrameMs)),
    fps: median(rs.map((r) => r.probe.fps)),
    longtaskMs: median(rs.map((r) => r.probe.longtasks.totalMs)),
    streams: median(rs.map((r) => r.streamConnections))
  });

  const A = agg(samples[VARIANTS[0].label]);
  const B = agg(samples[VARIANTS[1].label]);
  const rows = [
    ['CD passes during gesture ↓', A.cdTicks, B.cdTicks],
    ['gestureMs (wall, fixed seq ↓)', A.gestureMs, B.gestureMs],
    ['CDP scriptSec ↓', A.scriptSec, B.scriptSec],
    ['CDP taskSec ↓', A.taskSec, B.taskSec],
    ['CDP layoutSec ↓', A.layoutSec, B.layoutSec],
    ['longFrames >32ms ↓', A.longFrames, B.longFrames],
    ['maxFrameMs ↓', A.maxFrameMs, B.maxFrameMs],
    ['fps (probe rAF ↑)', A.fps, B.fps],
    ['longtask totalMs ↓', A.longtaskMs, B.longtaskMs]
  ];
  const out = { repeats: REPEATS, aisCount: AIS_COUNT, variants: VARIANTS.map((v) => v.label), median: { [VARIANTS[0].label]: A, [VARIANTS[1].label]: B } };
  fs.writeFileSync(path.join(__dir, 'results', 'comparison.json'), JSON.stringify(out, null, 2));

  const L0 = VARIANTS[0].label, L1 = VARIANTS[1].label;
  console.log(`\n=== MEDIAN over ${REPEATS} runs (streams ${A.streams}/${B.streams}) ===`);
  console.log(`${'metric'.padEnd(32)} ${L0.padStart(12)} ${L1.padStart(12)}   Δ%`);
  for (const [name, a, b] of rows) {
    console.log(`${name.padEnd(32)} ${String(a).padStart(12)} ${String(b).padStart(12)}   ${pct(a, b) > 0 ? '+' : ''}${pct(a, b)}%`);
  }
  console.log(`\n(↓ lower is better. gestureMs & longFrames are the headline interaction-smoothness metrics.)`);
  console.log(`Absolute values are inflated by headless software-GL; the ${L0}->${L1} delta is the signal.`);
}
main().catch((e) => { console.error('[compare] FAILED', e); process.exit(1); });
