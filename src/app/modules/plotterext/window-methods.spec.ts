import { describe, expect, it, vi } from 'vitest';
import { RPC_ERRORS } from 'signalk-plotterext-bus/host';
import { WindowTarget, createWindowMethods } from './window-methods';

function setup(over: Partial<Parameters<typeof createWindowMethods>[0]> = {}) {
  const deps = {
    enabled: vi.fn(() => true),
    // Like the service: only the caller's own 'sonar' panel can be shown.
    open: vi.fn((t: WindowTarget) =>
      'url' in t || t.panel === 'sonar' ? 'win-1' : null
    ),
    close: vi.fn((id: string) => id === 'win-1'),
    ...over
  };
  const methods = createWindowMethods(deps);
  const call = async (name: string, params?: unknown) =>
    methods[name](params, {} as never);
  return { deps, call };
}

const reason = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { data?: { reason?: string } }).data?.reason;
  }
  return 'resolved';
};

describe('ui.openWindow', () => {
  it('opens a panel and returns the window id', async () => {
    const { deps, call } = setup();
    expect(await call('ui.openWindow', { panel: 'sonar' })).toEqual({
      windowId: 'win-1'
    });
    expect(deps.open).toHaveBeenCalledWith(
      { panel: 'sonar' },
      undefined,
      undefined
    );
  });

  it('passes a title and a pixel size through', async () => {
    const { deps, call } = setup();
    await call('ui.openWindow', {
      panel: 'sonar',
      title: 'Echo',
      width: 480,
      height: 240
    });
    expect(deps.open).toHaveBeenCalledWith({ panel: 'sonar' }, 'Echo', {
      width: 480,
      height: 240
    });
  });

  it('opens a page on the server by url', async () => {
    const { deps, call } = setup();
    await call('ui.openWindow', { url: '/signalk-wifish/' });
    expect(deps.open).toHaveBeenCalledWith(
      { url: '/signalk-wifish/' },
      undefined,
      undefined
    );
  });

  it('reports a url that is not on the server', async () => {
    const { call } = setup({ open: vi.fn(() => null) });
    expect(
      await reason(call('ui.openWindow', { url: 'https://evil.example' }))
    ).toBe('windows.badRequest');
  });

  it.each([
    ['neither panel nor url', {}, 'windows.badRequest'],
    [
      'both panel and url',
      { panel: 'sonar', url: '/x/' },
      'windows.badRequest'
    ],
    ['an empty url', { url: '' }, 'windows.badRequest'],
    ['an empty panel', { panel: '' }, 'UNKNOWN_PANEL'],
    ['an unknown panel', { panel: 'nope' }, 'UNKNOWN_PANEL'],
    ['a non-string title', { panel: 'sonar', title: 5 }, 'windows.badRequest'],
    ['a lone width', { panel: 'sonar', width: 300 }, 'windows.badRequest'],
    [
      'a non-positive size',
      { panel: 'sonar', width: -1, height: 200 },
      'windows.badRequest'
    ]
  ])('rejects %s', async (_case, params, expected) => {
    const { deps, call } = setup();
    expect(await reason(call('ui.openWindow', params))).toBe(expected);
    expect(deps.close).not.toHaveBeenCalled();
  });

  it('reports a panel whose page cannot be shown', async () => {
    const { call } = setup({ open: vi.fn(() => null) });
    expect(await reason(call('ui.openWindow', { panel: 'sonar' }))).toBe(
      'UNKNOWN_PANEL'
    );
  });

  it('refuses while PiP App is switched off', async () => {
    const { deps, call } = setup({ enabled: vi.fn(() => false) });
    await expect(
      call('ui.openWindow', { panel: 'sonar' })
    ).rejects.toMatchObject({
      code: RPC_ERRORS.HOST_ERROR,
      data: { reason: 'windows.disabled' }
    });
    expect(deps.open).not.toHaveBeenCalled();
  });
});

describe('ui.closeWindow', () => {
  it('closes a window the caller opened', async () => {
    const { deps, call } = setup();
    expect(await call('ui.closeWindow', { windowId: 'win-1' })).toEqual({});
    expect(deps.close).toHaveBeenCalledWith('win-1');
  });

  it('refuses windows it does not own or that are malformed', async () => {
    const { deps, call } = setup();
    expect(await reason(call('ui.closeWindow', { windowId: 'other' }))).toBe(
      'UNKNOWN_WINDOW'
    );
    expect(deps.close).toHaveBeenCalledWith('other');
    expect(await reason(call('ui.closeWindow', {}))).toBe('UNKNOWN_WINDOW');
    expect(deps.close).toHaveBeenCalledTimes(1);
  });
});
