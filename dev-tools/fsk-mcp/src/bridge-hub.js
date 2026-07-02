// The WebSocket hub (Signal K server side).
//
// Each connected Freeboard-SK tab loads the background runtime, which dials in
// here. One WS connection == one "session". The hub tracks sessions, relays
// host-API calls to a chosen session, and matches replies back to their caller
// by correlation id. This is the pure transport/relay layer — it knows nothing
// about MCP or about which host methods exist.

const { WebSocketServer } = require('ws');
const { randomUUID } = require('node:crypto');

const HEARTBEAT_MS = 30000;
const HELLO_TIMEOUT_MS = 15000;

class BridgeHub {
  constructor({ logger, token, callTimeoutMs = 15000 } = {}) {
    this.log = logger || (() => {});
    this.token = token || null;
    this.callTimeoutMs = callTimeoutMs;
    this.connections = new Set(); // every live socket, pre- and post-hello
    this.sessions = new Map(); // sessionId -> session (only after a valid hello)
    this.order = []; // sessionIds oldest -> newest
    this.wss = null;
    this.heartbeat = null;
  }

  attach(httpServer, path = '/bridge') {
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

  _onConnection(ws) {
    const session = {
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

  _onMessage(session, data) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    // JSON.parse('null' | '5' | 'true') succeeds but yields a non-object;
    // dereferencing .type on those would throw out of the message handler.
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'hello') this._onHello(session, msg);
    else if (msg.type === 'result' || msg.type === 'error')
      this._onReply(session, msg);
    else if (msg.type === 'pong') session.alive = true;
  }

  _onHello(session, msg) {
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

  _onReply(session, msg) {
    const pending = session.pending.get(msg.id);
    if (!pending) return;
    session.pending.delete(msg.id);
    clearTimeout(pending.timer);
    if (msg.type === 'result') {
      pending.resolve(msg.result);
    } else {
      const err = new Error(msg.error?.message || 'host API error');
      err.reason = msg.error?.reason;
      pending.reject(err);
    }
  }

  _onClose(session) {
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

  _sweep() {
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

  listSessions() {
    return this.order.map((id) => {
      const s = this.sessions.get(id);
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

  _resolve(sessionId) {
    if (sessionId) {
      const s = this.sessions.get(sessionId);
      if (!s) throw new Error(`no such session: ${sessionId}`);
      return s;
    }
    if (this.order.length === 0) {
      throw new Error(
        'no Freeboard-SK runtime is connected — open Freeboard-SK with the fsk-mcp plugin enabled'
      );
    }
    return this.sessions.get(this.order[this.order.length - 1]); // most recent
  }

  // Relay a host-API call to a session and await its reply.
  call(method, params, { session } = {}) {
    const s = this._resolve(session);
    const id = randomUUID();
    return new Promise((resolve, reject) => {
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

  close() {
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

module.exports = { BridgeHub };
