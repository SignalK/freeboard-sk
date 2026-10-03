import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PipAppWindowComponent } from './pip-app-window.component';
import { PipAppPopoutService } from './pip-app-popout.service';
import { PipAppService } from './pip-app.service';
import { PIP_APP_SANDBOX, PipAppDef } from './types';

const def: PipAppDef = {
  id: 'w1',
  title: 'Sounder',
  source: { kind: 'webapp', path: '/signalk-wifish/' },
  rect: { x: 0.1, y: 0.1, w: 0.4, h: 0.5 },
  collapsed: false,
  opacity: 1
};

describe('PipAppWindowComponent', () => {
  let fixture: ComponentFixture<PipAppWindowComponent>;
  let service: {
    viewport: ReturnType<typeof signal<{ w: number; h: number }>>;
    gestureActive: ReturnType<typeof signal<boolean>>;
    resolveUrl: (s: PipAppDef['source']) => string;
    setRect: ReturnType<typeof vi.fn>;
    setCollapsed: ReturnType<typeof vi.fn>;
    setOpacity: ReturnType<typeof vi.fn>;
  };
  let host: HTMLElement;
  let popout: {
    out: ReturnType<
      typeof signal<{ id: string; mode: 'document-pip' | 'popup' } | null>
    >;
    modeOf: (d: PipAppDef) => 'document-pip' | 'popup' | null;
    alwaysOnTop: boolean;
    popOut: ReturnType<typeof vi.fn>;
    popIn: ReturnType<typeof vi.fn>;
  };

  const pointer = (
    el: HTMLElement,
    type: string,
    x: number,
    y: number,
    target: HTMLElement = el
  ) => {
    const e = new MouseEvent(type, {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      button: 0
    });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    Object.defineProperty(e, 'pointerType', { value: 'mouse' });
    Object.defineProperty(e, 'isPrimary', { value: true });
    target.dispatchEvent(e);
  };

  const withCapture = (el: HTMLElement) => {
    el.setPointerCapture = vi.fn();
    el.hasPointerCapture = vi.fn(() => true);
    el.releasePointerCapture = vi.fn();
    return el;
  };

  beforeEach(() => {
    service = {
      viewport: signal({ w: 1000, h: 800 }),
      gestureActive: signal(false),
      resolveUrl: (s) =>
        s.kind === 'webapp' ? `http://boat.local:3000${s.path}` : s.url,
      setRect: vi.fn(),
      setCollapsed: vi.fn(),
      setOpacity: vi.fn()
    };
    const out = signal<{ id: string; mode: 'document-pip' | 'popup' } | null>(
      null
    );
    popout = {
      out,
      modeOf: (d) => (out()?.id === d.id ? out().mode : null),
      alwaysOnTop: true,
      popOut: vi.fn(),
      popIn: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [PipAppWindowComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PipAppService, useValue: service },
        { provide: PipAppPopoutService, useValue: popout }
      ]
    });
    fixture = TestBed.createComponent(PipAppWindowComponent);
    fixture.componentRef.setInput('def', def);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('embeds the app in an iframe with exactly the baseline sandbox', () => {
    const iframe = host.querySelector('iframe');
    expect(iframe.getAttribute('src')).toBe(
      'http://boat.local:3000/signalk-wifish/'
    );
    expect(iframe.getAttribute('sandbox')).toBe(PIP_APP_SANDBOX);
    expect(iframe.getAttribute('sandbox').split(' ').sort().join(' ')).toBe(
      'allow-forms allow-same-origin allow-scripts'
    );
  });

  it('places itself from the stored viewport fractions', () => {
    expect(host.style.transform).toBe('translate(100px, 80px)');
    expect(host.style.width).toBe('400px');
    expect(host.style.height).toBe('400px');
  });

  it('keeps the same iframe when moved, renamed or the viewport changes', () => {
    const iframe = host.querySelector('iframe');
    fixture.componentRef.setInput('def', {
      ...def,
      title: 'Echo',
      rect: { x: 0.3, y: 0.3, w: 0.2, h: 0.2 }
    });
    service.viewport.set({ w: 500, h: 400 });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).toBe(iframe);
    expect(host.style.transform).toBe('translate(150px, 120px)');
  });

  it('drags the title bar and commits the new layout as fractions', () => {
    const bar = withCapture(host.querySelector('.fb-pip-app__bar'));
    pointer(bar, 'pointerdown', 200, 100);
    expect(service.gestureActive()).toBe(true);
    pointer(bar, 'pointermove', 300, 180);
    pointer(bar, 'pointerup', 300, 180);
    expect(service.gestureActive()).toBe(false);
    expect(service.setRect).toHaveBeenCalledWith('w1', {
      x: 0.2,
      y: 0.2,
      w: 0.4,
      h: 0.5
    });
  });

  it('resizes from the south-east corner', () => {
    const handle = withCapture(
      host.querySelector('.fb-pip-app__handle[data-mode="se"]')
    );
    pointer(handle, 'pointerdown', 500, 480);
    pointer(handle, 'pointermove', 600, 560);
    pointer(handle, 'pointerup', 600, 560);
    expect(service.setRect).toHaveBeenCalledWith('w1', {
      x: 0.1,
      y: 0.1,
      w: 0.5,
      h: 0.6
    });
  });

  it('does not start a drag from the title bar buttons', () => {
    const bar = withCapture(host.querySelector('.fb-pip-app__bar'));
    const close = host.querySelector('button');
    pointer(bar, 'pointerdown', 200, 100, close);
    expect(service.gestureActive()).toBe(false);
  });

  it('collapses to its title bar without dropping the iframe', () => {
    const iframe = host.querySelector('iframe');
    fixture.componentRef.setInput('def', { ...def, collapsed: true });
    fixture.detectChanges();
    expect(host.classList).toContain('collapsed');
    expect(host.style.height).toBe('34px');
    expect(host.querySelector('iframe')).toBe(iframe);
  });

  it('moves a collapsed window but keeps the size it expands back to', () => {
    fixture.componentRef.setInput('def', { ...def, collapsed: true });
    fixture.detectChanges();
    const bar = withCapture(host.querySelector('.fb-pip-app__bar'));
    pointer(bar, 'pointerdown', 200, 100);
    pointer(bar, 'pointermove', 300, 180);
    pointer(bar, 'pointerup', 300, 180);
    expect(service.setRect).toHaveBeenCalledWith('w1', {
      x: 0.2,
      y: 0.2,
      w: 0.4,
      h: 0.5
    });
    // the dragged rectangle stayed a title bar
    expect(host.style.height).toBe('34px');
  });

  it('toggles collapse from its button and a double-click on the title', () => {
    (
      host.querySelector('button[aria-label="Collapse"]') as HTMLElement
    ).click();
    expect(service.setCollapsed).toHaveBeenCalledWith('w1', true);
    host
      .querySelector('.fb-pip-app__title')
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(service.setCollapsed).toHaveBeenCalledTimes(2);
  });

  it('applies its opacity', () => {
    fixture.componentRef.setInput('def', { ...def, opacity: 0.6 });
    fixture.detectChanges();
    expect(host.style.opacity).toBe('0.6');
  });

  it('shows Bring back instead of the app while popped out', () => {
    popout.out.set({ id: 'w1', mode: 'popup' });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).toBeNull();
    expect(host.querySelector('.fb-pip-app__out').textContent).toContain(
      'Close that window'
    );
    (host.querySelector('.fb-pip-app__out button') as HTMLElement).click();
    expect(popout.popIn).toHaveBeenCalledWith('w1');
    popout.out.set(null);
    fixture.detectChanges();
    expect(host.querySelector('iframe')).not.toBeNull();
  });

  it('is unaffected when another window is popped out', () => {
    popout.out.set({ id: 'other', mode: 'document-pip' });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).not.toBeNull();
  });

  it('emits close with its id', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    (host.querySelector('button[aria-label="Close"]') as HTMLElement).click();
    expect(closed).toHaveBeenCalledWith('w1');
  });
});
