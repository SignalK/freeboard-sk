import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { Feature } from 'ol';
import { LineString, Point, Polygon } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

import { FBMapInteractService } from './fbmap-interact.service';
import { AppFacade } from 'src/app/app.facade';

describe('FBMapInteractService.stopDrawing', () => {
  let service: FBMapInteractService;
  let uiCtrl: ReturnType<typeof signal<{ suppressContextMenu: boolean }>>;

  beforeEach(() => {
    uiCtrl = signal({ suppressContextMenu: false });
    TestBed.configureTestingModule({
      providers: [
        FBMapInteractService,
        {
          provide: AppFacade,
          useValue: { debug: (): void => undefined, uiCtrl }
        }
      ]
    });
    service = TestBed.inject(FBMapInteractService);
    service.startDrawing('region');
    expect(uiCtrl().suppressContextMenu).toBe(true);
  });

  it('handles a Polygon feature with no rings without throwing (#723)', () => {
    // The empty-geometry guard set draw.coordinates = [] but did not exit the
    // case, so p[0].map() ran on undefined and the throw escaped before
    // interactionEnded() could tear the interaction down.
    const feature = new Feature(new Polygon([]));

    expect(() => service.stopDrawing(feature)).not.toThrow();

    expect(service.draw.coordinates).toEqual([]);
    expect(service.isDrawing()).toBe(false);
    expect(uiCtrl().suppressContextMenu).toBe(false);
  });

  it('converts the outer ring of a Polygon feature to lon/lat', () => {
    const ring = [
      [-80.1, 25.7],
      [-80.0, 25.7],
      [-80.0, 25.8],
      [-80.1, 25.7]
    ];
    const feature = new Feature(new Polygon([ring.map((c) => fromLonLat(c))]));

    service.stopDrawing(feature);

    const coords = service.draw.coordinates as number[][];
    expect(coords).toHaveLength(ring.length);
    coords.forEach((c, i) => {
      expect(c[0]).toBeCloseTo(ring[i][0], 6);
      expect(c[1]).toBeCloseTo(ring[i][1], 6);
    });
    expect(uiCtrl().suppressContextMenu).toBe(false);
  });

  it('converts a Point feature to a single lon/lat position', () => {
    service.startDrawing('waypoint');
    const feature = new Feature(new Point(fromLonLat([-80.1, 25.7])));

    service.stopDrawing(feature);

    const c = service.draw.coordinates as number[];
    expect(c).toHaveLength(2);
    expect(c[0]).toBeCloseTo(-80.1, 6);
    expect(c[1]).toBeCloseTo(25.7, 6);
  });

  it('converts a LineString feature to a lon/lat position list', () => {
    service.startDrawing('route');
    const line = [
      [-80.1, 25.7],
      [-80.0, 25.7],
      [-80.0, 25.8]
    ];
    const feature = new Feature(new LineString(line.map((c) => fromLonLat(c))));

    service.stopDrawing(feature);

    const coords = service.draw.coordinates as number[][];
    expect(coords).toHaveLength(line.length);
    coords.forEach((c, i) => {
      expect(c[0]).toBeCloseTo(line[i][0], 6);
      expect(c[1]).toBeCloseTo(line[i][1], 6);
    });
  });
});

describe('FBMapInteractService Bearing & Distance (#905)', () => {
  let service: FBMapInteractService;
  let uiCtrl: ReturnType<typeof signal<{ suppressContextMenu: boolean }>>;

  beforeEach(() => {
    uiCtrl = signal({ suppressContextMenu: false });
    TestBed.configureTestingModule({
      providers: [
        FBMapInteractService,
        {
          provide: AppFacade,
          useValue: { debug: (): void => undefined, uiCtrl }
        }
      ]
    });
    service = TestBed.inject(FBMapInteractService);
    service.startMeasuring('BearingDistance');
  });

  it('sets the origin on the first click and keeps measuring', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);

    expect(service.bearingDistance()).toEqual({
      origin: [-80.1, 25.7],
      target: null,
      fixed: false,
      worldOffset: 0
    });
    expect(service.isMeasuring()).toBe(true);
  });

  it('follows the pointer once the origin is set, not before', () => {
    service.followBearingDistance([-80.0, 25.8]);
    expect(service.bearingDistance()).toBeNull();

    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.followBearingDistance([-80.0, 25.8], 40075016);

    expect(service.bearingDistance().target).toEqual([-80.0, 25.8]);
    expect(service.bearingDistance().worldOffset).toBe(40075016);
    expect(service.bearingDistance().fixed).toBe(false);
  });

  it('places the target on the second click, ends the interaction and keeps the measurement', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.placeBearingDistancePoint([-80.0, 25.8]);

    expect(service.bearingDistance()).toEqual({
      origin: [-80.1, 25.7],
      target: [-80.0, 25.8],
      fixed: true,
      worldOffset: 0
    });
    expect(service.isMeasuring()).toBe(false);
    expect(uiCtrl().suppressContextMenu).toBe(false);
  });

  it('ignores a second click on the origin itself', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.placeBearingDistancePoint([-80.1, 25.7]);

    expect(service.bearingDistance().fixed).toBe(false);
    expect(service.isMeasuring()).toBe(true);
  });

  it('a placed target no longer follows the pointer', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.placeBearingDistancePoint([-80.0, 25.8]);
    service.followBearingDistance([-79.0, 26.0]);

    expect(service.bearingDistance().target).toEqual([-80.0, 25.8]);
  });

  it('cancelling before the target is placed discards the measurement', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.stopMeasuring();

    expect(service.bearingDistance()).toBeNull();
  });

  it('a placed measurement survives other interactions until cleared', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.placeBearingDistancePoint([-80.0, 25.8]);
    service.startMeasuring('LineString');
    service.stopMeasuring();

    expect(service.bearingDistance()?.fixed).toBe(true);

    service.clearBearingDistance();
    expect(service.bearingDistance()).toBeNull();
  });

  it('starting a new Bearing & Distance replaces the placed one', () => {
    service.showBearingDistanceFromVessel([-80.0, 25.8]);
    service.startMeasuring('BearingDistance');

    expect(service.bearingDistance()).toBeNull();
  });

  it('moves a placed target into the world copy it was dragged to', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.placeBearingDistancePoint([-80.0, 25.8]);

    service.moveBearingDistanceTarget([-79.9, 25.9], 40075016);
    expect(service.bearingDistance().target).toEqual([-79.9, 25.9]);
    expect(service.bearingDistance().worldOffset).toBe(40075016);
    expect(service.bearingDistance().origin).toEqual([-80.1, 25.7]);
    expect(service.bearingDistance().fixed).toBe(true);
  });

  it('does not move a target that is still following the pointer', () => {
    service.placeBearingDistancePoint([-80.1, 25.7]);
    service.followBearingDistance([-80.0, 25.8]);
    service.moveBearingDistanceTarget([-79.9, 25.9]);

    expect(service.bearingDistance().target).toEqual([-80.0, 25.8]);
  });

  it('measures from the vessel with the target placed at once', () => {
    service.stopMeasuring();
    service.showBearingDistanceFromVessel([-80.0, 25.8], 40075016);

    expect(service.bearingDistance()).toEqual({
      origin: null,
      target: [-80.0, 25.8],
      fixed: true,
      worldOffset: 40075016
    });
  });
});
