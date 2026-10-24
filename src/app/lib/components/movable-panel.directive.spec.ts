import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LONG_PRESS_MS,
  MovablePanelDirective
} from './movable-panel.directive';
import { loadPlacement, savePlacement } from '../movable-panel';

const KEY = 'movable-panel-directive-spec';

@Component({
  imports: [MovablePanelDirective],
  template: `
    <div id="area">
      <div id="panel" fbMovablePanel="${KEY}">
        <button id="btn" (click)="clicks = clicks + 1">Go</button>
        <span id="label" (click)="labelClicks = labelClicks + 1">1 of 3</span>
      </div>
    </div>
  `
})
class HostComponent {
  clicks = 0;
  labelClicks = 0;
}

/**
 * jsdom does no layout: give the panel a fixed size, a parent area, and
 * offsets that follow the inline left / right / top / bottom the directive
 * writes.
 */
function layout(
  panel: HTMLElement,
  area: HTMLElement,
  areaSize: { w: number; h: number },
  start = { x: 10, y: 470 }
) {
  const size = { w: 200, h: 100 };
  Object.defineProperties(area, {
    clientWidth: { get: () => areaSize.w },
    clientHeight: { get: () => areaSize.h }
  });
  const px = (v: string) => (v && v !== 'auto' ? parseFloat(v) : null);
  Object.defineProperties(panel, {
    offsetParent: { get: () => area },
    offsetWidth: { get: () => size.w },
    offsetHeight: { get: () => size.h },
    // An 8px horizontal scrollbar along the bottom.
    clientWidth: { get: () => size.w },
    clientHeight: { get: () => size.h - 8 },
    offsetLeft: {
      get: () => {
        const right = px(panel.style.right);
        return (
          px(panel.style.left) ??
          (right !== null ? areaSize.w - size.w - right : start.x)
        );
      }
    },
    offsetTop: {
      get: () => {
        const bottom = px(panel.style.bottom);
        return (
          px(panel.style.top) ??
          (bottom !== null ? areaSize.h - size.h - bottom : start.y)
        );
      }
    }
  });
  panel.getBoundingClientRect = () =>
    new DOMRect(panel.offsetLeft, panel.offsetTop, size.w, size.h);
}

/** Where the panel is drawn: its layout offset plus any drag transform. */
function shown(panel: HTMLElement) {
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(
    panel.style.transform
  );
  return {
    x: panel.offsetLeft + (m ? parseFloat(m[1]) : 0),
    y: panel.offsetTop + (m ? parseFloat(m[2]) : 0)
  };
}

interface PointerInit {
  x?: number;
  y?: number;
  pointerType?: 'mouse' | 'touch' | 'pen';
  button?: number;
}

/** jsdom has no PointerEvent constructor: build one from a MouseEvent. */
function pointer(target: EventTarget, type: string, init: PointerInit = {}) {
  const e = new MouseEvent(type, {
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    bubbles: true,
    cancelable: true,
    button: init.button ?? 0
  });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  Object.defineProperty(e, 'pointerType', {
    value: init.pointerType ?? 'mouse'
  });
  Object.defineProperty(e, 'isPrimary', { value: true });
  target.dispatchEvent(e);
}

describe('MovablePanelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let panel: HTMLElement;
  let label: HTMLElement;
  let button: HTMLElement;
  let areaSize: { w: number; h: number };

  async function mount() {
    fixture = TestBed.createComponent(HostComponent);
    const root: HTMLElement = fixture.nativeElement;
    panel = root.querySelector('#panel')!;
    label = root.querySelector('#label')!;
    button = root.querySelector('#btn')!;
    areaSize = { w: 1000, h: 600 };
    layout(panel, root.querySelector('#area')!, areaSize);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.removeItem(KEY);
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(KEY);
  });

  it('stays where its CSS puts it until it is moved', async () => {
    await mount();
    expect(panel.style.left).toBe('');
    expect(panel.style.top).toBe('');
    expect(panel.style.right).toBe('');
    expect(panel.style.bottom).toBe('');
  });

  it('moves with a mouse drag that starts off the controls, and remembers it', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 750, y: 520 });
    expect(shown(panel)).toEqual({ x: 710, y: 490 });
    pointer(window, 'pointerup', { x: 750, y: 520 });

    // Dropped: pinned by its nearest corner's own offsets, transform gone.
    expect(panel.style.transform).toBe('');
    expect(panel.style.right).toBe('90px');
    expect(panel.style.bottom).toBe('10px');
    expect(panel.style.left).toBe('auto');
    expect(shown(panel)).toEqual({ x: 710, y: 490 });

    expect(loadPlacement(KEY)).toEqual({
      corner: 'bottom-right',
      x: 90,
      y: 10
    });
  });

  it('keeps the panel inside its area while dragging', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: -500, y: 2000 });
    expect(shown(panel)).toEqual({ x: 0, y: 500 });
    pointer(window, 'pointerup');
  });

  it('leaves a press on a button to the button', async () => {
    await mount();
    pointer(button, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 400, y: 300 });
    pointer(window, 'pointerup', { x: 400, y: 300 });
    button.click();

    expect(shown(panel)).toEqual({ x: 10, y: 470 });
    expect(loadPlacement(KEY)).toBeNull();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('treats a press that barely moves as a click', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 52, y: 501 });
    pointer(window, 'pointerup', { x: 52, y: 501 });
    label.click();

    expect(shown(panel)).toEqual({ x: 10, y: 470 });
    expect(loadPlacement(KEY)).toBeNull();
    expect(fixture.componentInstance.labelClicks).toBe(1);
  });

  it('swallows the click that ends a drag', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 300, y: 300 });
    pointer(window, 'pointerup', { x: 300, y: 300 });
    label.click();
    expect(fixture.componentInstance.labelClicks).toBe(0);
  });

  it('leaves a press on its scrollbar to the scrollbar', async () => {
    await mount();
    pointer(panel, 'pointerdown', { x: 100, y: 566 });
    pointer(window, 'pointermove', { x: 300, y: 566 });
    expect(shown(panel)).toEqual({ x: 10, y: 470 });
  });

  it('moves with a press on its own background', async () => {
    await mount();
    pointer(panel, 'pointerdown', { x: 100, y: 520 });
    pointer(window, 'pointermove', { x: 300, y: 520 });
    expect(shown(panel)).toEqual({ x: 210, y: 470 });
    pointer(window, 'pointerup', { x: 300, y: 520 });
  });

  it('ignores a right-button press', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500, button: 2 });
    pointer(window, 'pointermove', { x: 400, y: 300 });
    expect(shown(panel)).toEqual({ x: 10, y: 470 });
  });

  it('lifts the panel while it is dragged', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 300, y: 300 });
    expect(panel.style.boxShadow).not.toBe('');
    pointer(window, 'pointerup', { x: 300, y: 300 });
    expect(panel.style.boxShadow).toBe('');
  });

  it('keeps where a cancelled drag left it', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 150, y: 200 });
    pointer(window, 'pointercancel', { x: 150, y: 200 });

    expect(shown(panel)).toEqual({ x: 110, y: 170 });
    expect(loadPlacement(KEY)).toEqual({ corner: 'top-left', x: 110, y: 170 });
    pointer(window, 'pointermove', { x: 400, y: 400 });
    expect(shown(panel)).toEqual({ x: 110, y: 170 });
  });

  it('stops following the pointer once its host is destroyed', async () => {
    await mount();
    pointer(label, 'pointerdown', { x: 50, y: 500 });
    pointer(window, 'pointermove', { x: 150, y: 200 });
    fixture.destroy();

    pointer(window, 'pointermove', { x: 400, y: 400 });
    pointer(window, 'pointerup', { x: 400, y: 400 });
    expect(panel.style.transform).toBe('');
    expect(loadPlacement(KEY)).toBeNull();
  });

  describe('on touch', () => {
    it('lets a quick swipe scroll instead of moving the panel', async () => {
      await mount();
      vi.useFakeTimers();
      pointer(label, 'pointerdown', { x: 50, y: 500, pointerType: 'touch' });
      pointer(window, 'pointermove', { x: 90, y: 500, pointerType: 'touch' });
      vi.advanceTimersByTime(LONG_PRESS_MS);
      pointer(window, 'pointermove', { x: 300, y: 500, pointerType: 'touch' });
      pointer(window, 'pointerup', { x: 300, y: 500, pointerType: 'touch' });

      expect(shown(panel)).toEqual({ x: 10, y: 470 });
      expect(loadPlacement(KEY)).toBeNull();
    });

    it('moves the panel after a long-press', async () => {
      await mount();
      vi.useFakeTimers();
      pointer(label, 'pointerdown', { x: 50, y: 500, pointerType: 'touch' });
      vi.advanceTimersByTime(LONG_PRESS_MS);
      pointer(window, 'pointermove', { x: 150, y: 200, pointerType: 'touch' });
      expect(shown(panel)).toEqual({ x: 110, y: 170 });
      pointer(window, 'pointerup', { x: 150, y: 200, pointerType: 'touch' });

      expect(loadPlacement(KEY)).toEqual({
        corner: 'top-left',
        x: 110,
        y: 170
      });
    });

    it('leaves the panel to its CSS after a long-press without a move', async () => {
      await mount();
      vi.useFakeTimers();
      pointer(label, 'pointerdown', { x: 50, y: 500, pointerType: 'touch' });
      vi.advanceTimersByTime(LONG_PRESS_MS);
      pointer(window, 'pointerup', { x: 50, y: 500, pointerType: 'touch' });

      expect(loadPlacement(KEY)).toBeNull();
      expect(panel.style.left).toBe('');
      expect(panel.style.bottom).toBe('');
      expect(panel.style.boxShadow).toBe('');
    });

    it('stops the page scrolling while the panel is dragged', async () => {
      await mount();
      vi.useFakeTimers();
      const move = () => {
        const e = new Event('touchmove', { cancelable: true });
        panel.dispatchEvent(e);
        return e.defaultPrevented;
      };
      pointer(label, 'pointerdown', { x: 50, y: 500, pointerType: 'touch' });
      expect(move()).toBe(false);
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(move()).toBe(true);
      pointer(window, 'pointerup', { pointerType: 'touch' });
    });
  });

  it('opens where it was left, kept inside a smaller area', async () => {
    savePlacement(KEY, { corner: 'bottom-right', x: 20, y: 30 });
    await mount();
    // Its own corner's offsets: a right-hand panel placed by `left` would
    // shrink-to-fit into whatever space lies right of that point.
    expect(panel.style.left).toBe('auto');
    expect(panel.style.top).toBe('auto');
    expect(panel.style.right).toBe('20px');
    expect(panel.style.bottom).toBe('30px');
    expect(shown(panel)).toEqual({ x: 780, y: 470 });

    areaSize.w = 600;
    areaSize.h = 400;
    window.dispatchEvent(new Event('resize'));
    expect(shown(panel)).toEqual({ x: 380, y: 270 });
  });
});
