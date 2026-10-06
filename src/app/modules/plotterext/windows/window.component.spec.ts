import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuTrigger } from '@angular/material/menu';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlotterExtensionService } from '../plotterext.service';
import {
  BAR_HIDE_DELAY_MS,
  BAR_LEAVE_DELAY_MS,
  ExtWindowComponent
} from './window.component';
import { ExtWindowService } from './window.service';
import { PointerEventInit, extWindow, pointerEvent } from './testing';
import { WINDOW_SANDBOX } from './types';

const def = extWindow();

describe('ExtWindowComponent', () => {
  let fixture: ComponentFixture<ExtWindowComponent>;
  let service: ExtWindowService;
  let host: HTMLElement;
  let ext: {
    resolveAssetUrl: (u: string) => string;
    attachWindow: ReturnType<typeof vi.fn>;
  };
  let detach: ReturnType<typeof vi.fn>;

  const pointer = (
    target: Element,
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

  const mount = (d = def) => {
    fixture = TestBed.createComponent(ExtWindowComponent);
    fixture.componentRef.setInput('def', d);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    detach = vi.fn();
    ext = {
      resolveAssetUrl: (u) => `http://boat.local:3000${u}`,
      attachWindow: vi.fn(() => detach)
    };
    TestBed.configureTestingModule({
      imports: [ExtWindowComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PlotterExtensionService, useValue: ext }
      ]
    });
    service = TestBed.inject(ExtWindowService);
    service.area.set({ w: 1000, h: 800 });
    service.zOrder.set(['other', 'w1']);
    for (const m of [
      'focus',
      'setRectFromGesture',
      'setCollapsed',
      'setOpacity',
      'userClose'
    ] as const) {
      vi.spyOn(service, m).mockImplementation(() => undefined);
    }
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
    const bar = withCapture(host.querySelector('.fb-pe-window__bar'));
    pointer(bar, 'pointerdown', 200, 100);
    pointer(bar, 'pointermove', 300, 180);
    expect(service.gestureActive()).toBe(true);
    return bar;
  };

  it("shows the extension's panel in an iframe with exactly the baseline sandbox", () => {
    const iframe = host.querySelector('iframe');
    expect(iframe.getAttribute('src')).toBe(
      'http://boat.local:3000/plotterext/ext-a/viewer.html'
    );
    expect(iframe.getAttribute('sandbox')).toBe(WINDOW_SANDBOX);
    expect(iframe.getAttribute('sandbox').split(' ').sort().join(' ')).toBe(
      'allow-forms allow-same-origin allow-scripts'
    );
  });

  it('connects the iframe to the bus as a window context, and detaches on destroy', () => {
    expect(ext.attachWindow).toHaveBeenCalledWith(
      host.querySelector('iframe'),
      def
    );
    fixture.destroy();
    expect(detach).toHaveBeenCalledTimes(1);
  });

  it('stacks by z-order, colours the front bar and takes focus on press', () => {
    expect(host.style.zIndex).toBe('4');
    expect(host.querySelector('.fb-pe-window__bar').classList).toContain(
      'front'
    );
    pointer(host, 'pointerdown', 200, 100);
    expect(service.focus).toHaveBeenCalledWith('w1');
  });

  it('keeps the same iframe when moved, renamed, faded or the area changes', () => {
    expect(host.style.transform).toBe('translate(100px, 80px)');
    expect(host.style.width).toBe('400px');
    expect(host.style.height).toBe('400px');
    const iframe = host.querySelector('iframe');
    fixture.componentRef.setInput('def', {
      ...def,
      title: 'Echo',
      opacity: 0.6,
      geometry: { anchor: 'bottom-right', width: 200, height: 160 }
    });
    service.area.set({ w: 800, h: 700 });
    fixture.detectChanges();
    expect(host.querySelector('iframe')).toBe(iframe);
    expect(host.style.transform).toBe('translate(600px, 540px)');
    expect(host.style.opacity).toBe('0.6');
    expect(ext.attachWindow).toHaveBeenCalledTimes(1);
  });

  it('drags the title bar and commits the pixel rectangle reached', () => {
    const bar = startBarDrag();
    pointer(bar, 'pointerup', 300, 180);
    expect(service.gestureActive()).toBe(false);
    expect(service.setRectFromGesture).toHaveBeenCalledWith('w1', {
      x: 200,
      y: 160,
      w: 400,
      h: 400
    });
  });

  it('commits the layout reached when the pointer is cancelled', () => {
    const bar = startBarDrag();
    pointer(bar, 'pointercancel', 300, 180);
    expect(service.gestureActive()).toBe(false);
    expect(service.setRectFromGesture).toHaveBeenCalledTimes(1);
  });

  it('abandons a drag without committing when destroyed mid-gesture', () => {
    startBarDrag();
    fixture.destroy();
    expect(service.gestureActive()).toBe(false);
    expect(service.setRectFromGesture).not.toHaveBeenCalled();
  });

  it.each<[string, Omit<PointerEventInit, 'x' | 'y'>]>([
    ['a secondary mouse button', { button: 2 }],
    ['a non-primary pointer', { pointerType: 'touch', isPrimary: false }]
  ])('does not start a drag from %s', (_, init) => {
    const bar = withCapture(host.querySelector('.fb-pe-window__bar'));
    pointer(bar, 'pointerdown', 200, 100, init);
    expect(service.gestureActive()).toBe(false);
  });

  it('resizes from the south-east corner', () => {
    const handle = withCapture(
      host.querySelector('.fb-pe-window__handle[data-mode="se"]')
    );
    pointer(handle, 'pointerdown', 500, 480);
    pointer(handle, 'pointermove', 600, 560);
    pointer(handle, 'pointerup', 600, 560);
    expect(service.setRectFromGesture).toHaveBeenCalledWith('w1', {
      x: 100,
      y: 80,
      w: 500,
      h: 480
    });
  });

  it('lets the user neither move nor resize a window that forbids it', () => {
    fixture.destroy();
    mount(extWindow({ movable: false, resizable: false }));
    const bar = withCapture(host.querySelector('.fb-pe-window__bar'));
    pointer(bar, 'pointerdown', 200, 100);
    expect(service.gestureActive()).toBe(false);
    expect(host.querySelector('.fb-pe-window__handle')).toBeNull();
  });

  it('does not start a drag from the title bar buttons', () => {
    const bar = withCapture(host.querySelector('.fb-pe-window__bar'));
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

  it('hides without dropping the iframe', () => {
    const iframe = host.querySelector('iframe');
    fixture.componentRef.setInput('def', { ...def, visible: false });
    fixture.detectChanges();
    expect(host.classList).toContain('hidden');
    expect(host.querySelector('iframe')).toBe(iframe);
    expect(detach).not.toHaveBeenCalled();
  });

  it('moves a collapsed window but keeps the size it expands back to', () => {
    fixture.componentRef.setInput('def', { ...def, collapsed: true });
    fixture.detectChanges();
    const bar = startBarDrag();
    pointer(bar, 'pointerup', 300, 180);
    expect(service.setRectFromGesture).toHaveBeenCalledWith('w1', {
      x: 200,
      y: 160,
      w: 400,
      h: 400
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
      .querySelector('.fb-pe-window__title')
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(service.setCollapsed).toHaveBeenCalledTimes(2);
  });

  it('floats the title bar over the panel and hides it once idle', () => {
    const iframe = host.querySelector('iframe');
    expect(host.classList).toContain('bar-overlay');
    expect(idle(BAR_HIDE_DELAY_MS - 1)).toBe(false);
    expect(idle(1)).toBe(true);
    expect(host.querySelector('iframe')).toBe(iframe);
  });

  it('brings the bar back from the grip, which also drags the window', () => {
    idle(BAR_HIDE_DELAY_MS);
    const grip = withCapture(host.querySelector('.fb-pe-window__grip'));
    pointer(grip, 'pointerenter', 300, 85);
    expect(barHidden()).toBe(false);
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);

    pointer(grip, 'pointerdown', 300, 85);
    expect(barHidden()).toBe(false);
    pointer(grip, 'pointermove', 400, 165);
    expect(idle(BAR_HIDE_DELAY_MS * 2)).toBe(false);
    pointer(grip, 'pointerup', 400, 165);
    expect(service.setRectFromGesture).toHaveBeenCalledWith('w1', {
      x: 200,
      y: 160,
      w: 400,
      h: 400
    });
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);
  });

  it('brings the bar back from the top resize handle but not the bottom one', () => {
    idle(BAR_HIDE_DELAY_MS);
    pointer(
      host.querySelector('.fb-pe-window__handle[data-mode="s"]'),
      'pointerenter'
    );
    expect(barHidden()).toBe(true);
    pointer(
      host.querySelector('.fb-pe-window__handle[data-mode="n"]'),
      'pointerenter'
    );
    expect(barHidden()).toBe(false);
  });

  it('keeps the bar while hovered and hides it soon after the mouse leaves', () => {
    const bar = host.querySelector('.fb-pe-window__bar') as HTMLElement;
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

  it('never hides a fixed or collapsed title bar', () => {
    for (const change of [
      { titleBar: 'fixed' as const },
      { collapsed: true }
    ]) {
      fixture.componentRef.setInput('def', { ...def, ...change });
      expect(idle(BAR_HIDE_DELAY_MS * 3)).toBe(false);
      expect(host.classList).not.toContain('bar-overlay');
      expect(host.querySelector('.fb-pe-window__grip')).toBeNull();
    }
  });

  it('shows the bar again when auto-hide resumes', () => {
    fixture.componentRef.setInput('def', { ...def, collapsed: true });
    idle(BAR_HIDE_DELAY_MS);
    fixture.componentRef.setInput('def', def);
    expect(barHidden()).toBe(false);
    expect(idle(BAR_HIDE_DELAY_MS)).toBe(true);
  });

  it('sets the opacity from the menu', () => {
    fixture.debugElement
      .query(By.directive(MatMenuTrigger))
      .injector.get(MatMenuTrigger)
      .openMenu();
    fixture.detectChanges();
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
    ).find((b) => b.textContent.includes('60%'));
    item.click();
    expect(service.setOpacity).toHaveBeenCalledWith('w1', 0.6);
  });

  it('closes through the user path, labelled for what it does', () => {
    (host.querySelector('button[aria-label="Close"]') as HTMLElement).click();
    expect(service.userClose).toHaveBeenCalledWith('w1');
    fixture.componentRef.setInput('def', { ...def, userClose: 'hide' });
    fixture.detectChanges();
    expect(host.querySelector('button[aria-label="Close"]')).toBeNull();
    (host.querySelector('button[aria-label="Hide"]') as HTMLElement).click();
    expect(service.userClose).toHaveBeenCalledTimes(2);
  });

  it('keeps a modal window to a title and a close control', () => {
    fixture.componentRef.setInput('def', {
      ...def,
      modal: true,
      userClose: 'hide'
    });
    fixture.detectChanges();
    expect(host.classList).toContain('modal');
    expect(host.querySelector('button[aria-label="Collapse"]')).toBeNull();
    expect(host.querySelector('button[aria-label="More"]')).toBeNull();
    // a modal window cannot be hidden, so its control always closes
    expect(host.querySelector('button[aria-label="Close"]')).not.toBeNull();
  });

  it('becomes a full-width sheet on a narrow area, with no move or resize', () => {
    service.area.set({ w: 400, h: 800 });
    fixture.detectChanges();
    expect(host.classList).toContain('sheet');
    expect(host.style.width).toBe('400px');
    expect(host.style.transform).toBe('translate(0px, 400px)');
    expect(host.querySelector('.fb-pe-window__handle')).toBeNull();
    const bar = withCapture(host.querySelector('.fb-pe-window__bar'));
    pointer(bar, 'pointerdown', 200, 420);
    expect(service.gestureActive()).toBe(false);
  });
});
