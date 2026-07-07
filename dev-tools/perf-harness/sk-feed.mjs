#!/usr/bin/env node
/**
 * Freeboard-SK perf harness — SignalK data generator.
 *
 * Connects to the SignalK server's WS stream and pushes deltas continuously so
 * change detection has realistic, reproducible work to do:
 *   - one self vessel (slow drift, COG/SOG/heading/wind)
 *   - AIS_COUNT other vessels (AIS targets) orbiting the centre at varied radii
 *
 * Deterministic motion (no Math.random) so runs are repeatable.
 *
 * Env:
 *   SK_URL      ws url            (default ws://localhost:3010/signalk/v1/stream)
 *   RATE_HZ     position updates/sec per vessel (default 1)
 *   AIS_COUNT   number of AIS targets            (default 20)
 *   DURATION_S  seconds to run, 0 = forever      (default 0)
 *   CENTER      "lon,lat"                          (default -122.45,37.80)
 */

const SK_URL = process.env.SK_URL || 'ws://localhost:3010/signalk/v1/stream?subscribe=none';
const RATE_HZ = Number(process.env.RATE_HZ || 1);
const AIS_COUNT = Number(process.env.AIS_COUNT || 20);
const DURATION_S = Number(process.env.DURATION_S || 0);
// Default to [0,0] so the app (which opens at config-default centre [0,0]) shows
// the fleet immediately; override with CENTER="lon,lat" for a realistic locale.
const [CLON, CLAT] = (process.env.CENTER || '0,0').split(',').map(Number);

const R_EARTH = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
// metres -> degrees offset at a given latitude
const dLon = (m, lat) => (m / (R_EARTH * Math.cos(toRad(lat)))) * (180 / Math.PI);
const dLat = (m) => (m / R_EARTH) * (180 / Math.PI);

function nowIso(tickMs) {
  // Derive an ISO timestamp from a monotonic base + elapsed ticks (Date.now is
  // fine here — this is a standalone script, not a workflow).
  return new Date(Date.now()).toISOString();
}

// AIS target descriptors: deterministic orbits around the centre.
const targets = Array.from({ length: AIS_COUNT }, (_, i) => {
  const ring = 300 + (i % 8) * 250; // 300..2050 m radius
  const phase = (i * 2 * Math.PI) / Math.max(1, AIS_COUNT);
  const angSpeed = 0.05 + (i % 5) * 0.02; // rad/s, varied
  const dir = i % 2 === 0 ? 1 : -1;
  const mmsi = String(366000000 + i);
  return { i, ring, phase, angSpeed, dir, mmsi, name: `AIS Target ${i + 1}` };
});

function selfDelta(t) {
  // slow figure-eight drift around centre
  const x = 600 * Math.sin(t * 0.03);
  const y = 400 * Math.sin(t * 0.06);
  const lon = CLON + dLon(x, CLAT);
  const lat = CLAT + dLat(y);
  const cog = (t * 0.05) % (2 * Math.PI);
  return {
    context: 'vessels.self',
    updates: [
      {
        source: { label: 'perf-harness' },
        timestamp: nowIso(),
        values: [
          { path: 'navigation.position', value: { longitude: lon, latitude: lat } },
          { path: 'navigation.courseOverGroundTrue', value: cog },
          { path: 'navigation.headingTrue', value: cog },
          { path: 'navigation.speedOverGround', value: 3.5 + Math.sin(t * 0.1) },
          { path: 'environment.wind.angleApparent', value: 0.7 + 0.2 * Math.sin(t * 0.2) },
          { path: 'environment.wind.speedApparent', value: 6 + Math.sin(t * 0.15) }
        ]
      }
    ]
  };
}

function aisDelta(tg, t) {
  const ang = tg.phase + tg.dir * tg.angSpeed * t;
  const x = tg.ring * Math.cos(ang);
  const y = tg.ring * Math.sin(ang);
  const lon = CLON + dLon(x, CLAT);
  const lat = CLAT + dLat(y);
  const cog = (ang + (tg.dir > 0 ? Math.PI / 2 : -Math.PI / 2)) % (2 * Math.PI);
  return {
    context: `vessels.urn:mrn:imo:mmsi:${tg.mmsi}`,
    updates: [
      {
        source: { label: 'perf-harness' },
        timestamp: nowIso(),
        values: [
          { path: 'navigation.position', value: { longitude: lon, latitude: lat } },
          { path: 'navigation.courseOverGroundTrue', value: (cog + 2 * Math.PI) % (2 * Math.PI) },
          { path: 'navigation.headingTrue', value: (cog + 2 * Math.PI) % (2 * Math.PI) },
          { path: 'navigation.speedOverGround', value: 2 + (tg.i % 4) }
        ]
      }
    ]
  };
}

function aisStatic(tg) {
  return {
    context: `vessels.urn:mrn:imo:mmsi:${tg.mmsi}`,
    updates: [
      {
        source: { label: 'perf-harness' },
        timestamp: nowIso(),
        values: [
          { path: '', value: { name: tg.name } },
          { path: '', value: { mmsi: tg.mmsi } }
        ]
      }
    ]
  };
}

const ws = new WebSocket(SK_URL);
let tick = 0;
let timer = null;

ws.onopen = () => {
  console.error(`[sk-feed] connected ${SK_URL}  rate=${RATE_HZ}Hz  ais=${AIS_COUNT}  center=${CLON},${CLAT}`);
  // send static identity once
  ws.send(JSON.stringify({ context: 'vessels.self', updates: [{ values: [{ path: '', value: { name: 'Perf Test Vessel' } }] }] }));
  targets.forEach((tg) => ws.send(JSON.stringify(aisStatic(tg))));

  const periodMs = 1000 / RATE_HZ;
  timer = setInterval(() => {
    const t = tick / RATE_HZ; // seconds of sim time
    try {
      ws.send(JSON.stringify(selfDelta(t)));
      for (const tg of targets) ws.send(JSON.stringify(aisDelta(tg, t)));
    } catch (e) {
      console.error('[sk-feed] send error', e.message);
    }
    tick++;
    if (tick % (RATE_HZ * 5) === 0) console.error(`[sk-feed] t=${t.toFixed(0)}s sent ${tick} self ticks (+${AIS_COUNT} ais each)`);
    if (DURATION_S && t >= DURATION_S) {
      clearInterval(timer);
      ws.close();
      console.error('[sk-feed] done');
      process.exit(0);
    }
  }, periodMs);
};
ws.onerror = (e) => console.error('[sk-feed] WS error', e.message || e.type);
ws.onclose = () => { if (timer) clearInterval(timer); };
process.on('SIGINT', () => { if (timer) clearInterval(timer); try { ws.close(); } catch {} process.exit(0); });
process.on('SIGTERM', () => { if (timer) clearInterval(timer); try { ws.close(); } catch {} process.exit(0); });
