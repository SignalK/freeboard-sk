import { afterEach, describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BottomClearanceDirective,
  HRect,
  bottomClearance,
  maxPanelRight,
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

  it('keeps its resting offset above a bottom-center stack, over the status bar', () => {
    expect(clear([{ left: 400, right: 524, top: 476, center: true }])).toBe(
      124 + 30
    );
  });

  it('never pushes the panel off the top of the area', () => {
    expect(clear([{ left: 0, right: 124, top: 20 }])).toBe(500);
  });
});

// The nav data panel sits 10 px from the left of a 1000 px wide area and may
// grow to calc(100% - 75px), so it reaches x = 935 however wide its content
// is at the moment.
describe('maxPanelRight', () => {
  const area = { left: 0, width: 1000 };

  it('resolves calc(100% - n px) against the area', () => {
    expect(maxPanelRight(10, 'calc(100% - 75px)', area)).toBe(935);
  });

  it('resolves a percentage and a length', () => {
    expect(maxPanelRight(10, '50%', area)).toBe(510);
    expect(maxPanelRight(10, '300px', area)).toBe(310);
  });

  it('stops at the area edge, also without a max-width', () => {
    expect(maxPanelRight(10, '100%', area)).toBe(1000);
    expect(maxPanelRight(10, 'none', area)).toBe(1000);
  });

  it('clears a widget the panel only covers at its widest', () => {
    // TTG and ETA appear only while making way and widen the panel past
    // x = 610; the widget at the bottom right must count either way
    const widget = { left: 800, right: 924, top: 476 };
    const at = (right: number) =>
      bottomClearance({ left: 10, right, height: 100 }, [widget], 600, 600, 30);
    expect(at(maxPanelRight(10, 'calc(100% - 75px)', area))).toBe(
      124 + WIDGET_CELL_GAP
    );
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
      (besideLeftToolbar)="beside.push($event)"
    ></div>
  `
})
class ClearanceHost {
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

  const mount = async () => {
    TestBed.configureTestingModule({
      imports: [ClearanceHost],
      providers: [
        { provide: PlotterExtensionService, useValue: { shownWidgets } }
      ]
    });
    const fixture = TestBed.createComponent(ClearanceHost);
    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      '#panel'
    ) as HTMLElement;
    const area = fixture.nativeElement as HTMLElement;
    area.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 600);
    Object.defineProperty(panel, 'offsetParent', { get: () => area });
    panel.getBoundingClientRect = () => new DOMRect(10, 470, 120, 100);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  afterEach(() => cells.splice(0).forEach((c) => c.remove()));

  it('reports the resting offset with no widget beneath', async () => {
    const fixture = await mount();
    expect(fixture.componentInstance.emitted).toEqual([30]);
  });

  it('lifts the panel over a widget it covers only at its max-width', async () => {
    // the panel is 120 px wide now, but may grow to 300 px, past x = 150
    cell('pe-bl', new DOMRect(150, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.emitted).toEqual([124 + WIDGET_CELL_GAP]);
  });

  it('keeps its resting offset above a bottom-center stack', async () => {
    cell('pe-cb', new DOMRect(100, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.emitted).toEqual([124 + 30]);
  });

  it('reports a panel lifted beside the left toolbar buttons', async () => {
    // the panel rests 130 px up, so its top is at y = 370; the lowest left
    // toolbar button ends at y = 400
    const toolbar = document.createElement('fb-map-toolbar');
    toolbar.className = 'left';
    const item = document.createElement('div');
    item.className = 'toolbarItem';
    item.getBoundingClientRect = () => new DOMRect(0, 352, 50, 48);
    toolbar.appendChild(item);
    document.body.appendChild(toolbar);
    cells.push(toolbar);
    cell('pe-bl', new DOMRect(0, 476, 124, 124));
    const fixture = await mount();
    expect(fixture.componentInstance.beside).toEqual([true]);
  });

  it('reports a resting panel clear of the left toolbar', async () => {
    const fixture = await mount();
    expect(fixture.componentInstance.beside).toEqual([false]);
  });
});
