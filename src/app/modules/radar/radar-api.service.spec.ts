import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RadarAPIService } from './radar-api.service';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { DeltaSignal } from 'src/app/types';

/**
 * init() assembles the active radar from three Radar API responses: the
 * device, its capability manifest (control *definitions*) and the current
 * control *values*. Every control the manifest defines is kept, keyed by id —
 * the `Map<string, ControlValue>` the panel renders (#755).
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
    noTx1: { enabled: true, x1: 0, y1: 0, x2: 100, y2: 100, width: 10 },
    // a value the manifest has no definition for
    stray: { timestamp: 't', value: 7 }
  };

  const responses: Record<string, unknown> = {
    'vessels/self/radars': {
      version: '3.4.0',
      radars: { 'radar-1': device, 'radar-2': { name: 'Bridge B' } }
    },
    'vessels/self/radars/radar-1': device,
    'vessels/self/radars/radar-1/capabilities': capabilities,
    'vessels/self/radars/radar-1/controls': controls
  };

  let radarUpdates: Subject<DeltaSignal>;
  let put: ReturnType<typeof vi.fn>;
  // responses a test holds back, answered in order before the defaults
  let held: Map<string, Array<Observable<unknown>>>;
  let app: {
    config: { radars: { deviceId: string } };
    skApiVersion: number;
    saveConfig: () => void;
    debug: () => void;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined); // no WebGL in jsdom
    radarUpdates = new Subject<DeltaSignal>();
    put = vi.fn(() => of(undefined));
    held = new Map();
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
                held.get(path)?.shift() ??
                (path in responses
                  ? of(responses[path])
                  : throwError(() => new Error(`unexpected GET ${path}`))),
              put
            }
          }
        },
        {
          provide: SKStreamFacade,
          useValue: { vessels$: () => new Subject().asObservable() }
        },
        {
          provide: SKWorkerService,
          useValue: { radar$: () => radarUpdates.asObservable() }
        }
      ]
    });
  });

  it('keeps the value of every control the manifest defines, keyed by control id', async () => {
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
      'ftc',
      'standby',
      'noTx1'
    ]);
    expect(radar.controls.get('gain')).toEqual({
      timestamp: 't',
      value: 50,
      auto: true
    });
  });

  it('lists every radar the server reports', async () => {
    const service = TestBed.inject(RadarAPIService);
    await service.init();

    expect(service.radars().map((r) => r.id)).toEqual(['radar-1', 'radar-2']);
  });

  describe('control updates from the stream', () => {
    const update = (path: string, value: unknown) =>
      radarUpdates.next({ path, value } as DeltaSignal);

    it('applies an update for the shown radar as a new value', async () => {
      const service = TestBed.inject(RadarAPIService);
      await service.init();
      const before = service.radar();

      update('radars.radar-1.controls.gain', { value: 20, auto: false });

      expect(service.radar()).not.toBe(before);
      expect(service.radar().controls.get('gain')).toEqual({
        value: 20,
        auto: false
      });
    });

    it('applies every update of a burst, not just the last', async () => {
      const service = TestBed.inject(RadarAPIService);
      await service.init();

      // one setting reported for both ranges of a dual-range radar
      update('radars.radar-1.controls.gain', { value: 20, auto: false });
      update('radars.radar-2.controls.gain', { value: 35, auto: false });

      expect(service.radar().controls.get('gain')).toEqual({
        value: 20,
        auto: false
      });
    });

    describe('when Range Units change', () => {
      // The radar lists its ranges, values and labels, for the unit system its
      // Range Units are set to, so the list changes with them.
      const capsPath = 'vessels/self/radars/radar-1/capabilities';
      const ctrlPath = 'vessels/self/radars/radar-1/controls';
      const nautical = {
        ...capabilities,
        controls: {
          ...capabilities.controls,
          rangeUnits: {
            id: 6,
            name: 'Range Units',
            category: 'installation',
            dataType: 'enum'
          }
        }
      };
      const metric = { ...nautical, supportedRanges: [125, 250] };
      const settle = () => new Promise((resolve) => setTimeout(resolve));

      beforeEach(() => {
        responses[capsPath] = nautical;
        responses[ctrlPath] = { ...controls, rangeUnits: { value: 0 } };
      });
      afterEach(() => {
        responses[capsPath] = capabilities;
        responses[ctrlPath] = controls;
      });

      it('reads the capabilities again, so the range list follows', async () => {
        const service = TestBed.inject(RadarAPIService);
        await service.init();
        responses[capsPath] = metric;

        update('radars.radar-1.controls.rangeUnits', { value: 1 });
        await settle();

        expect(service.radar().capabilities).toBe(metric);
        expect(service.radar().controls.get('rangeUnits')).toEqual({
          value: 1
        });
      });

      it('keeps them when the value is the one the radar had', async () => {
        const service = TestBed.inject(RadarAPIService);
        await service.init();
        responses[capsPath] = metric;

        update('radars.radar-1.controls.rangeUnits', { value: 0 });
        await settle();

        expect(service.radar().capabilities).toBe(nautical);
      });

      it('keeps the newest answer when an older read answers late', async () => {
        const service = TestBed.inject(RadarAPIService);
        await service.init();
        const late = new Subject<unknown>();
        held.set(capsPath, [late]);
        const mixed = { ...nautical, supportedRanges: [125, 926] };

        update('radars.radar-1.controls.rangeUnits', { value: 1 });
        responses[capsPath] = mixed;
        update('radars.radar-1.controls.rangeUnits', { value: 2 });
        await settle();
        late.next(metric);
        late.complete();
        await settle();

        expect(service.radar().capabilities).toBe(mixed);
      });

      it('drops a read that a reload of the radar overtook', async () => {
        const service = TestBed.inject(RadarAPIService);
        await service.init();
        const late = new Subject<unknown>();
        held.set(capsPath, [late]);
        const reloaded = { ...nautical };

        update('radars.radar-1.controls.rangeUnits', { value: 1 });
        responses[capsPath] = reloaded;
        await service.init();
        late.next(metric);
        late.complete();
        await settle();

        expect(service.radar().capabilities).toBe(reloaded);
      });

      it('reads them again when they change while the radar loads', async () => {
        const service = TestBed.inject(RadarAPIService);
        await service.init();
        const late = new Subject<unknown>();
        held.set(capsPath, [late]);

        const reload = service.init();
        await settle();
        responses[capsPath] = metric;
        update('radars.radar-1.controls.rangeUnits', { value: 1 });
        await settle();
        late.next(nautical);
        late.complete();
        await reload;
        await settle();

        expect(service.radar().capabilities).toBe(metric);
      });

      it("keeps them when another radar's Range Units change", async () => {
        const service = TestBed.inject(RadarAPIService);
        await service.init();
        responses[capsPath] = metric;

        update('radars.radar-2.controls.rangeUnits', { value: 1 });
        await settle();

        expect(service.radar().capabilities).toBe(nautical);
      });
    });

    it("ignores another radar's controls", async () => {
      const service = TestBed.inject(RadarAPIService);
      await service.init();

      update('radars.radar-2.controls.gain', { value: 20, auto: false });

      expect(service.radar().controls.get('gain')).toEqual({
        timestamp: 't',
        value: 50,
        auto: true
      });
    });

    it('ignores a control the manifest does not define', async () => {
      const service = TestBed.inject(RadarAPIService);
      await service.init();

      update('radars.radar-1.controls.stray', { value: 8 });

      expect(service.radar().controls.has('stray')).toBe(false);
    });
  });

  it('lets the latest radar selection win when an earlier one answers late', async () => {
    const service = TestBed.inject(RadarAPIService);
    await service.init();
    const lateList = new Subject<unknown>();
    held.set('vessels/self/radars', [lateList]);

    const earlier = service.init('radar-2');
    await service.init('radar-1');
    lateList.next(responses['vessels/self/radars']);
    lateList.complete();
    await earlier;

    expect(service.radarId()).toBe('radar-1');
    expect(service.radar().device.id).toBe('radar-1');
    expect(app.config.radars.deviceId).toBe('radar-1');
  });

  it('sends a control change as the PUT body', async () => {
    const service = TestBed.inject(RadarAPIService);
    await service.init();

    await service.setControl(undefined, 'gain', { auto: true });

    expect(put).toHaveBeenCalledWith(
      2,
      'vessels/self/radars/radar-1/controls/gain',
      { auto: true }
    );
  });

  it('resolves the current control values from /controls', async () => {
    const service = TestBed.inject(RadarAPIService);
    await expect(service.getControls('radar-1')).resolves.toEqual(controls);
  });
});
