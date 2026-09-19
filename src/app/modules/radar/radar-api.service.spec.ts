import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RadarAPIService } from './radar-api.service';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { SKWorkerService } from '../skstream/skstream.service';

/**
 * init() assembles the active radar from three Radar API responses: the
 * device, its capability manifest (control *definitions*) and the current
 * control *values*. Only controls the manifest files under the `base`
 * category are kept, keyed by id — the `Map<string, ControlValue>` the panel
 * renders (#755).
 */
describe('RadarAPIService init() (#755)', () => {
  const device = { name: 'Bridge', brand: 'Furuno' };
  const capabilities = {
    controls: {
      range: { id: 1, name: 'Range', category: 'base', dataType: 'number' },
      gain: { id: 2, name: 'Gain', category: 'base', dataType: 'number' },
      ftc: { id: 3, name: 'FTC', category: 'advanced', dataType: 'number' },
      standby: { id: 4, name: 'Standby', category: 'base', dataType: 'button' },
      noTx1: { id: 5, name: 'No-transmit', category: 'base', dataType: 'rect' }
    }
  };
  // a button carries no value and a rect carries geometry instead
  const controls = {
    range: { timestamp: 't', value: 3000 },
    gain: { timestamp: 't', value: 50, auto: true },
    ftc: { timestamp: 't', value: 1 },
    standby: {},
    noTx1: { enabled: true, x1: 0, y1: 0, x2: 100, y2: 100, width: 10 }
  };

  const responses: Record<string, unknown> = {
    'vessels/self/radars': { version: '3.4.0', radars: { 'radar-1': device } },
    'vessels/self/radars/radar-1': device,
    'vessels/self/radars/radar-1/capabilities': capabilities,
    'vessels/self/radars/radar-1/controls': controls
  };

  let app: {
    config: { radars: { deviceId: string } };
    skApiVersion: number;
    saveConfig: () => void;
    debug: () => void;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined); // no WebGL in jsdom
    app = {
      config: { radars: { deviceId: '' } },
      skApiVersion: 2,
      saveConfig: () => undefined,
      debug: () => undefined
    };
    TestBed.configureTestingModule({
      providers: [
        RadarAPIService,
        { provide: AppFacade, useValue: app },
        {
          provide: SignalKClient,
          useValue: {
            api: {
              get: (_v: number, path: string) =>
                path in responses
                  ? of(responses[path])
                  : throwError(() => new Error(`unexpected GET ${path}`))
            }
          }
        },
        {
          provide: SKStreamFacade,
          useValue: { vessels$: () => new Subject().asObservable() }
        },
        { provide: SKWorkerService, useValue: { radarUpdate: signal(null) } }
      ]
    });
  });

  it('keeps only base-category control values, keyed by control id', async () => {
    const service = TestBed.inject(RadarAPIService);
    const id = await service.init();

    expect(id).toBe('radar-1');
    expect(app.config.radars.deviceId).toBe('radar-1');

    const radar = service.radar();
    expect(radar.device).toEqual({ ...device, id: 'radar-1' });
    expect(radar.capabilities).toEqual(capabilities);
    expect(Array.from(radar.controls.keys())).toEqual([
      'range',
      'gain',
      'standby',
      'noTx1'
    ]);
    expect(radar.controls.get('gain')).toEqual({
      timestamp: 't',
      value: 50,
      auto: true
    });
  });

  it('resolves the current control values from /controls', async () => {
    const service = TestBed.inject(RadarAPIService);
    await expect(service.getControls('radar-1')).resolves.toEqual(controls);
  });
});
