// The WebSocket hub (Signal K server side).
//
// Each connected Freeboard-SK tab loads the background runtime, which dials in
// here. One WS connection == one "session". The hub tracks sessions, relays
// host-API calls to a chosen session, and matches replies back to their caller
// by correlation id. This is the pure transport/relay layer — it knows nothing
// about MCP or about which host methods exist.

import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { Handshake } from 'signalk-plotterext-bus';

const HEARTBEAT_MS = 30000;
const HELLO_TIMEOUT_MS = 15000;

type Logger = (msg: string) => void;

// What the runtime (src/web/runtime.ts) sends. It arrives as untrusted JSON:
// `type` routes it and the rest is relayed as given.
type HelloMessage = Partial<Handshake> & { type: 'hello'; token?: string };
type ReplyMessage =
  | { type: 'result'; id: string; result: unknown }
  | {
      type: 'error';
      id: string;
      error?: { message?: string; reason?: string };
    };
type RuntimeMessage = HelloMessage | ReplyMessage | { type: 'pong' };

type SessionHello = Omit<Partial<Handshake>, 'capabilities'> & {
  capabilities: unknown[];
};

interface PendingCall {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface Session {
  id: string;
  ws: WebSocket;
  hello: SessionHello | null;
  pending: Map<string, PendingCall>;
  connectedAt: string;
  alive: boolean;
  helloTimer: NodeJS.Timeout | null;
}

export interface SessionInfo {
  session: string;
  host: string | undefined;
  hostVersion: string | undefined;
  apiVersion: string | undefined;
  capabilities: unknown[];
  connectedAt: string;
}

export interface BridgeHubOptions {
  logger?: Logger;
  token?: string | null;
  callTimeoutMs?: number;
}

export class BridgeHub {
  private readonly log: Logger;
  private readonly token: string | null;
  private readonly callTimeoutMs: number;
  private readonly connections: Set<Session>;
  private readonly sessions: Map<string, Session>;
  private order: string[];
  private wss: WebSocketServer | null;
  private heartbeat: NodeJS.Timeout | null;

  constructor({ logger, token, callTimeoutMs = 15000 }: BridgeHubOptions = {}) {
    this.log = logger || (() => {});
    this.token = token || null;
    this.callTimeoutMs = callTimeoutMs;
    this.connections = new Set(); // every live socket, pre- and post-hello
    this.sessions = new Map(); // sessionId -> session (only after a valid hello)
    this.order = []; // sessionIds oldest -> newest
    this.wss = null;
    this.heartbeat = null;
  }

  attach(httpServer: Server, path = '/bridge'): void {
    this.wss = new WebSocketServer({ server: httpServer, path });
    // ws re-emits the http server's 'error' (e.g. EADDRINUSE) on the wss; with
    // no listener that is an uncaught exception that would crash the process.
    this.wss.on('error', (err) =>
      this.log(`bridge: WebSocket server error: ${err?.message ?? err}`)
    );
    this.wss.on('connection', (ws) => this._onConnection(ws));
    this.heartbeat = setInterval(() => this._sweep(), HEARTBEAT_MS);
    if (this.heartbeat.unref) this.heartbeat.unref();
  }

  private _onConnection(ws: WebSocket): void {
    const session: Session = {
      id: randomUUID(),
      ws,
      hello: null,
      pending: new Map(),
      connectedAt: new Date().toISOString(),
      alive: true,
      helloTimer: null
    };
    // Track the socket immediately so the heartbeat sweep and shutdown reach a
    // client that upgrades but never sends `hello`; drop it if it stays silent.
    this.connections.add(session);
    session.helloTimer = setTimeout(() => {
      if (!session.hello) {
        this.log(`bridge: closing socket that never sent hello`);
        try {
          ws.close(4002, 'no hello');
        } catch {
          /* already closing */
        }
      }
    }, HELLO_TIMEOUT_MS);
    if (session.helloTimer.unref) session.helloTimer.unref();

    ws.on('message', (data) => this._onMessage(session, data));
    ws.on('close', () => this._onClose(session));
    ws.on('error', () => {}); // 'close' follows; cleanup happens there
    ws.on('pong', () => {
      session.alive = true;
    });
  }

  private _onMessage(session: Session, data: RawData): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      return;
    }
    // JSON.parse('null' | '5' | 'true') succeeds but yields a non-object;
    // dereferencing .type on those would throw out of the message handler.
    if (!parsed || typeof parsed !== 'object') return;
    const msg = parsed as RuntimeMessage;
    if (msg.type === 'hello') this._onHello(session, msg);
    else if (msg.type === 'result' || msg.type === 'error')
      this._onReply(session, msg);
    else if (msg.type === 'pong') session.alive = true;
  }

  private _onHello(session: Session, msg: HelloMessage): void {
    if (session.helloTimer) {
      clearTimeout(session.helloTimer);
      session.helloTimer = null;
    }
    // Ignore a repeat hello on an already-registered socket — re-registering
    // would duplicate the session id in `this.order`.
    if (session.hello) return;
    if (this.token && msg.token !== this.token) {
      this.log(`bridge: rejecting session ${session.id} (bad token)`);
      try {
        session.ws.close(4001, 'unauthorized');
      } catch {
        /* already closing */
      }
      return;
    }
    session.hello = {
      host: msg.host,
      hostVersion: msg.hostVersion,
      apiVersion: msg.apiVersion,
      capabilities: Array.isArray(msg.capabilities) ? msg.capabilities : [],
      context: msg.context
    };
    this.sessions.set(session.id, session);
    this.order.push(session.id);
    this.log(
      `bridge: session ${session.id} connected ` +
        `(host=${msg.host}@${msg.hostVersion}, ${session.hello.capabilities.length} caps)`
    );
  }

  private _onReply(session: Session, msg: ReplyMessage): void {
    const pending = session.pending.get(msg.id);
    if (!pending) return;
    session.pending.delete(msg.id);
    clearTimeout(pending.timer);
    if (msg.type === 'result') {
      pending.resolve(msg.result);
    } else {
      pending.reject(
        Object.assign(new Error(msg.error?.message || 'host API error'), {
          reason: msg.error?.reason
        })
      );
    }
  }

  private _onClose(session: Session): void {
    this.connections.delete(session);
    if (session.helloTimer) clearTimeout(session.helloTimer);
    const known = this.sessions.delete(session.id);
    this.order = this.order.filter((id) => id !== session.id);
    for (const pending of session.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('bridge session closed'));
    }
    session.pending.clear();
    if (known) this.log(`bridge: session ${session.id} closed`);
  }

  private _sweep(): void {
    // Iterate every socket (including pre-hello) so a dead one is always reaped.
    for (const session of this.connections) {
      if (!session.alive) {
        try {
          session.ws.terminate();
        } catch {
          /* ignore */
        }
        continue;
      }
      session.alive = false;
      try {
        session.ws.ping();
      } catch {
        /* ignore */
      }
    }
  }

  listSessions(): SessionInfo[] {
    // `order` and `sessions` change together, so every id has its session.
    return this.order.flatMap((id) => {
      const s = this.sessions.get(id);
      if (!s) return [];
      return {
        session: id,
        host: s.hello?.host,
        hostVersion: s.hello?.hostVersion,
        apiVersion: s.hello?.apiVersion,
        capabilities: s.hello?.capabilities ?? [],
        connectedAt: s.connectedAt
      };
    });
  }

  private _resolve(sessionId: string | undefined): Session {
    if (sessionId) {
      const s = this.sessions.get(sessionId);
      if (!s) throw new Error(`no such session: ${sessionId}`);
      return s;
    }
    const latest = this.sessions.get(this.order[this.order.length - 1]); // most recent
    if (!latest) {
      throw new Error(
        'no Freeboard-SK runtime is connected — open Freeboard-SK with the fsk-mcp plugin enabled'
      );
    }
    return latest;
  }

  // Relay a host-API call to a session and await its reply.
  call(
    method: string,
    params: unknown,
    { session }: { session?: string } = {}
  ): Promise<unknown> {
    const s = this._resolve(session);
    const id = randomUUID();
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        s.pending.delete(id);
        reject(
          new Error(
            `host call timed out after ${this.callTimeoutMs}ms: ${method}`
          )
        );
      }, this.callTimeoutMs);
      s.pending.set(id, { resolve, reject, timer });
      try {
        s.ws.send(JSON.stringify({ type: 'call', id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        s.pending.delete(id);
        reject(err);
      }
    });
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const session of this.connections) {
      if (session.helloTimer) clearTimeout(session.helloTimer);
      // Reject in-flight calls now — the ws 'close' cleanup is async, so
      // otherwise they linger until their timeout during shutdown.
      for (const pending of session.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('bridge hub closed'));
      }
      session.pending.clear();
      try {
        session.ws.close(1001, 'server shutting down');
      } catch {
        /* ignore */
      }
    }
    this.connections.clear();
    this.sessions.clear();
    this.order = [];
    if (this.wss) this.wss.close();
  }
}
