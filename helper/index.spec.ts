import { afterEach, describe, expect, it, vi } from 'vitest';
import createPlugin from './index.js';
import type { FreeboardHelperApp } from './index.js';
import type { PluginRouter } from '@signalk/server-api';
import { initAlarms } from './alarms/alarms.js';

vi.mock('./alarms/alarms.js', () => ({
  initAlarms: vi.fn(),
  shutdownAlarms: vi.fn()
}));

type RouteHandler = (req: unknown, res: unknown) => void;

const makeServer = () =>
  ({
    debug: () => undefined,
    error: vi.fn(),
    handleMessage: vi.fn(),
    setPluginStatus: vi.fn(),
    setPluginError: vi.fn()
  }) as unknown as FreeboardHelperApp;

// Reads GET /settings back through the router the plugin registers with.
const readSettings = (plugin: ReturnType<typeof createPlugin>) => {
  const routes = new Map<string, RouteHandler>();
  const router = {
    get: (path: string, handler: RouteHandler) => routes.set(path, handler)
  } as unknown as PluginRouter;
  plugin.registerWithRouter?.(router);
  const handler = routes.get('/settings');
  if (!handler) {
    throw new Error('/settings route not registered');
  }
  let body: unknown;
  const res = {
    status: () => res,
    json: (payload: unknown) => {
      body = payload;
    }
  };
  handler({}, res);
  return body;
};

describe('freeboard-sk helper plugin', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('offers no settings to configure', () => {
    const plugin = createPlugin(makeServer());
    const schema =
      typeof plugin.schema === 'function' ? plugin.schema() : plugin.schema;

    expect(schema).toMatchObject({ type: 'object', properties: {} });
  });

  it('starts area alarms whatever configuration an older version saved', () => {
    const server = makeServer();
    const plugin = createPlugin(server);

    plugin.start(
      { alarms: { enable: false }, weather: { enable: true } },
      () => undefined
    );

    expect(initAlarms).toHaveBeenCalledWith(server, 'freeboard-sk');
    expect(server.setPluginStatus).toHaveBeenCalledWith('Started');
    expect(readSettings(plugin)).toEqual({
      settings: { alarms: { enable: true } }
    });
  });

  it('reports a startup failure on the plugin', () => {
    const server = makeServer();
    vi.mocked(initAlarms).mockImplementationOnce(() => {
      throw new Error('no router');
    });

    createPlugin(server).start({}, () => undefined);

    expect(server.setPluginError).toHaveBeenCalledWith('Started with errors!');
    expect(server.error).toHaveBeenCalledWith(
      expect.stringContaining('no router')
    );
  });
});
