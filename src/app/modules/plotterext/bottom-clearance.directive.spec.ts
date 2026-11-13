import { afterEach, describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BottomClearanceDirective,
  HRect,
  bottomClearance,
  reachesLeftToolbar
} from './bottom-clearance.directive';
import { PlotterExtensionService } from './plotterext.service';
import { WIDGET_CELL_GAP } from './types';

// A 600 px high area whose bottom edge is at y = 600, and a panel spanning
// x 10..610 that rests 30 px above it.
const panel = { left: 10, right: 610, height: 100 };
const clear = (widgets: HRect[]) =>
  bottomClearance(panel, widgets, 600, 600, 30);

describe('bottomClearance', () => {
  it('keeps the resting offset with no widget beneath', () => {
    expect(clear([])).toBe(30);
  });

  it('ignores widgets the panel does not span', () => {
    expect(clear([{ left: 700, right: 820, top: 476 }])).toBe(30);
  });

  it('sits just above an overlapping widget', () => {
    expect(clear([{ left: 0, right: 124, top: 476 }])).toBe(
      124 + WIDGET_CELL_GAP
    );
  });

  it('sits above the tallest overlapping stack', () => {
    expect(
      clear([
        { left: 0, right: 124, top: 476 },
        { left: 400, right: 524, top: 346 },
        { left: 900, right: 1024, top: 100 }
      ])
    ).toBe(254 + WIDGET_CELL_GAP);
  });

  it('keeps its resting offset above a stack under a status bar it overlaps', () => {
    expect(
      bottomClearance(
        panel,
        [{ left: 400, right: 524, top: 476 }],
        600,
        600,
        30,
        [{ left: 300, right: 600 }]
      )
    ).toBe(124 + 30);
  });

  it('clears a status bar lifted by a taller stack than the one beneath', () => {
    // the status bar spans both stacks and rises onto the 174 px one; the
    // panel covers only the 84 px stack but still overlaps the status bar
    const stacks = [
      { left: 100, right: 224, top: 426 },
      { left: 500, right: 624, top: 516 }
    ];
    expect(
      bottomClearance(
        { left: 450, right: 700, height: 100 },
        stacks,
        600,
        600,
        30,
        [{ left: 150, right: 550 }]
      )
    ).toBe(174 + 30);
  });

  it('ignores a status bar the panel does not overlap', () => {
    expect(
      bottomClearance(
        { left: 700, right: 900, height: 100 },
        [{ left: 400, right: 524, top: 476 }],
        600,
        600,
        30,
        [{ left: 300, right: 600 }]
      )
    ).toBe(30);
  });

  it('never pushes the panel off the top of the area', () => {
    expect(clear([{ left: 0, right: 124, top: 20 }])).toBe(500);
  });
});

describe('reachesLeftToolbar', () => {
  it('is false while the panel top stays below the lowest button', () => {
    expect(reachesLeftToolbar(520, [{ bottom: 100 }, { bottom: 515 }])).toBe(
      false
    );
  });

  it('is true once the panel top rises past the lowest button', () => {
    expect(reachesLeftToolbar(474, [{ bottom: 100 }, { bottom: 515 }])).toBe(
      true
    );
  });

  it('is false without a left toolbar', () => {
    expect(reachesLeftToolbar(0, [])).toBe(false);
  });
});

@Component({
  imports: [BottomClearanceDirective],
  template: `
    <div
      id="panel"
      style="max-width: 300px"
      [fbBottomClearance]="30"
      (clearance)="emitted.push($event)"
      [fbBottomClearanceLeftToolbar]="toolbarItems()"
      (besideLeftToolbar)="beside.push($event)"
    ></div>
  `
})
class ClearanceHost {
  emitted: number[] = [];
  beside: boolean[] = [];
  toolbarItems = signal(0);
}

@Component({
  imports: [BottomClearanceDirective],
  template: `
    <div
      id="panel"
      [fbBottomClearance]="0"
      fbBottomClearanceStatusBar
      (clearance)="emitted.push($event)"
      (besideLeftToolbar)="beside.push($event)"
    ></div>
  `
})
class StatusBarHost {
  emitted: number[] = [];
  beside: boolean[] = [];
}

/**
 * jsdom does no layout: the panel spans x 10..210 in a 1000 x 600 area whose
 * bottom edge is at y = 600, and each widget cell is given its rectangle.
 */
describe('BottomClearanceDirective', () => {
  const shownWidgets = signal<unknown[]>([]);
  const cells: HTMLElement[] = [];

  const cell = (anchor: string, rect: DOMRect) => {
    const stack = document.createElement('div');
    stack.className = anchor;
    const c = document.createElement('div');
    c.className = 'pe-cell';
    c.getBoundingClientRect = () => rect;
    stack.appendChild(c);
    document.body.appendChild(stack);
    cells.push(stack);
  };

  // the Lat/Lon status bar, its text spanning x 300..600 at the bottom
  const statusBar = () => {
    const bar = document.createElement('div');
    bar.className = 'ol-mouse-position';
    bar.getBoundingClientRect = () => new DOMRect(300, 570, 300, 20);
    document.body.appendChild(bar);
    cells.push(bar);
  };

  const mount = async <T extends { emitted: number[] } = ClearanceHost>(
    host: new () => T = ClearanceHost as unknown as new () => T,
    rect: DOMRect | (() => DOMRect) = new DOMRect(10, 470, 120, 100)
  ) => {
    TestBed.configureTestingModule({
      imports: [host],
      providers: [
        { provide: PlotterExtensionService, useValue: { shownWidgets } }
      ]
    });
    const fixture = TestBed.createComponent(host);
    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      '#panel'
    ) as HTMLElement;
    const area = fixture.nativeElement as HTMLElement;
    area.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 600);
    Object.defineProperty(panel, 'offsetParent', { get: () => area });
    panel.getBoundingClientRect = () =>
      typeof rect === 'function' ? rect() : rect;
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  afterEach(() => cells.splice(0).forEach((c) => c.remove()));

  it('reports the resting offset with no widget beneath', async () => {
    const fixture = await mount();
    expect(fixture.componentInstance.emitted).toEqual([30]);
  });

  it('sits on the stack it covers', async () => {
    cell('pe-bl', new DOMRect(0, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.emitted).toEqual([124 + WIDGET_CELL_GAP]);
  });

  it('stays down beside a widget it would cover only at its max-width', async () => {
    // the panel is 120 px wide now and may grow to 300 px, past x = 150
    cell('pe-bl', new DOMRect(150, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.emitted).toEqual([30]);
  });

  it('rises over a taller stack once it grows that wide', async () => {
    let notify = () => {};
    let panelRect = new DOMRect(10, 470, 120, 100);
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) {
        notify = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      cell('pe-bl', new DOMRect(0, 476, 124, 124));
      cell('pe-bl', new DOMRect(150, 346, 124, 254));
      const fixture = await mount(ClearanceHost, () => panelRect);
      expect(fixture.componentInstance.emitted.at(-1)).toBe(
        124 + WIDGET_CELL_GAP
      );
      // route data shown while making way widens the panel past x = 150
      panelRect = new DOMRect(10, 470, 300, 100);
      notify();
      expect(fixture.componentInstance.emitted.at(-1)).toBe(
        254 + WIDGET_CELL_GAP
      );
    } finally {
      globalThis.ResizeObserver = Original;
    }
  });

  it('keeps its resting offset above a stack the status bar sits on', async () => {
    statusBar();
    cell('pe-bl', new DOMRect(200, 476, 124, 124));
    const fixture = await mount(ClearanceHost, new DOMRect(10, 470, 300, 100));
    expect(fixture.componentInstance.emitted).toEqual([124 + 30]);
  });

  it('re-measures when the status bar grows or shrinks', async () => {
    const observed: Element[] = [];
    let notify = () => {};
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) {
        notify = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      let barRect = new DOMRect(300, 570, 300, 20);
      const bar = document.createElement('div');
      bar.className = 'ol-mouse-position';
      bar.getBoundingClientRect = () => barRect;
      document.body.appendChild(bar);
      cells.push(bar);
      cell('pe-bl', new DOMRect(350, 476, 124, 124));
      // the panel may grow to x = 800, short of the taller stack
      cell('pe-br', new DOMRect(820, 416, 124, 184));
      const fixture = await mount(
        ClearanceHost,
        new DOMRect(500, 470, 120, 100)
      );
      expect(observed).toContain(bar);
      expect(fixture.componentInstance.emitted.at(-1)).toBe(124 + 30);
      // the text grows and the status bar now reaches the taller stack
      barRect = new DOMRect(300, 570, 600, 20);
      notify();
      expect(fixture.componentInstance.emitted.at(-1)).toBe(184 + 30);
      barRect = new DOMRect(300, 570, 300, 20);
      notify();
      expect(fixture.componentInstance.emitted.at(-1)).toBe(124 + 30);
    } finally {
      globalThis.ResizeObserver = Original;
    }
  });

  it('lifts the status bar above a widget under its text', async () => {
    cell('pe-bl', new DOMRect(200, 476, 124, 124));
    const fixture = await mount(StatusBarHost, new DOMRect(300, 570, 300, 20));
    expect(fixture.componentInstance.emitted).toEqual([124 + WIDGET_CELL_GAP]);
  });

  it('leaves the status bar down beside widgets clear of its text', async () => {
    // the status bar spans only its own text, never its widest
    cell('pe-br', new DOMRect(700, 476, 124, 124));
    const fixture = await mount(StatusBarHost, new DOMRect(300, 570, 300, 20));
    expect(fixture.componentInstance.emitted).toEqual([0]);
  });

  // the left toolbar's lowest button, ending at y = 400
  const leftToolbar = () => {
    const toolbar = document.createElement('fb-map-toolbar');
    toolbar.className = 'left';
    const item = document.createElement('div');
    item.className = 'toolbarItem';
    item.getBoundingClientRect = () => new DOMRect(0, 352, 50, 48);
    toolbar.appendChild(item);
    document.body.appendChild(toolbar);
    cells.push(toolbar);
  };

  it('reports a panel lifted beside the left toolbar buttons', async () => {
    // the panel rests 130 px up, so its top is at y = 370
    leftToolbar();
    cell('pe-bl', new DOMRect(0, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.beside).toEqual([true]);
  });

  it('reports a resting panel clear of the left toolbar', async () => {
    const fixture = await mount();
    expect(fixture.componentInstance.beside).toEqual([false]);
  });

  it('measures again when the left toolbar appears', async () => {
    // the bar is lifted beside where the toolbar's lowest button will be
    cell('pe-bl', new DOMRect(0, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.beside).toEqual([false]);
    leftToolbar();
    fixture.componentInstance.toolbarItems.set(8);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.beside).toEqual([false, true]);
  });

  it('leaves the left toolbar check to the panels, not the status bar', async () => {
    leftToolbar();
    cell('pe-bl', new DOMRect(300, 476, 124, 124));
    const fixture = await mount(StatusBarHost, new DOMRect(300, 570, 300, 20));
    expect(fixture.componentInstance.emitted).toEqual([124 + WIDGET_CELL_GAP]);
    expect(fixture.componentInstance.beside).toEqual([]);
  });
});
