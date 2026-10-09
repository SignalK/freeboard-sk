import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from '../../app.facade';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { AnchorService } from './anchor.service';
import { Position } from '../../types';

describe('AnchorService plugin commands', () => {
  let service: AnchorService;
  let post: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;
  const vessel: Position = [178.0, -17.8];

  beforeEach(() => {
    post = vi.fn(() => of({}));
    get = vi.fn(() => of({ value: { type: 'sector', radius: 40 } }));
    TestBed.configureTestingModule({
      providers: [
        AnchorService,
        {
          provide: AppFacade,
          useValue: {
            debug: () => undefined,
            data: { vessels: { self: { position: vessel } } }
          }
        },
        { provide: SignalKClient, useValue: { post, api: { get } } },
        { provide: SKStreamFacade, useValue: { selfAnchor: signal(null) } }
      ]
    });
    service = TestBed.inject(AnchorService);
  });

  const dropAnchorAt = (position: Position) =>
    (
      service as unknown as {
        parseAnchorStatus(r: { position: Position; maxRadius: number }): void;
      }
    ).parseAnchorStatus({ position, maxRadius: 40 });

  it('sends commands to signalk-anchoralarm-plugin by default', () => {
    service.drop(30);
    service.setRadius();
    service.raise();
    expect(post.mock.calls).toEqual([
      ['/plugins/anchoralarm/dropAnchor', { radius: 30 }],
      ['/plugins/anchoralarm/setRadius', {}],
      ['/plugins/anchoralarm/raiseAnchor', {}]
    ]);
    expect(service.supportsManualSet()).toBe(true);
  });

  describe("with Hoeken's anchor alarm", () => {
    beforeEach(() => service.setPlugin('hoekens-anchor-alarm'));

    it('drops with a circular zone, or with its own zone when no radius is set', () => {
      service.drop(30);
      service.drop();
      expect(post.mock.calls).toEqual([
        [
          '/plugins/hoekens-anchor-alarm/dropAnchor',
          { zone: { type: 'circle', radius: 30 } }
        ],
        ['/plugins/hoekens-anchor-alarm/dropAnchor', {}]
      ]);
    });

    it('changes the radius of the current zone, keeping its shape', async () => {
      await firstValueFrom(service.setRadius(45));
      expect(post).toHaveBeenCalledWith(
        '/plugins/hoekens-anchor-alarm/setZone',
        { zone: { type: 'sector', radius: 45 } }
      );
    });

    it('refuses a radius for a polygon zone', async () => {
      get.mockReturnValue(of({ value: { type: 'polygon', vertices: [] } }));
      await expect(firstValueFrom(service.setRadius(45))).rejects.toMatchObject(
        {
          status: 400
        }
      );
      expect(post).not.toHaveBeenCalled();
    });

    it("measures the vessel's distance from the anchor when no radius is given", async () => {
      // About 50 m south of the vessel.
      dropAnchorAt([178.0, -17.80045]);
      await firstValueFrom(service.setRadius());
      const radius = post.mock.calls[0][1].zone.radius;
      expect(Number.isInteger(radius)).toBe(true);
      expect(radius).toBeGreaterThanOrEqual(50);
      expect(radius).toBeLessThanOrEqual(51);
    });

    it('moves the anchor with its current zone, keeping the zone shape', async () => {
      await service.setAnchorPosition([178.001, -17.801]);
      expect(get).toHaveBeenCalledWith(
        '/vessels/self/navigation/anchor/watchZone'
      );
      expect(post).toHaveBeenCalledWith(
        '/plugins/hoekens-anchor-alarm/setZone',
        {
          zone: { type: 'sector', radius: 40 },
          position: { latitude: -17.801, longitude: 178.001 }
        }
      );
    });

    it('has no rode-length placement', () => {
      expect(service.supportsManualSet()).toBe(false);
    });
  });
});
