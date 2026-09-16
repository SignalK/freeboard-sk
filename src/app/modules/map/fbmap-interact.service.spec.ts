import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
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
          useValue: { debug: () => undefined, uiCtrl }
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

    expect(service.draw.coordinates).toHaveLength(ring.length);
    service.draw.coordinates.forEach((c: number[], i: number) => {
      expect(c[0]).toBeCloseTo(ring[i][0], 6);
      expect(c[1]).toBeCloseTo(ring[i][1], 6);
    });
    expect(uiCtrl().suppressContextMenu).toBe(false);
  });
});
