import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppFacade } from '../../app.facade';
import { PIP_APP_SOFT_LIMIT, PipAppService } from './pip-app.service';
import { PipAppDef } from './types';

const wifish = { kind: 'webapp' as const, path: '/signalk-wifish/' };

describe('PipAppService', () => {
  let app: {
    config: { pipApps: { windows: PipAppDef[] } };
    config$: Subject<string>;
    hostDef: { url: string };
    saveConfig: ReturnType<typeof vi.fn>;
    saveConfigDebounced: ReturnType<typeof vi.fn>;
    showMessage: ReturnType<typeof vi.fn>;
    debug: () => void;
  };
  let appsList: ReturnType<typeof vi.fn>;

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        PipAppService,
        { provide: AppFacade, useValue: app },
        { provide: SignalKClient, useValue: { apps: { list: appsList } } }
      ]
    });
    return TestBed.inject(PipAppService);
  };

  beforeEach(() => {
    app = {
      config: { pipApps: { windows: [] } },
      config$: new Subject<string>(),
      hostDef: { url: 'http://boat.local:3000' },
      saveConfig: vi.fn(),
      saveConfigDebounced: vi.fn(),
      showMessage: vi.fn(),
      debug: () => undefined
    };
    appsList = vi.fn(() =>
      of([{ name: 'signalk-wifish', location: '/signalk-wifish/' }])
    );
  });

  it('opens a window, brings it to the front and persists it', () => {
    const service = create();
    const def = service.open(wifish, 'Sounder');
    expect(def.title).toBe('Sounder');
    expect(service.windows()).toEqual([def]);
    expect(service.zOrder()).toEqual([def.id]);
    expect(app.config.pipApps.windows).toEqual([def]);
    expect(app.saveConfig).toHaveBeenCalled();
  });

  it('focuses the open window instead of opening the same source twice', () => {
    const service = create();
    const a = service.open(wifish);
    const b = service.open({ kind: 'url', url: 'https://example.com' });
    expect(service.zOrder()).toEqual([a.id, b.id]);
    expect(service.open({ ...wifish })).toBe(a);
    expect(service.windows().length).toBe(2);
    expect(service.zOrder()).toEqual([b.id, a.id]);
  });

  it('refuses sources that cannot be framed', () => {
    const service = create();
    expect(
      service.open({ kind: 'url', url: 'javascript:alert(1)' })
    ).toBeNull();
    expect(service.open({ kind: 'webapp', path: 'relative' })).toBeNull();
    expect(service.windows()).toEqual([]);
  });

  it('closes one window or all of them', () => {
    const service = create();
    const a = service.open(wifish);
    service.open({ kind: 'url', url: 'https://example.com' });
    service.close(a.id);
    expect(service.windows().map((w) => w.title)).toEqual(['example.com']);
    service.closeAll();
    expect(service.windows()).toEqual([]);
    expect(service.zOrder()).toEqual([]);
    expect(app.config.pipApps.windows).toEqual([]);
  });

  it('stores a new layout with a debounced save and ignores bad values', () => {
    const service = create();
    const a = service.open(wifish);
    service.setRect(a.id, { x: 0.2, y: 0.3, w: 0.4, h: 0.5 });
    expect(service.windows()[0].rect).toEqual({
      x: 0.2,
      y: 0.3,
      w: 0.4,
      h: 0.5
    });
    expect(app.saveConfigDebounced).toHaveBeenCalled();
    service.setRect(a.id, { x: 2, y: 0, w: 0.4, h: 0.5 });
    expect(service.windows()[0].rect.x).toBe(0.2);
  });

  it('restores stored windows and reloads them when the config is replaced', () => {
    const stored: PipAppDef = {
      id: 'kept',
      title: 'Sounder',
      source: wifish,
      rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
      collapsed: false,
      opacity: 1
    };
    app.config.pipApps.windows = [stored];
    const service = create();
    expect(service.windows()).toEqual([stored]);
    app.config = { pipApps: { windows: [] } };
    app.config$.next('ready');
    expect(service.windows()).toEqual([]);
  });

  it('collapses, expands and sets opacity, persisting each change', () => {
    const service = create();
    const a = service.open(wifish);
    expect([a.collapsed, a.opacity]).toEqual([false, 1]);
    service.setCollapsed(a.id, true);
    service.setOpacity(a.id, 0.05);
    expect(service.windows()[0]).toMatchObject({
      collapsed: true,
      opacity: 0.3
    });
    expect(app.config.pipApps.windows[0]).toMatchObject({ collapsed: true });
  });

  it('reveals a collapsed window when it is chosen again', () => {
    const service = create();
    const a = service.open(wifish);
    const b = service.open({ kind: 'url', url: 'https://example.com' });
    service.setCollapsed(a.id, true);
    service.open(wifish);
    expect(service.windows()[0].collapsed).toBe(false);
    expect(service.zOrder()).toEqual([b.id, a.id]);
  });

  it('converts a pixel rectangle into on-screen viewport fractions', () => {
    const service = create();
    service.viewport.set({ w: 1000, h: 800 });
    expect(service.rectFromPixels({ x: 640, y: 60, w: 350, h: 680 })).toEqual({
      x: 0.64,
      y: 0.075,
      w: 0.35,
      h: 0.85
    });
    expect(
      service.rectFromPixels({ x: 900, y: 60, w: 350, h: 680 }).x
    ).toBeCloseTo(0.65);
  });

  it('warns once the soft limit of open windows is passed', () => {
    const service = create();
    for (let i = 0; i <= PIP_APP_SOFT_LIMIT; i++) {
      service.open({ kind: 'url', url: `https://example.com/${i}` });
    }
    expect(app.showMessage).toHaveBeenCalledTimes(1);
  });

  it('lists installed webapps for the launcher', () => {
    const service = create();
    service.refreshWebapps();
    expect(service.webapps()).toEqual([
      {
        name: 'signalk-wifish',
        description: undefined,
        url: '/signalk-wifish/'
      }
    ]);
  });
});
