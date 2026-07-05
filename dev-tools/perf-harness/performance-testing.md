# Freeboard-SK Performance Testing

An automated, reproducible harness for profiling Freeboard-SK under a realistic
live SignalK data stream, and for measuring the effect of a change with a
**before/after comparison**.

Everything lives in `dev-tools/perf-harness/`. It is self-contained (its own
`package.json`) and does not touch the main project's dependencies.

---

## What it does

1. Runs a **SignalK server in Docker** (open/no-auth) as the data backend.
2. Feeds it a **controllable synthetic data stream** — one self vessel plus _N_
   AIS targets moving deterministically — over the SignalK WebSocket.
3. Loads the **built app** in headless Chromium (Playwright) through a
   same-origin reverse proxy, waits for the live connection, and runs a fixed,
   deterministic **pan / zoom / cursor gesture sequence**.
4. Measures main-thread cost over the gesture window and writes JSON + a
   screenshot.
5. `compare.mjs` profiles **two build variants** (e.g. baseline vs your change)
   and prints median metrics with deltas.

### Metrics collected

| Metric | Meaning | Direction |
|---|---|---|
| `cdTicks` | Angular change-detection passes during the gesture (needs the probe, see below) | lower = better |
| `cdp.scriptSec` | Main-thread JS time during the gesture (CDP `ScriptDuration`) | lower |
| `cdp.taskSec` / `layoutSec` | Total task / layout time (CDP) | lower |
| `gestureMs` | Wall-clock for the fixed gesture sequence (jank stretches it) | lower |
| `probe.longFrames` | rAF frames > 32 ms (dropped frames) | lower |
| `probe.maxFrameMs` | Worst single frame gap | lower |
| `probe.fps` | Probe rAF cadence | higher |
| `streamConnections` | WS stream connections (should be `1` = connected) | — |

> **Run headed for render/frame measurements.** Headless Chromium forces
> **software GL** (SwiftShader), so OpenLayers canvas rasterisation is far slower
> than on a real GPU and dominates the absolute timings — it both masks JS-side
> wins and inflates frame times. Use `HEADLESS=false` (real GPU), and
> `CPU_THROTTLE=6` to emulate the low-power hardware Freeboard targets. The app
> also sets `[enableAnimation]="false"`, so there is no multi-frame zoom
> animation. `cdTicks` is render-independent and the cleanest change-detection
> metric in any mode. (We learned this the hard way — see the methodology caveat
> in the Tier-1 results below.)

---

## Prerequisites

- **Docker** (with the daemon running) and Docker Compose.
- **Node** 20+ (uses the global `WebSocket`, available in Node 22+).
- The main app's dependencies installed at the repo root (`npm ci`) so you can
  `npm run build`.

## One-time setup

```bash
cd dev-tools/perf-harness
npm install                 # playwright + http-proxy
npx playwright install chromium
docker compose up -d        # SignalK server on http://localhost:3010
```

Verify the server is up and open:

```bash
curl -s http://localhost:3010/skServer/loginStatus
# => "authenticationRequired":false
```

The server is seeded entirely at runtime by the data generator (below). Security
is disabled via a compose `entrypoint` override (the stock image hardcodes
`--securityenabled`); see `docker-compose.yml`.

---

## Seeding data

`sk-feed.mjs` pushes deltas over the SignalK WS. It is deterministic (no RNG), so
runs are repeatable.

```bash
# 1 self vessel + 50 AIS targets at 1 Hz, centred on [0,0], for 240s
DURATION_S=240 AIS_COUNT=50 RATE_HZ=1 CENTER=0,0 node sk-feed.mjs
```

| Env | Default | Notes |
|---|---|---|
| `AIS_COUNT` | 20 | number of AIS targets (scale this for AIS-stress tests) |
| `RATE_HZ` | 1 | position updates/sec per vessel |
| `DURATION_S` | 0 | seconds to run (0 = forever) |
| `CENTER` | `0,0` | `"lon,lat"` — `0,0` matches the app's default map centre |
| `SK_URL` | `ws://localhost:3010/...` | SignalK stream URL |

`compare.mjs` starts and stops the feed for you; you only run `sk-feed.mjs`
directly when profiling a single build by hand.

---

## Building the two variants

`build-variants.sh` builds the current working tree as `builds/candidate` and the
tree with tracked changes **stashed** as `builds/baseline` (then restores and
rebuilds). It only stashes tracked `src/` changes — the harness under
`dev-tools/` is left alone.

```bash
./build-variants.sh
# => dev-tools/perf-harness/builds/baseline  and  dev-tools/perf-harness/builds/candidate
```

(You can also point the tools at any pre-built directory.)

---

## Running

### Single build

```bash
DURATION_S=120 AIS_COUNT=50 CENTER=0,0 node sk-feed.mjs &   # start the feed
LABEL=mybuild BUILD_DIR=../../public ZOOM=15 node profile.mjs   # writes results/mybuild.json + .png
```

| Env | Default | Notes |
|---|---|---|
| `BUILD_DIR` | `../../public` | built app dir to serve |
| `ZOOM` | 15 | initial map zoom |
| `SETTLE_MS` | 9000 | wait after load for connect + first render |
| `HEADLESS` | true | `false` runs **headed on the real GPU** — use this for render/frame measurements (see caveat above); headless forces SwiftShader |
| `CPU_THROTTLE` | 1 | CDP CPU slowdown factor; `6` ≈ a Raspberry Pi / tablet (the low-power hardware Freeboard targets) |
| `STEADY_MS` | 0 | if > 0, also measure a no-interaction window of this length (isolates per-tick data→render cost from interaction) |
| `STUB_TILES` | true | serve a stub tile for external map tiles (offline + deterministic) |

The profiler suppresses the first-run onboarding (by pre-seeding the stored app
version in `localStorage`) and centres the fleet, then runs the gesture sequence.
Check `results/<label>.png` to confirm the fleet rendered.

### Before / after comparison

```bash
REPEATS=3 AIS_COUNT=50 node compare.mjs
```

Profiles `builds/baseline` vs `builds/tier1` (override with `BUILD_A`/`BUILD_B`
and `LABEL_A`/`LABEL_B`), `REPEATS` times each (alternating to cancel drift),
prints a median table, and writes `results/comparison.json`.

---

## The CD-tick probe

`cdTicks` requires a tiny probe that counts zone-driven change-detection
triggers. It is guarded by the `perfprobe` URL flag (the profiler adds
`&perfprobe=1`) and is **inert** otherwise:

```ts
// src/main.ts — bootstrap .then((appRef) => ...)
if (location.search.includes('perfprobe')) {
  const zone = appRef.injector.get(NgZone);
  (window as any).__cd = 0;
  zone.onMicrotaskEmpty.subscribe(() => (window as any).__cd++);
}
```

> Note: hook `NgZone.onMicrotaskEmpty`, **not** `ApplicationRef.tick()` —
> Angular's zone CD scheduler bypasses the public `tick()`, so overriding it
> counts nothing. `onMicrotaskEmpty` fires on each zone drain, which is the cue
> the scheduler uses to run CD, so it tracks CD frequency faithfully. This is
> also why the metric shows Tier 1's effect so clearly: moving OpenLayers events
> and the render loop out of the zone removes those drains entirely.

**This probe is a measurement tool, not a product change — remove it before
committing.** Both variants must be built with it for `cdTicks` to be comparable
(when measuring a code change, add the probe to `main.ts`, build the candidate,
then build the baseline with the probe applied on top of the stashed tree).
Without the probe, `cdTicks` is reported as `-1` and the other metrics still work.

---

## Results — Tier 1 (change-detection containment)

**Architectural metric** (render-independent) — change-detection passes during
the gesture, counted via `NgZone.onMicrotaskEmpty`:

| metric | baseline | tier1 | Δ |
|---|---:|---:|---:|
| **CD passes during gesture** | **1103** | **271** | **−75%** |

The OpenLayers render loop and pointer handlers no longer drive app-wide change
detection. Per-run values were tight (baseline 1140/1076/1103 vs 268/313/271).

**Real-world effect** (headed, real GPU — `HEADLESS=false`). Each CD pass is cheap
(the map subtree is OnPush), so the 75% reduction is a modest main-thread saving,
not a dramatic frame win:

| scenario | metric | baseline | tier1 |
|---|---|---:|---:|
| fast desktop, 300 AIS | gesture scriptSec | 2.35 | 2.22 (−5%) |
| | fps / worst-frame | 105 / 40 ms | 105 / 40 ms (already smooth) |
| **6× CPU throttle (≈ Pi/tablet), 200 AIS** | gesture scriptSec | 8.97 | 8.27 (−8%) |
| | **fps** | 36.8 | **39.4 (+7%)** |
| | gesture wall-time | 13.9 s | 13.1 s (−5%) |

**Methodology caveat (important):** an earlier version of this section quoted a
"−19% worst-frame" from a **headless software-GL** run. That was a *rendering*
artifact — SwiftShader rasterisation dominated and was wrongly attributed to the
CD change. Re-measured **headed (real GPU)**, Tier 1 produces no visible frame
change on a fast desktop (both already smooth) and a modest, real improvement on
**CPU-throttled / low-power hardware** — which is where Freeboard usually runs.
**Use `HEADLESS=false` (and `CPU_THROTTLE=6` to emulate weak hardware) for any
render/frame measurement; headless software-GL masks JS-side wins and inflates
frame times.**

Reproduce: build both variants (`./build-variants.sh`), then e.g.
`AIS_COUNT=200 HEADLESS=false CPU_THROTTLE=6 SETTLE_MS=16000 BUILD_DIR=builds/tier1 node profile.mjs`.

---

## Cleanup

```bash
docker compose down            # stop the SignalK server
pkill -f sk-feed.mjs           # stop any stray feed
rm -rf builds results          # generated artifacts (gitignored)
```

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | SignalK server (open access) |
| `sk-feed.mjs` | synthetic data generator (self + AIS over WS) |
| `profile.mjs` | serve a build + proxy SignalK + drive gestures + measure |
| `compare.mjs` | before/after orchestration over two builds |
| `build-variants.sh` | build baseline + candidate side by side |
| `results/` | per-run JSON, screenshots, `comparison.json` (gitignored) |
