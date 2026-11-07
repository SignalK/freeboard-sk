import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RadarRenderService } from './radar-render.service';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';
import { Subject } from 'rxjs';
import { get as getProjection } from 'ol/proj';
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

  // Reprojection draws the radar's live WebGL canvas once per triangle on every
  // refresh, and each draw is a GPU readback in Firefox.
  it('draws the radar image in the map projection without reprojecting', () => {
    vi.stubGlobal(
      'Worker',
      class {
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
    const radar: RadarRenderDef = {
      id: 'r1',
      name: 'Radar',
      spokesPerRevolution: 2048,
      maxSpokeLen: 512,
      hasSparseSpokes: false,
      streamUrl: 'ws://localhost/spokes',
      legend: {}
    };
    const service = TestBed.inject(RadarRenderService);
    const source = service.createRadarSource(radar, new Subject<ShipState>());

    const image = source.getImage(
      [-1000, -1000, 1000, 1000],
      10,
      1,
      getProjection('EPSG:3857')!
    );

    service.disconnect();
    Reflect.deleteProperty(
      HTMLCanvasElement.prototype,
      'transferControlToOffscreen'
    );

    expect(image).not.toBeInstanceOf(ReprojImage);
  });
});
