// fsk-mcp background-runtime bridge (browser side).
//
// This is a headless Plotter Extension background runtime. It does two things:
//
//   1. Connects to the host chartplotter (Freeboard-SK) over the standard
//      plotterExtensions message bus, giving it the full host API surface
//      (map.*, route.*, resources.*, signalk.*, state.*, units.get, ui.*).
//   2. Opens an outbound WebSocket to the fsk-mcp plugin running in the Signal K
//      server, and relays commands that arrive on it into host API calls,
//      sending each result back.
//
// A browser page cannot listen on a port, but it *can* dial out; the plugin's
// WebSocket server is what makes the agent -> plugin -> here -> host chain work.
// Nothing here is FSK-specific: it drives whatever host answered the handshake.

import { connectExtension } from 'signalk-plotterext-bus/extension';

const CONFIG_URL = 'bridge-config.json'; // resolved against this iframe's origin
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;

function log(...args) {
  // Recoverable/diagnostic only; the host console is where a dev sees this.
  console.warn('[fsk-mcp runtime]', ...args);
}

async function loadConfig() {
  const res = await fetch(CONFIG_URL, { credentials: 'include' });
  if (!res.ok) throw new Error(`bridge-config.json ${res.status}`);
  return res.json();
}

// The plugin serves a plain (non-TLS) WebSocket bridge on the same host the
// iframe was served from — only the port differs. It is a local dev tool, so it
// speaks `ws:` only; an https-origin Freeboard can't reach a plain-ws bridge
// (browser mixed-content) — run it over http/localhost. `config.url` lets an
// advanced setup point at an explicit endpoint (e.g. a TLS-terminating proxy).
function bridgeUrl(config) {
  if (config.url) return config.url;
  const host = config.host || location.hostname;
  const path = config.path || '/bridge';
  return `ws://${host}:${config.port}${path}`;
}

function reasonOf(err) {
  // Host API errors carry a stable string in error.data.reason (see spec).
  return err?.data?.reason ?? err?.reason ?? undefined;
}

async function main() {
  const client = await connectExtension();
  log(
    `handshake ok: host=${client.handshake.host}@${client.handshake.hostVersion}`,
    `caps=[${client.capabilities.join(', ')}]`
  );

  let config;
  try {
    config = await loadConfig();
  } catch (err) {
    log('cannot read bridge-config.json — bridge disabled:', err.message);
    return;
  }

  if (location.protocol === 'https:' && !config.url) {
    log(
      'page is https but the fsk-mcp bridge is plain ws — the browser will block',
      'the connection. Run Freeboard over http/localhost for this dev tool.'
    );
  }

  let ws = null;
  let backoff = RECONNECT_MIN_MS;

  const send = (obj) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  async function handleCall(msg) {
    try {
      const result = await client.call(msg.method, msg.params);
      send({ type: 'result', id: msg.id, result });
    } catch (err) {
      send({
        type: 'error',
        id: msg.id,
        error: { reason: reasonOf(err), message: err?.message ?? String(err) }
      });
    }
  }

  function connect() {
    const url = bridgeUrl(config);
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      backoff = RECONNECT_MIN_MS;
      log('bridge connected:', url);
      send({
        type: 'hello',
        token: config.token,
        host: client.handshake.host,
        hostVersion: client.handshake.hostVersion,
        apiVersion: client.apiVersion,
        capabilities: client.capabilities,
        context: client.context
      });
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      // JSON.parse('null'|'5'|...) yields a non-object; guard before .type.
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'call') handleCall(msg);
      else if (msg.type === 'ping') send({ type: 'pong', id: msg.id });
    });

    ws.addEventListener('close', () => {
      ws = null;
      const wait = backoff;
      backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
      setTimeout(connect, wait);
    });

    // 'error' precedes 'close'; let close drive the reconnect so we don't race.
    ws.addEventListener('error', () => {});
  }

  connect();
}

main().catch((err) => log('fatal:', err?.message ?? err));
