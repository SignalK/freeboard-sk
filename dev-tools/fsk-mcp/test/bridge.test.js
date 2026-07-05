// End-to-end relay: MCP HTTP endpoint -> bridge hub -> a fake browser runtime.
// Exercises the full agent-facing path minus the real chart plotter host.

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const WebSocket = require('ws');
const { BridgeHub } = require('../src/bridge-hub');

// Each test uses its own port: node's global fetch pools keep-alive sockets, and
// reusing a port across a stopped+restarted server hands back a dead socket.
let nextPort = 3096;
const MCP_HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream'
};

function makeApp() {
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  const providers = [];
  const app = {
    providers,
    ready,
    debug: () => {},
    error: () => {},
    setPluginStatus: () => resolveReady(),
    setPluginError: (m) => resolveReady(new Error(m)),
    registerResourceProvider: (p) => providers.push(p)
    // No Express app (use/get): mountAssets() skips serving in this minimal host;
    // tests drive the bridge over a direct WebSocket, not the served runtime.
  };
  return app;
}

async function startPlugin(port, options = {}) {
  const app = makeApp();
  const plugin = require('../plugin/index.js')(app);
  plugin.start({ port, host: '127.0.0.1', ...options });
  const err = await app.ready;
  if (err instanceof Error) throw err;
  return { app, plugin };
}

// A fake host runtime: connects, says hello, answers relayed calls from a table.
function fakeRuntime(port, { capabilities, responses }) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/bridge`);
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'call') {
      ws.send(
        JSON.stringify({
          type: 'result',
          id: msg.id,
          result: responses[msg.method] ?? { ok: true }
        })
      );
    }
  });
  ws.on('open', () => {
    ws.send(
      JSON.stringify({
        type: 'hello',
        host: 'test-host',
        hostVersion: '1.0.0',
        apiVersion: '1',
        capabilities,
        context: { kind: 'background' }
      })
    );
  });
  return new Promise((res) => ws.on('open', () => res(ws)));
}

// One MCP client bound to a port, holding its own session id.
function makeClient(port) {
  const base = `http://127.0.0.1:${port}`;
  let session = null;
  const mcp = async (method, params) => {
    const headers = session
      ? { ...MCP_HEADERS, 'mcp-session-id': session }
      : MCP_HEADERS;
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1e6),
        method,
        params
      })
    });
    if (res.headers.get('mcp-session-id'))
      session = res.headers.get('mcp-session-id');
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const handshake = async () => {
    const init = await mcp('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' }
    });
    await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, 'mcp-session-id': session },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })
    });
    return init;
  };
  const callTool = async (name, args = {}) =>
    (await mcp('tools/call', { name, arguments: args })).body.result;
  return {
    mcp,
    handshake,
    callTool,
    get session() {
      return session;
    }
  };
}

test('MCP relays tool calls through the bridge to a runtime', async (t) => {
  const port = nextPort++;
  const { plugin } = await startPlugin(port);
  const ws = await fakeRuntime(port, {
    capabilities: ['map', 'routes', 'background.iframe'],
    responses: {
      'map.getView': { center: [-80.1, 25.8], zoom: 12 },
      'route.list': { routes: [{ routeId: 'r1', saved: true, dirty: false }] }
    }
  });
  t.after(() => {
    ws.close();
    plugin.stop();
  });

  const client = makeClient(port);
  const init = await client.handshake();
  assert.strictEqual(init.status, 200);
  assert.strictEqual(init.body.result.serverInfo.name, 'fsk-mcp');
  assert.ok(client.session, 'server returned a session id');

  const list = await client.mcp('tools/list', {});
  const names = list.body.result.tools.map((tool) => tool.name);
  assert.ok(names.includes('fsk_call'));
  assert.ok(names.includes('fsk_get_view'));

  // Poll until the runtime's async hello has registered, rather than sleeping.
  let sessions = [];
  for (let i = 0; i < 100 && sessions.length === 0; i++) {
    sessions = JSON.parse(
      (await client.callTool('fsk_list_sessions')).content[0].text
    );
    if (sessions.length === 0) await new Promise((r) => setTimeout(r, 20));
  }
  assert.strictEqual(sessions.length, 1);
  assert.strictEqual(sessions[0].host, 'test-host');

  const view = JSON.parse(
    (await client.callTool('fsk_get_view')).content[0].text
  );
  assert.deepStrictEqual(view.center, [-80.1, 25.8]);

  const routes = JSON.parse(
    (await client.callTool('fsk_call', { method: 'route.list' })).content[0]
      .text
  );
  assert.strictEqual(routes.routes[0].routeId, 'r1');
});

test('a call to an unknown session is a clean tool error', async (t) => {
  const port = nextPort++;
  const { plugin } = await startPlugin(port);
  t.after(() => plugin.stop());
  const client = makeClient(port);
  await client.handshake();
  const result = await client.callTool('fsk_get_view', {
    session: 'does-not-exist'
  });
  assert.strictEqual(result.isError, true);
  assert.match(result.content[0].text, /no such session/i);
});

test('a configured token guards the MCP endpoint', async (t) => {
  const port = nextPort++;
  const { plugin } = await startPlugin(port, { token: 's3cret' });
  t.after(() => plugin.stop());

  const initBody = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' }
    }
  });
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream'
  };

  const denied = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers,
    body: initBody
  });
  assert.strictEqual(denied.status, 401);

  const allowed = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { ...headers, authorization: 'Bearer s3cret' },
    body: initBody
  });
  assert.strictEqual(allowed.status, 200);
});

test('a failed bind reports an error and stops advertising the extension', async (t) => {
  const port = nextPort++;
  const first = await startPlugin(port);
  t.after(() => first.plugin.stop());

  // Second plugin on the same port -> EADDRINUSE. Build it directly so we can
  // inspect its provider after the (expected) failure.
  const app = makeApp();
  const plugin = require('../plugin/index.js')(app);
  t.after(() => plugin.stop());
  plugin.start({ port, host: '127.0.0.1' });
  const err = await app.ready;
  assert.ok(err instanceof Error, 'setPluginError fired');

  // With no bridge behind it, the provider must not advertise fsk-mcp, or
  // Freeboard would load a runtime that can never connect.
  assert.deepStrictEqual(await app.providers[0].methods.listResources({}), {});
});

test('restart on the same port does not race EADDRINUSE', async (t) => {
  const port = nextPort++;
  let resolveReady;
  const arm = () => new Promise((r) => (resolveReady = r));
  let ready = arm();
  const app = {
    debug() {},
    error() {},
    setPluginStatus: () => resolveReady(),
    setPluginError: (m) => resolveReady(new Error(m)),
    registerResourceProvider() {}
  };
  const plugin = require('../plugin/index.js')(app);
  t.after(() => plugin.stop());

  plugin.start({ port, host: '127.0.0.1' });
  assert.ok(!((await ready) instanceof Error), 'first start came up');

  plugin.stop(); // begins async close of the listening server
  ready = arm();
  plugin.start({ port, host: '127.0.0.1' }); // immediate restart, same port
  const err = await ready;
  assert.ok(
    !(err instanceof Error),
    `restart must wait for port release: ${err && err.message}`
  );
});

test('hub.close() rejects in-flight calls immediately', async (t) => {
  const server = http.createServer();
  const hub = new BridgeHub({});
  hub.attach(server, '/bridge');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const ws = new WebSocket(`ws://127.0.0.1:${port}/bridge`);
  await new Promise((res, rej) => {
    ws.once('open', res);
    ws.once('error', rej);
  });
  t.after(() => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    try {
      server.close();
    } catch {
      /* ignore */
    }
  });
  // Runtime says hello but never answers calls.
  ws.send(
    JSON.stringify({
      type: 'hello',
      host: 'test-host',
      hostVersion: '1.0.0',
      apiVersion: '1',
      capabilities: [],
      context: { kind: 'background' }
    })
  );
  await new Promise((r) => setTimeout(r, 50)); // let the hello register

  const pending = hub.call('map.getView', {}); // no reply will come
  const settled = pending.then(
    () => null,
    (e) => e
  );
  hub.close(); // must reject the pending call now, not at its timeout
  const err = await settled;
  assert.ok(err instanceof Error);
  assert.match(err.message, /closed/i);
});

test('does not advertise the extension when assets cannot be served', async (t) => {
  // A host that looks like Express (use/get present) but whose mounting fails.
  // Then the extension must not be advertised.
  const app = makeApp();
  app.use = () => {};
  app.get = () => {
    throw new Error('mount failed');
  };
  const plugin = require('../plugin/index.js')(app);
  t.after(() => plugin.stop());
  plugin.start({ port: nextPort++, host: '127.0.0.1' });
  const err = await app.ready;
  assert.ok(err instanceof Error, 'setPluginError fired');
  assert.strictEqual(app.providers.length, 0, 'provider was never registered');
});

test('non-object JSON messages do not crash the hub', async (t) => {
  const port = nextPort++;
  const { plugin } = await startPlugin(port);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/bridge`);
  await new Promise((res, rej) => {
    ws.once('open', res);
    ws.once('error', rej);
  });
  t.after(() => {
    ws.close();
    plugin.stop();
  });
  // JSON that parses to non-objects — would throw on msg.type without the guard.
  for (const bad of ['null', '42', 'true', '"hello"']) ws.send(bad);
  ws.send(
    JSON.stringify({
      type: 'hello',
      host: 'test-host',
      hostVersion: '1.0.0',
      apiVersion: '1',
      capabilities: [],
      context: { kind: 'background' }
    })
  );

  // The hub survived the junk and still registered the subsequent hello.
  const client = makeClient(port);
  await client.handshake();
  let sessions = [];
  for (let i = 0; i < 100 && sessions.length === 0; i++) {
    sessions = JSON.parse(
      (await client.callTool('fsk_list_sessions')).content[0].text
    );
    if (sessions.length === 0) await new Promise((r) => setTimeout(r, 20));
  }
  assert.strictEqual(sessions.length, 1);
});

test('a socket that never sends hello is still closed on shutdown', async (t) => {
  const port = nextPort++;
  const { plugin } = await startPlugin(port);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/bridge`);
  await new Promise((res, rej) => {
    ws.once('open', res);
    ws.once('error', rej);
  });
  const closeCode = new Promise((res) => ws.once('close', (code) => res(code)));
  plugin.stop(); // hub.close() must reach a pre-hello socket, not just sessions
  assert.strictEqual(await closeCode, 1001);
});

test('provider is read-only and empties when stopped', async () => {
  const { app, plugin } = await startPlugin(nextPort++);
  const provider = app.providers[0];
  assert.strictEqual(provider.type, 'plotterExtensions');
  const list = await provider.methods.listResources({});
  assert.ok(list['fsk-mcp']);
  await assert.rejects(() => provider.methods.setResource('x', {}));
  await assert.rejects(() => provider.methods.deleteResource('x'));
  plugin.stop();
  assert.deepStrictEqual(await provider.methods.listResources({}), {});
});
