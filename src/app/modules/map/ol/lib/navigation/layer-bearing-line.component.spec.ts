import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapBrowserEvent } from 'ol';
import PointerInteraction from 'ol/interaction/Pointer';
import { fromLonLat } from 'ol/proj';
import {
  BearingLineComponent,
  MarkerDragEvent
} from './layer-bearing-line.component';
import { MapComponent } from '../map.component';
import { isHandleDrag } from '../handle-drag';

// Bearing & Distance (#905): the placed end point can be dragged.
describe('BearingLineComponent marker drag', () => {
  const origin: [number, number] = [-80.5, 25.0];
  const marker: [number, number] = [-80.4, 25.1];
  const WORLD = 2 * 20037508.342789244;

  let interaction: PointerInteraction;
  let markerUnderPointer: boolean;
  let drags: MarkerDragEvent[];

  const target = document.createElement('div');
  const props: Record<string, unknown> = {};
  const map = {
    get: (k: string) => props[k],
    set: (k: string, v: unknown) => (props[k] = v),
    getTargetElement: () => target,
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    render: vi.fn(),
    addInteraction: (i: PointerInteraction) => (interaction = i),
    removeInteraction: vi.fn(),
    forEachFeatureAtPixel: (
      _pixel: number[],
      callback: (f: { getId: () => string }) => boolean
    ) => (markerUnderPointer ? callback({ getId: () => 'dest.point' }) : false)
  };

  function open(draggable: boolean) {
    const fixture = TestBed.createComponent(BearingLineComponent);
    fixture.componentRef.setInput('vesselPosition', origin);
    fixture.componentRef.setInput('markerPosition', marker);
    fixture.componentRef.setInput('markerDraggable', draggable);
    fixture.componentInstance.markerDrag.subscribe((d) => drags.push(d));
    fixture.detectChanges();
    return fixture;
  }

  /** Returns false when the interaction keeps the event, so the map does
   *  not pan. */
  function pointer(
    type: 'pointerdown' | 'pointerdrag' | 'pointerup' | 'pointermove',
    lonlat: number[],
    pointerId = 1,
    worldShift = 0,
    button = 0
  ): boolean {
    const c = fromLonLat(lonlat);
    const e = {
      type,
      map,
      pixel: [100, 100],
      coordinate: [c[0] + worldShift, c[1]],
      originalEvent: {
        pointerId,
        pointerType: 'mouse',
        isPrimary: pointerId === 1,
        button,
        preventDefault: (): void => undefined
      }
    } as unknown as MapBrowserEvent;
    return interaction.handleEvent(e);
  }

  beforeEach(async () => {
    markerUnderPointer = false;
    drags = [];
    Object.keys(props).forEach((k) => delete props[k]);
    target.style.cursor = '';
    await TestBed.configureTestingModule({
      declarations: [BearingLineComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  it('takes a press on the marker, so the chart does not pan', () => {
    open(true);
    markerUnderPointer = true;
    expect(pointer('pointerdown', marker)).toBe(false);
  });

  it('marks the handle held for the whole drag, so a long-press opens no menu', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker);
    expect(isHandleDrag(map)).toBe(true);
    pointer('pointerdrag', [-80.35, 25.15]);
    expect(isHandleDrag(map)).toBe(true);
    pointer('pointerup', [-80.35, 25.15]);
    expect(isHandleDrag(map)).toBe(false);
  });

  it('releases the handle when a second finger aborts the drag', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker, 1);
    pointer('pointerdrag', [-80.3, 25.2], 2);
    expect(isHandleDrag(map)).toBe(false);
  });

  it('releases the handle if the layer goes away mid-drag', () => {
    const fixture = open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker);
    fixture.destroy();
    expect(isHandleDrag(map)).toBe(false);
  });

  it('leaves a press elsewhere to the map', () => {
    open(true);
    expect(pointer('pointerdown', [-80.3, 25.2])).toBe(true);
    expect(drags).toEqual([]);
    expect(isHandleDrag(map)).toBe(false);
  });

  it('ignores the marker when it is not draggable', () => {
    open(false);
    markerUnderPointer = true;
    expect(pointer('pointerdown', marker)).toBe(true);
  });

  it('reports the marker where the pointer drags it', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker);
    pointer('pointerdrag', [-80.35, 25.15]);
    pointer('pointerup', [-80.35, 25.15]);

    expect(drags).toHaveLength(1);
    expect(drags[0].position[0]).toBeCloseTo(-80.35, 6);
    expect(drags[0].position[1]).toBeCloseTo(25.15, 6);
    expect(drags[0].worldOffset).toBeCloseTo(0, 6);
  });

  it('reports a drag in another world copy as canonical lon/lat plus its offset', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker, 1, WORLD);
    pointer('pointerdrag', [-80.35, 25.15], 1, WORLD);

    expect(drags[0].position[0]).toBeCloseTo(-80.35, 6);
    expect(drags[0].worldOffset).toBeCloseTo(WORLD, 3);
  });

  it('puts the marker back when a second finger joins', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker, 1);
    pointer('pointerdrag', [-80.35, 25.15], 1);
    pointer('pointerdrag', [-80.3, 25.2], 2);

    expect(drags.at(-1)?.position).toEqual(marker);
    expect(drags.at(-1)?.worldOffset).toBeCloseTo(0, 6);
  });

  it('puts the marker back in the world copy it was grabbed in', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker, 1, WORLD);
    pointer('pointerdrag', [-80.35, 25.15], 1, 2 * WORLD);
    pointer('pointerdrag', [-80.3, 25.2], 2, 2 * WORLD);

    expect(drags.at(-1)?.worldOffset).toBeCloseTo(WORLD, 3);
  });

  it('ignores the rest of a pinch once the marker is put back', () => {
    open(true);
    markerUnderPointer = true;
    pointer('pointerdown', marker, 1);
    pointer('pointerdrag', [-80.3, 25.2], 2);
    const afterAbort = drags.length;
    pointer('pointerdrag', [-80.2, 25.3], 1);
    pointer('pointerdrag', [-80.1, 25.4], 2);

    expect(drags).toHaveLength(afterAbort);
  });

  it('leaves a right-button press on the marker to the chart menu', () => {
    open(true);
    markerUnderPointer = true;
    expect(pointer('pointerdown', marker, 1, 0, 2)).toBe(true);
    expect(isHandleDrag(map)).toBe(false);
  });

  it('shows a grab cursor over the marker and clears only its own cursor', () => {
    const fixture = open(true);
    markerUnderPointer = true;
    pointer('pointermove', marker);
    expect(target.style.cursor).toBe('grab');

    markerUnderPointer = false;
    pointer('pointermove', [-80.3, 25.2]);
    expect(target.style.cursor).toBe('');

    target.style.cursor = 'crosshair';
    pointer('pointermove', [-80.3, 25.2]);
    fixture.destroy();
    expect(target.style.cursor).toBe('crosshair');
  });
});

describe('BearingLineComponent destination marker', () => {
  const map = {
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    render: vi.fn(),
    addInteraction: vi.fn(),
    removeInteraction: vi.fn(),
    getTargetElement: (): null => null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BearingLineComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  function markerDrawn(showMarker: boolean): boolean {
    const fixture = TestBed.createComponent(BearingLineComponent);
    fixture.componentRef.setInput('vesselPosition', [-80.5, 25.0]);
    fixture.componentRef.setInput('markerPosition', [-80.4, 25.1]);
    fixture.componentRef.setInput('showMarker', showMarker);
    fixture.detectChanges();
    return !!fixture.componentInstance.source.getFeatureById('dest.point');
  }

  it('draws the marker when asked to', () => {
    expect(markerDrawn(true)).toBe(true);
  });

  // a destination that is a waypoint already shows the waypoint's icon
  it('leaves the marker out when not asked to', () => {
    expect(markerDrawn(false)).toBe(false);
  });
});
