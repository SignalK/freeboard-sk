import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuTrigger } from '@angular/material/menu';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BAR_HIDE_DELAY_MS,
  BAR_LEAVE_DELAY_MS,
  PipAppWindowComponent
} from './pip-app-window.component';
import { PipAppPopoutService } from './pip-app-popout.service';
import { PipAppService } from './pip-app.service';
import { PointerEventInit, pipAppDef, pointerEvent } from './testing';
import { PIP_APP_SANDBOX, PipAppDef } from './types';

const def = pipAppDef();

describe('PipAppWindowComponent', () => {
  let fixture: ComponentFixture<PipAppWindowComponent>;
  let service: {
    viewport: ReturnType<typeof signal<{ w: number; h: number }>>;
    gestureActive: ReturnType<typeof signal<boolean>>;
    zOrder: ReturnType<typeof signal<string[]>>;
    resolveUrl: (s: PipAppDef['source']) => string | null;
    focus: ReturnType<typeof vi.fn>;
    setRect: ReturnType<typeof vi.fn>;
    setCollapsed: ReturnType<typeof vi.fn>;
    setBarPinned: ReturnType<typeof vi.fn>;
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
    target: HTMLElement,
    type: string,
    x = 0,
    y = 0,
    init: Omit<PointerEventInit, 'x' | 'y'> = {}
  ) => target.dispatchEvent(pointerEvent(type, { x, y, ...init }));

  const withCapture = (el: HTMLElement) => {
    el.setPointerCapture = vi.fn();
    el.hasPointerCapture = vi.fn(() => true);
    el.releasePointerCapture = vi.fn();
    return el;
  };

  const mount = () => {
    fixture = TestBed.createComponent(PipAppWindowComponent);
    fixture.componentRef.setInput('def', def);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    service = {
      viewport: signal({ w: 1000, h: 800 }),
      gestureActive: signal(false),
      zOrder: signal(['other', 'w1']),
      resolveUrl: (s) =>
        s.kind === 'webapp' ? `http://boat.local:3000${s.path}` : s.url,
      focus: vi.fn(),
      setRect: vi.fn(),
      setCollapsed: vi.fn(),
      setBarPinned: vi.fn(),
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
    mount();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const barHidden = () => {
    fixture.detectChanges();
    return host.classList.contains('bar-hidden');
  };

  const idle = (ms: number) => {
    vi.advanceTimersByTime(ms);
    return barHidden();
  };

  /** A drag of the title bar that is still in progress. */
  const startBarDrag = () => {
    const bar = withCapture(host.querySelector('.fb-pip-app__bar'));
    pointer(bar, 'pointerdown', 200, 100);
    pointer(bar, 'pointermove', 300, 180);
    expect(service.gestureActive()).toBe(true);
    return bar;
  };

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

  it('shows an error instead of an iframe for an address that cannot be framed', () => {
    fixture.destroy();
    service.resolveUrl = () => null;
    mount();
    expect(host.querySelector('iframe')).toBeNull();
    expect(host.textContent).toContain('This address cannot be shown.');
    expect(host.classList).not.toContain('bar-overlay');
  });

  it('stacks by z-order, colours the front bar and takes focus on press', () => {
    expect(host.style.zIndex).toBe('2');
    expect(host.querySelector('.fb-pip-app__bar').classList).toContain('front');
    pointer(host, 'pointerdown', 200, 100);
    expect(service.focus).toHaveBeenCalledWith('w1');
  });

  it('keeps the same iframe when moved, renamed, faded or the viewport changes', () => {
    expect(host.style.transform).toBe('translate(100px, 80px)');
    expect(host.style.width).toBe('400px');
    expect(host.style.height).toBe('400px');
    const iframe = host.querySelector('iframe');
    fixture.componentRef.setInput('def', {
      ...def,
      title: 'Echo',
      opacity: 0.6,
      rect: { x: 0.3, y: 0.3, w: 0.2, h: 0.2 }
    });
    service.viewport.set({ w: 500, h: 400 });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).toBe(iframe);
    expect(host.style.transform).toBe('translate(150px, 120px)');
    expect(host.style.opacity).toBe('0.6');
  });

  it('drags the title bar and commits the new layout as fractions', () => {
    const bar = startBarDrag();
    pointer(bar, 'pointerup', 300, 180);
    expect(service.gestureActive()).toBe(false);
    expect(service.setRect).toHaveBeenCalledWith('w1', {
      x: 0.2,
      y: 0.2,
      w: 0.4,
      h: 0.5
    });
  });

  it('commits the layout reached when the pointer is cancelled', () => {
    const bar = startBarDrag();
    pointer(bar, 'pointercancel', 300, 180);
    expect(service.gestureActive()).toBe(false);
    expect(service.setRect).toHaveBeenCalledTimes(1);
  });

  it('abandons a drag without committing when destroyed mid-gesture', () => {
    startBarDrag();
    fixture.destroy();
    expect(service.gestureActive()).toBe(false);
    expect(service.setRect).not.toHaveBeenCalled();
  });

  it.each<[string, Omit<PointerEventInit, 'x' | 'y'>]>([
    ['a secondary mouse button', { button: 2 }],
    ['a non-primary pointer', { pointerType: 'touch', isPrimary: false }]
  ])('does not start a drag from %s', (_, init) => {
    const bar = withCapture(host.querySelector('.fb-pip-app__bar'));
    pointer(bar, 'pointerdown', 200, 100, init);
    expect(service.gestureActive()).toBe(false);
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
    const collapse = bar.querySelector<HTMLElement>(
      'button[aria-label="Collapse"]'
    );
    pointer(collapse, 'pointerdown', 200, 100);
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
    const bar = startBarDrag();
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

  it('shows Bring back instead of the app only while it is popped out itself', () => {
    popout.out.set({ id: 'w1', mode: 'popup' });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).toBeNull();
    expect(host.querySelector('.fb-pip-app__out').textContent).toContain(
      'If it did not open, select Bring back'
    );
    (host.querySelector('.fb-pip-app__out button') as HTMLElement).click();
    expect(popout.popIn).toHaveBeenCalledWith('w1');
    popout.out.set(null);
    fixture.detectChanges();
    expect(host.querySelector('iframe')).not.toBeNull();
    popout.out.set({ id: 'other', mode: 'document-pip' });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).not.toBeNull();
    expect(host.querySelector('.fb-pip-app__out')).toBeNull();
  });

  it('floats the title bar over the app and hides it once idle', () => {
    const iframe = host.querySelector('iframe');
    expect(host.classList).toContain('bar-overlay');
    expect(idle(BAR_HIDE_DELAY_MS - 1)).toBe(false);
    expect(idle(1)).toBe(true);
    expect(host.querySelector('iframe')).toBe(iframe);
  });

  it('brings the bar back from the grip, which also drags the window', () => {
    idle(BAR_HIDE_DELAY_MS);
    const grip = withCapture(host.querySelector('.fb-pip-app__grip'));
    pointer(grip, 'pointerenter', 500, 85);
    expect(barHidden()).toBe(false);
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);

    pointer(grip, 'pointerdown', 500, 85);
    expect(barHidden()).toBe(false);
    pointer(grip, 'pointermove', 600, 165);
    expect(idle(BAR_HIDE_DELAY_MS * 2)).toBe(false);
    pointer(grip, 'pointerup', 600, 165);
    expect(service.setRect).toHaveBeenCalledWith('w1', {
      x: 0.2,
      y: 0.2,
      w: 0.4,
      h: 0.5
    });
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);
  });

  it('brings the bar back from the top resize handle but not the bottom one', () => {
    idle(BAR_HIDE_DELAY_MS);
    pointer(
      host.querySelector('.fb-pip-app__handle[data-mode="s"]'),
      'pointerenter'
    );
    expect(barHidden()).toBe(true);
    pointer(
      host.querySelector('.fb-pip-app__handle[data-mode="n"]'),
      'pointerenter'
    );
    expect(barHidden()).toBe(false);
  });

  it('keeps the bar while hovered and hides it soon after the mouse leaves', () => {
    const bar = host.querySelector('.fb-pip-app__bar') as HTMLElement;
    pointer(bar, 'pointerenter', 200, 90);
    expect(idle(BAR_HIDE_DELAY_MS * 3)).toBe(false);
    pointer(bar, 'pointerleave', 200, 200);
    expect(idle(BAR_LEAVE_DELAY_MS - 1)).toBe(false);
    expect(idle(1)).toBe(true);
  });

  it('keeps the bar while its menu is open', () => {
    const trigger = fixture.debugElement
      .query(By.directive(MatMenuTrigger))
      .injector.get(MatMenuTrigger);
    trigger.openMenu();
    expect(idle(BAR_HIDE_DELAY_MS * 3)).toBe(false);
    trigger.closeMenu();
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);
  });

  it('keeps the bar while keyboard focus is on one of its buttons', () => {
    idle(BAR_HIDE_DELAY_MS);
    const button = host.querySelector<HTMLElement>(
      'button[aria-label="Collapse"]'
    );
    // jsdom decides :focus-visible from the last key or mouse event it saw,
    // so the focus has to arrive the way keyboard focus does: by Tab.
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    button.focus();
    expect(button.matches(':focus-visible')).toBe(true);
    expect(idle(BAR_HIDE_DELAY_MS * 3)).toBe(false);
    button.blur();
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);
  });

  it('never hides the bar of a pinned or collapsed window', () => {
    for (const change of [{ barPinned: true }, { collapsed: true }]) {
      fixture.componentRef.setInput('def', { ...def, ...change });
      expect(idle(BAR_HIDE_DELAY_MS * 3)).toBe(false);
      expect(host.classList).not.toContain('bar-overlay');
      expect(host.querySelector('.fb-pip-app__grip')).toBeNull();
    }
  });

  it('shows the bar again when auto-hide resumes', () => {
    fixture.componentRef.setInput('def', { ...def, collapsed: true });
    idle(BAR_HIDE_DELAY_MS);
    fixture.componentRef.setInput('def', def);
    expect(barHidden()).toBe(false);
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);
  });

  it('turns auto-hide off and on from the menu', () => {
    fixture.debugElement
      .query(By.directive(MatMenuTrigger))
      .injector.get(MatMenuTrigger)
      .openMenu();
    fixture.detectChanges();
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')
    ).find((b) => b.textContent.includes('Auto-hide title bar'));
    expect(item.getAttribute('aria-checked')).toBe('true');
    item.click();
    expect(service.setBarPinned).toHaveBeenCalledWith('w1', true);
  });

  it('emits close with its id', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    (host.querySelector('button[aria-label="Close"]') as HTMLElement).click();
    expect(closed).toHaveBeenCalledWith('w1');
  });
});
