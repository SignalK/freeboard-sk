import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlotterExtensionService } from './plotterext.service';
import { PlotterExtensionOverlay } from './widget-overlay.component';

interface OverlayInternals {
  pointerDown(e: PointerEvent): void;
  hitTest(x: number, y: number): unknown;
}

describe('PlotterExtensionOverlay press-and-hold', () => {
  afterEach(() => document.body.replaceChildren());

  const overlay = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlotterExtensionService, useValue: {} },
        {
          provide: ElementRef,
          useValue: new ElementRef(document.createElement('div'))
        }
      ]
    });
    const o = TestBed.runInInjectionContext(
      () => new PlotterExtensionOverlay()
    ) as unknown as OverlayInternals;
    const hitTest = vi.spyOn(o, 'hitTest').mockReturnValue(null);
    return { o, hitTest };
  };

  const pressOn = (target: HTMLElement) => {
    const e = new MouseEvent('pointerdown', { button: 0, bubbles: true });
    Object.defineProperty(e, 'isPrimary', { value: true });
    Object.defineProperty(e, 'pointerType', { value: 'mouse' });
    Object.defineProperty(e, 'target', { value: target });
    return e as PointerEvent;
  };

  it('ignores presses on a PiP App window', () => {
    const { o, hitTest } = overlay();
    const win = document.createElement('div');
    win.className = 'fb-pip-app';
    const bar = document.createElement('div');
    win.append(bar);
    document.body.append(win);
    o.pointerDown(pressOn(bar));
    expect(hitTest).not.toHaveBeenCalled();
  });

  it('still considers presses on the map', () => {
    const { o, hitTest } = overlay();
    const map = document.createElement('div');
    document.body.append(map);
    o.pointerDown(pressOn(map));
    expect(hitTest).toHaveBeenCalled();
  });
});
