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
import { messageOf } from '../errors.ts';

// bridge-config.json, as the plugin serves it (src/index.ts).
interface BridgeConfig {
  port: number;
  path?: string;
  token?: string;
  // Not served by the plugin; honoured for an advanced setup (see bridgeUrl).
  url?: string;
  host?: string;
}

// What the plugin's bridge hub (src/bridge-hub.ts) sends.
type HubMessage =
  | { type: 'call'; id: string; method: string; params?: unknown }
  | { type: 'ping'; id?: string };

const CONFIG_URL = 'bridge-config.json'; // resolved against this iframe's origin
// Extension state key of the recorded action choices; fsk_list_action_invocations
// (src/tools.ts) reads it back with state.get.
const INVOCATIONS_KEY = 'actionInvocations';
const MAX_INVOCATIONS = 20;
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;

function log(...args: unknown[]): void {
  // Recoverable/diagnostic only; the host console is where a dev sees this.
  console.warn('[fsk-mcp runtime]', ...args);
}

async function loadConfig(): Promise<BridgeConfig> {
  const res = await fetch(CONFIG_URL, { credentials: 'include' });
  if (!res.ok) throw new Error(`bridge-config.json ${res.status}`);
  return (await res.json()) as BridgeConfig;
}

// The plugin serves a plain (non-TLS) WebSocket bridge on the same host the
// iframe was served from — only the port differs. It is a local dev tool, so it
// speaks `ws:` only; an https-origin Freeboard can't reach a plain-ws bridge
// (browser mixed-content) — run it over http/localhost. `config.url` lets an
// advanced setup point at an explicit endpoint (e.g. a TLS-terminating proxy).
function bridgeUrl(config: BridgeConfig): string {
  if (config.url) return config.url;
  const host = config.host || location.hostname;
  const path = config.path || '/bridge';
  return `ws://${host}:${config.port}${path}`;
}

function hostReasonOf(err: unknown): unknown {
  if (typeof err !== 'object' || err === null) return undefined;
  // Host API errors carry a stable string in error.data.reason (see spec).
  const { data, reason } = err as {
    data?: { reason?: unknown } | null;
    reason?: unknown;
  };
  return data?.reason ?? reason ?? undefined;
}

async function main(): Promise<void> {
  const client = await connectExtension();
  log(
    `handshake ok: host=${client.handshake.host}@${client.handshake.hostVersion}`,
    `caps=[${client.capabilities.join(', ')}]`
  );

  if (client.capabilities.includes('actions')) {
    await client.subscribe(['action.invoked'], (_name, invocation) => {
      recordInvocation(invocation).catch((err: unknown) =>
        log('cannot record an action invocation:', messageOf(err))
      );
    });
  }

  // Keep the latest action choices, newest first, in the extension state.
  async function recordInvocation(invocation: unknown): Promise<void> {
    const saved = (await client.state.get([INVOCATIONS_KEY], 'extension'))[
      INVOCATIONS_KEY
    ];
    const list = Array.isArray(saved) ? saved : [];
    await client.state.set(
      {
        [INVOCATIONS_KEY]: [
          { at: new Date().toISOString(), ...(invocation as object) },
          ...list
        ].slice(0, MAX_INVOCATIONS)
      },
      'extension'
    );
  }

  let config: BridgeConfig;
  try {
    config = await loadConfig();
  } catch (err) {
    log('cannot read bridge-config.json — bridge disabled:', messageOf(err));
    return;
  }

  if (location.protocol === 'https:' && !config.url) {
    log(
      'page is https but the fsk-mcp bridge is plain ws — the browser will block',
      'the connection. Run Freeboard over http/localhost for this dev tool.'
    );
  }

  let ws: WebSocket | null = null;
  let backoff = RECONNECT_MIN_MS;

  const send = (obj: object) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  async function handleCall(
    msg: Extract<HubMessage, { type: 'call' }>
  ): Promise<void> {
    try {
      const result = await client.call(msg.method, msg.params);
      send({ type: 'result', id: msg.id, result });
    } catch (err) {
      send({
        type: 'error',
        id: msg.id,
        error: {
          reason: hostReasonOf(err),
          message: messageOf(err) ?? String(err)
        }
      });
    }
  }

  function connect(): void {
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
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      // JSON.parse('null'|'5'|...) yields a non-object; guard before .type.
      if (!parsed || typeof parsed !== 'object') return;
      const msg = parsed as HubMessage;
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

main().catch((err: unknown) => log('fatal:', messageOf(err) ?? err));
