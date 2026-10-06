import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RpcError, type WindowState } from 'signalk-plotterext-bus/host';
import { createWindowMethods, WindowMethodsDeps } from './window-methods';
import { PanelContribution } from './types';

const panel: PanelContribution = {
  id: 'viewer',
  title: 'Viewer',
  type: 'iframe',
  url: '/plotterext/ext-a/viewer.html'
};

const state = (
  windowId: string,
  over: Partial<WindowState> = {}
): WindowState => ({
  windowId,
  panel: 'viewer',
  title: 'Viewer',
  presentation: 'floating',
  bounds: { x: 0, y: 0, width: 300, height: 200 },
  area: { width: 1000, height: 800 },
  visible: true,
  collapsed: false,
  poppedOut: false,
  modal: false,
  ...over
});

describe('createWindowMethods', () => {
  let deps: { [K in keyof WindowMethodsDeps]: WindowMethodsDeps[K] };
  let open: Record<string, WindowState>;
  let methods: ReturnType<typeof createWindowMethods>;

  const call = (method: string, params?: unknown) =>
    Promise.resolve(methods[method](params, {} as never));
  const reason = async (p: Promise<unknown>) => {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    return (err as RpcError).reason;
  };

  const build = (self: string | null = null) => {
    deps.self = self;
    methods = createWindowMethods(deps);
  };

  beforeEach(() => {
    open = { w1: state('w1') };
    deps = {
      self: null,
      panel: vi.fn((id: string) => (id === 'viewer' ? panel : undefined)),
      open: vi.fn(() => state('new')),
      owned: vi.fn((id: string) => open[id]),
      openOf: vi.fn(() => undefined),
      update: vi.fn((id: string) => open[id]),
      focus: vi.fn(),
      close: vi.fn(),
      list: vi.fn(() => Object.values(open))
    };
    build();
  });

  describe('ui.openWindow', () => {
    it('opens the panel with every option passed through, and returns its state', async () => {
      const params = {
        panel: 'viewer',
        params: { app: '/signalk-wifish/' },
        title: 'Sounder',
        geometry: { anchor: 'bottom-right', width: 480, height: '30%' },
        modal: false,
        resizable: false,
        movable: true,
        titleBar: 'autoHide',
        userClose: 'hide',
        visible: false,
        restoreKey: 'sounder'
      };
      await expect(call('ui.openWindow', params)).resolves.toEqual(
        state('new')
      );
      const { panel: _p, ...req } = params;
      expect(deps.open).toHaveBeenCalledWith(panel, req);
    });

    it.each<[string, unknown]>([
      ['an empty panel', { panel: '' }],
      ['a panel that is not a string', { panel: 7 }]
    ])('reports UNKNOWN_PANEL for %s', async (_, params) => {
      expect(await reason(call('ui.openWindow', params))).toBe('UNKNOWN_PANEL');
    });

    it('reports windows.badRequest for no params at all', async () => {
      expect(await reason(call('ui.openWindow'))).toBe('windows.badRequest');
    });

    it("reports UNKNOWN_PANEL for a panel not in the caller's manifest", async () => {
      expect(await reason(call('ui.openWindow', { panel: 'other' }))).toBe(
        'UNKNOWN_PANEL'
      );
      expect(deps.open).not.toHaveBeenCalled();
    });

    it.each<[string, Record<string, unknown>]>([
      ['params that are not an object', { params: [1] }],
      ['a non-string title', { title: 5 }],
      ['a malformed geometry', { geometry: { anchor: 'middle' } }],
      ['a non-boolean flag', { modal: 'yes' }],
      ['an unknown titleBar', { titleBar: 'sometimes' }],
      ['an unknown userClose', { userClose: 'minimise' }],
      ['an empty restoreKey', { restoreKey: '' }],
      ['a hidden modal window', { modal: true, visible: false }],
      ['a modal window that hides', { modal: true, userClose: 'hide' }]
    ])('reports windows.badRequest for %s', async (_, extra) => {
      expect(
        await reason(call('ui.openWindow', { panel: 'viewer', ...extra }))
      ).toBe('windows.badRequest');
      expect(deps.open).not.toHaveBeenCalled();
    });

    it('maps the host refusing to windows.limit and windows.modalOpen', async () => {
      deps.open = vi.fn(() => 'limit' as const);
      build();
      expect(await reason(call('ui.openWindow', { panel: 'viewer' }))).toBe(
        'windows.limit'
      );
      deps.open = vi.fn(() => 'modalOpen' as const);
      build();
      expect(
        await reason(call('ui.openWindow', { panel: 'viewer', modal: true }))
      ).toBe('windows.modalOpen');
    });

    it('with single, shows and raises an open window of the panel instead', async () => {
      deps.openOf = vi.fn(() => 'w1');
      build();
      await expect(
        call('ui.openWindow', {
          panel: 'viewer',
          single: true,
          params: { x: 1 }
        })
      ).resolves.toEqual(state('w1'));
      expect(deps.update).toHaveBeenCalledWith('w1', { visible: true });
      expect(deps.focus).toHaveBeenCalledWith('w1');
      expect(deps.open).not.toHaveBeenCalled();
    });
  });

  describe('addressing a window', () => {
    it("reports windows.unknownId for a window the caller's extension does not own", async () => {
      for (const m of ['ui.updateWindow', 'ui.focusWindow', 'ui.closeWindow']) {
        expect(await reason(call(m, { windowId: 'nope' }))).toBe(
          'windows.unknownId'
        );
      }
      expect(deps.close).not.toHaveBeenCalled();
    });

    it('needs a windowId outside a window context', async () => {
      expect(await reason(call('ui.closeWindow', {}))).toBe(
        'windows.badRequest'
      );
    });

    it('takes a left-out windowId in a window context to mean the window itself', async () => {
      build('w1');
      await call('ui.closeWindow');
      expect(deps.close).toHaveBeenCalledWith('w1');
      await call('ui.focusWindow', {});
      expect(deps.focus).toHaveBeenCalledWith('w1');
      await call('ui.updateWindow', { title: 'Renamed' });
      expect(deps.update).toHaveBeenCalledWith('w1', { title: 'Renamed' });
    });
  });

  describe('ui.updateWindow', () => {
    it('passes only the given changes and returns the new state', async () => {
      await expect(
        call('ui.updateWindow', {
          windowId: 'w1',
          geometry: { width: '50%' },
          visible: false
        })
      ).resolves.toEqual(state('w1'));
      expect(deps.update).toHaveBeenCalledWith('w1', {
        geometry: { width: '50%' },
        visible: false
      });
    });

    it.each<[string, Record<string, unknown>]>([
      ['a non-string title', { title: 1 }],
      ['a malformed geometry', { geometry: { width: -5 } }],
      ['a non-boolean visible', { visible: 'no' }]
    ])('reports windows.badRequest for %s', async (_, extra) => {
      expect(
        await reason(call('ui.updateWindow', { windowId: 'w1', ...extra }))
      ).toBe('windows.badRequest');
    });

    it('refuses to hide a modal window', async () => {
      open.w1 = state('w1', { modal: true });
      expect(
        await reason(
          call('ui.updateWindow', { windowId: 'w1', visible: false })
        )
      ).toBe('windows.badRequest');
    });
  });

  it('treats a window updating itself with no params as a no-op', async () => {
    build('w1');
    await expect(call('ui.updateWindow')).resolves.toEqual(state('w1'));
    expect(deps.update).toHaveBeenCalledWith('w1', {});
  });

  it('keeps only the geometry fields the spec defines', async () => {
    await call('ui.openWindow', {
      panel: 'viewer',
      geometry: { width: 300, blob: 'x', offset: { x: 1, junk: 2 } }
    });
    expect(deps.open).toHaveBeenCalledWith(panel, {
      geometry: { width: 300, offset: { x: 1 } }
    });
    build('w1');
    await call('ui.updateWindow', { geometry: { height: 200, extra: true } });
    expect(deps.update).toHaveBeenCalledWith('w1', {
      geometry: { height: 200 }
    });
  });

  it("ui.listWindows lists the caller's extension's windows", async () => {
    await expect(call('ui.listWindows')).resolves.toEqual({
      windows: [state('w1')]
    });
  });
});
