import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppFacade } from '../../app.facade';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { PipAppPopoutService } from './pip-app-popout.service';
import { PipAppService } from './pip-app.service';
import { PIP_APP_SANDBOX, PipAppDef } from './types';

const def = (id: string): PipAppDef => ({
  id,
  title: `App ${id}`,
  source: { kind: 'url', url: `https://example.com/${id}` },
  rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
  collapsed: false,
  opacity: 1
});

/** A stand-in for the window documentPictureInPicture.requestWindow returns. */
const fakePipWindow = () => {
  const listeners: Record<string, () => void> = {};
  return {
    document: document.implementation.createHTMLDocument('pip'),
    close: vi.fn(),
    addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
    fire: (type: string) => listeners[type]?.()
  };
};

describe('PipAppPopoutService', () => {
  let windows: ReturnType<typeof signal<PipAppDef[]>>;
  let night: ReturnType<typeof signal<boolean>>;
  let topWindow: boolean;
  let requestWindow: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        PipAppPopoutService,
        {
          provide: AppFacade,
          useValue: {
            isTopWindow: () => topWindow,
            uiCtrl: signal({ forceNightMode: false })
          }
        },
        { provide: SKStreamFacade, useValue: { selfNightMode: night } },
        {
          provide: PipAppService,
          useValue: {
            windows,
            resolveUrl: (s: PipAppDef['source']) =>
              s.kind === 'url' ? s.url : null
          }
        }
      ]
    });
    return TestBed.inject(PipAppPopoutService);
  };

  beforeEach(() => {
    windows = signal([def('a'), def('b')]);
    night = signal(false);
    topWindow = true;
    requestWindow = vi.fn(async () => fakePipWindow());
    open = vi.fn();
    vi.stubGlobal('open', open);
    (window as unknown as Record<string, unknown>).documentPictureInPicture = {
      requestWindow
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as Record<string, unknown>)
      .documentPictureInPicture;
  });

  it('pops out into an always-on-top window with a sandboxed iframe', async () => {
    const popout = create();
    expect(popout.alwaysOnTop).toBe(true);
    await popout.popOut(def('a'), { w: 400.4, h: 300 });
    expect(requestWindow).toHaveBeenCalledWith({ width: 400, height: 300 });
    expect(popout.poppedOut()).toEqual({ id: 'a', mode: 'document-pip' });
    const pip = await requestWindow.mock.results[0].value;
    const frame = pip.document.querySelector('iframe');
    expect(frame.getAttribute('src')).toBe('https://example.com/a');
    expect(frame.getAttribute('sandbox')).toBe(PIP_APP_SANDBOX);
    expect(open).not.toHaveBeenCalled();
  });

  it('comes back in when the picture-in-picture window is closed', async () => {
    const popout = create();
    await popout.popOut(def('a'), { w: 400, h: 300 });
    const pip = await requestWindow.mock.results[0].value;
    pip.fire('pagehide');
    expect(popout.poppedOut()).toBeNull();
  });

  it('brings the previous window back before popping out another', async () => {
    const popout = create();
    await popout.popOut(def('a'), { w: 400, h: 300 });
    const first = await requestWindow.mock.results[0].value;
    await popout.popOut(def('b'), { w: 400, h: 300 });
    expect(first.close).toHaveBeenCalled();
    expect(popout.poppedOut()).toEqual({ id: 'b', mode: 'document-pip' });
    // the first window's late pagehide must not pop the second one back in
    first.fire('pagehide');
    expect(popout.poppedOut()?.id).toBe('b');
  });

  it('closes the external window when its PiP App window is closed', async () => {
    const popout = create();
    await popout.popOut(def('a'), { w: 400, h: 300 });
    const pip = await requestWindow.mock.results[0].value;
    windows.set([def('b')]);
    TestBed.tick();
    expect(pip.close).toHaveBeenCalled();
    expect(popout.poppedOut()).toBeNull();
  });

  it('carries night mode into the picture-in-picture window', async () => {
    const popout = create();
    await popout.popOut(def('a'), { w: 400, h: 300 });
    const pip = await requestWindow.mock.results[0].value;
    expect(pip.document.body.style.filter).toBe('');
    night.set(true);
    TestBed.tick();
    expect(pip.document.body.style.filter).toContain('brightness(0.3)');
  });

  it('stays in the page when the browser refuses the window', async () => {
    requestWindow.mockRejectedValueOnce(new Error('no gesture'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const popout = create();
    await popout.popOut(def('a'), { w: 400, h: 300 });
    expect(popout.poppedOut()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('falls back to a noopener popup without the API or when embedded', async () => {
    topWindow = false;
    const popout = create();
    expect(popout.alwaysOnTop).toBe(false);
    await popout.popOut(def('a'), { w: 400, h: 300 });
    expect(requestWindow).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      'https://example.com/a',
      'fsk-pip-a',
      'popup=yes,noopener,width=400,height=300'
    );
    expect(popout.poppedOut()).toEqual({ id: 'a', mode: 'popup' });
    popout.popIn('a');
    expect(popout.poppedOut()).toBeNull();
  });
});
