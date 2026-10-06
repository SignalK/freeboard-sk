import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PIP_APP_GESTURE_CLASS,
  PipAppHostComponent
} from './pip-app-host.component';
import { PipAppPopoutService } from './pip-app-popout.service';
import { PipAppService } from './pip-app.service';
import { pipAppDef, pointerEvent } from './testing';
import { PipAppDef } from './types';

const a = pipAppDef({ id: 'a' });
const b = pipAppDef({
  id: 'b',
  title: 'Web',
  source: { kind: 'url', url: 'https://example.com/' }
});

describe('PipAppHostComponent', () => {
  let fixture: ComponentFixture<PipAppHostComponent>;
  let host: HTMLElement;
  let service: {
    windows: ReturnType<typeof signal<PipAppDef[]>>;
    zOrder: ReturnType<typeof signal<string[]>>;
    gestureActive: ReturnType<typeof signal<boolean>>;
    viewport: ReturnType<typeof signal<{ w: number; h: number }>>;
    resolveUrl: (s: PipAppDef['source']) => string;
    focus: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    updateViewport: ReturnType<typeof vi.fn>;
    setRect: ReturnType<typeof vi.fn>;
    setCollapsed: ReturnType<typeof vi.fn>;
    setBarPinned: ReturnType<typeof vi.fn>;
    setOpacity: ReturnType<typeof vi.fn>;
  };

  const windowEl = (id: string) =>
    host.querySelector<HTMLElement>(`fb-pip-app[data-pip-id="${id}"]`);

  beforeEach(() => {
    vi.useFakeTimers();
    service = {
      windows: signal([a, b]),
      zOrder: signal(['b', 'a']),
      gestureActive: signal(false),
      viewport: signal({ w: 1000, h: 800 }),
      resolveUrl: (s) =>
        s.kind === 'webapp' ? `http://boat.local:3000${s.path}` : s.url,
      focus: vi.fn(),
      close: vi.fn(),
      updateViewport: vi.fn(),
      setRect: vi.fn(),
      setCollapsed: vi.fn(),
      setBarPinned: vi.fn(),
      setOpacity: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [PipAppHostComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PipAppService, useValue: service },
        {
          provide: PipAppPopoutService,
          useValue: { modeOf: () => null, alwaysOnTop: false }
        }
      ]
    });
    fixture = TestBed.createComponent(PipAppHostComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    document.body.classList.remove(PIP_APP_GESTURE_CLASS);
    vi.useRealTimers();
  });

  it('renders one window per definition, stacked in z-order', () => {
    expect(host.querySelectorAll('fb-pip-app').length).toBe(2);
    expect(windowEl('b').style.zIndex).toBe('1');
    expect(windowEl('a').style.zIndex).toBe('2');
    expect(windowEl('a').querySelector('.fb-pip-app__bar').classList).toContain(
      'front'
    );
    expect(
      windowEl('b').querySelector('.fb-pip-app__bar').classList
    ).not.toContain('front');
  });

  it('marks the page while a window is being moved or resized', () => {
    expect(document.body.classList).not.toContain(PIP_APP_GESTURE_CLASS);
    service.gestureActive.set(true);
    fixture.detectChanges();
    expect(document.body.classList).toContain(PIP_APP_GESTURE_CLASS);
    service.gestureActive.set(false);
    fixture.detectChanges();
    expect(document.body.classList).not.toContain(PIP_APP_GESTURE_CLASS);
  });

  it('brings a pressed window to the front', () => {
    windowEl('b').dispatchEvent(pointerEvent('pointerdown'));
    expect(service.focus).toHaveBeenCalledWith('b');
  });

  it('closes a window from its button and tells the map', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    windowEl('a')
      .querySelector<HTMLElement>('button[aria-label="Close"]')
      .click();
    expect(service.close).toHaveBeenCalledWith('a');
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('updates the viewport once per frame however many resizes arrive', () => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    expect(service.updateViewport).not.toHaveBeenCalled();
    vi.advanceTimersToNextFrame();
    expect(service.updateViewport).toHaveBeenCalledTimes(1);
  });

  it('brings a window to the front when a click lands in its embedded app', () => {
    windowEl('b').querySelector('iframe').focus();
    expect(document.activeElement.tagName).toBe('IFRAME');
    window.dispatchEvent(new Event('blur'));
    vi.runOnlyPendingTimers();
    expect(service.focus).toHaveBeenCalledWith('b');
  });
});
