import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RadarRenderService } from './radar-render.service';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';
import { Subject } from 'rxjs';
import ImageSource from 'ol/source/Image';
import { fromLonLat, get as getProjection } from 'ol/proj';
import ReprojImage from 'ol/reproj/Image';
import { RadarRenderDef } from './radar-render.service';
import { ShipState } from './ship-state.model';

describe('RadarRenderService', () => {
  const showMessage = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext(): null {
          return null;
        }
      }
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AppFacade, useValue: { showMessage, debug: vi.fn() } },
        { provide: RadarAPIService, useValue: {} }
      ]
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    showMessage.mockReset();
  });

  // The stream closes on every standby, once per watchman cycle.
  it('closes the spoke stream without a message', () => {
    TestBed.inject(RadarRenderService).disconnect();
    expect(showMessage).not.toHaveBeenCalled();
  });

  // While another radar is selected but not loaded yet, the radar shown is
  // still the old one, and its stream must match its spoke geometry.
  it('streams the radar whose geometry it draws', async () => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext(): object {
          return {};
        }
      }
    );
    TestBed.overrideProvider(AppFacade, {
      useValue: {
        showMessage,
        debug: vi.fn(),
        hostDef: { ssl: false, name: 'localhost', port: 3000 }
      }
    });
    TestBed.overrideProvider(RadarAPIService, {
      useValue: {
        radarId: () => 'radar-b',
        apiVersion: () => '3.4.0',
        radar: () => ({
          device: { id: 'radar-a', name: 'Radar A' },
          capabilities: {
            spokesPerRevolution: 2048,
            maxSpokeLength: 512,
            hasSparseSpokes: false
          }
        })
      }
    });
    const def = await TestBed.inject(RadarRenderService).connect();
    expect(def?.id).toBe('radar-a');
    expect(def?.streamUrl).toBe(
      'ws://localhost:3000/signalk/v2/api/vessels/self/radars/radar-a/spokes'
    );
  });

  describe('radar picture', () => {
    let worker: { onmessage?: (event: { data: object }) => void };
    let sources: ImageSource[];
    let service: RadarRenderService;
    let shipState: Subject<ShipState>;
    const radar: RadarRenderDef = {
      id: 'r1',
      name: 'Radar',
      spokesPerRevolution: 2048,
      maxSpokeLen: 512,
      hasSparseSpokes: false,
      streamUrl: 'ws://localhost/spokes',
      legend: {}
    };
    const view = getProjection('EPSG:3857')!;
    const loaded = async (source: ImageSource) => {
      const image = source.getImage([-1, -1, 1, 1], 1, 1, view)!;
      image.load();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return image;
    };

    beforeEach(() => {
      vi.stubGlobal(
        'Worker',
        class {
          onmessage?: (event: { data: object }) => void;
          constructor() {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            worker = this;
          }
          postMessage(): void {}
          terminate(): void {}
        }
      );
      // jsdom has no OffscreenCanvas transfer
      Object.defineProperty(
        HTMLCanvasElement.prototype,
        'transferControlToOffscreen',
        { configurable: true, value: () => ({}) }
      );
      sources = [];
      service = TestBed.inject(RadarRenderService);
      shipState = new Subject<ShipState>();
      service.startRadar(radar, shipState, (source) => sources.push(source));
    });

    afterEach(() => {
      service.disconnect();
      Reflect.deleteProperty(
        HTMLCanvasElement.prototype,
        'transferControlToOffscreen'
      );
    });

    // Reprojection draws the live WebGL canvas once per triangle on every
    // refresh, and each draw is a GPU readback in Firefox.
    it('is drawn in the map projection without reprojecting', () => {
      const image = sources[0].getImage([-1, -1, 1, 1], 1, 1, view);

      expect(image).not.toBeInstanceOf(ReprojImage);
    });

    it('takes the scale of the new range', async () => {
      await loaded(sources[0]);
      worker.onmessage?.({ data: { range: 1852 } });

      const image = await loaded(sources[sources.length - 1]);
      const [minX, , maxX] = image.getExtent();
      const [resolutionX] = [image.getResolution()].flat();
      expect((maxX - minX) / 2).toBeCloseTo(1852, -1);
      expect(resolutionX).toBeCloseTo((maxX - minX) / (2 * radar.maxSpokeLen));
    });

    it('follows the vessel when it moves', async () => {
      const before = await loaded(sources[0]);
      shipState.next({ location: [10, 50], heading: 0 });

      const image = await loaded(sources[sources.length - 1]);
      const [minX, minY, maxX, maxY] = image.getExtent();
      const [centreX, centreY] = fromLonLat([10, 50]);
      const [resolutionX] = [image.getResolution()].flat();
      expect(image).not.toBe(before);
      expect((minX + maxX) / 2).toBeCloseTo(centreX, -1);
      expect((minY + maxY) / 2).toBeCloseTo(centreY, -3);
      expect(resolutionX).toBeCloseTo((maxX - minX) / (2 * radar.maxSpokeLen));
    });
  });
});
