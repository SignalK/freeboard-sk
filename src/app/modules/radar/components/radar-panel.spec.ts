import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RadarPanel } from './radar-panel';
import { GuardZoneEditService } from '../guard-zone-edit.service';
import { AppFacade } from 'src/app/app.facade';
import {
  ActiveRadar,
  CapabilityManifest,
  ControlValue,
  RadarAPIService
} from '../radar-api.service';

/**
 * The radar panel follows the MaYaRa radar GUI: a power lozenge with the radar
 * selector, the radar's controls grouped by category, Auto switches where the
 * radar offers them, and every control showing the value the radar reports.
 */
describe('RadarPanel', () => {
  const capabilities = {
    supportedRanges: [926, 1852],
    controls: {
      power: {
        id: 0,
        name: 'Power',
        description: 'Radar operational state',
        category: 'base',
        dataType: 'enum',
        descriptions: { 0: 'Off', 1: 'Standby', 2: 'Transmit' },
        validValues: [1, 2]
      },
      range: {
        id: 2,
        name: 'Range',
        description: 'Maximum distance shown',
        category: 'base',
        dataType: 'number',
        units: 'm',
        descriptions: { 926: '1/2 nm', 1852: '1 nm' }
      },
      gain: {
        id: 4,
        name: 'Gain',
        description: 'Sensitivity',
        category: 'base',
        dataType: 'number',
        hasAuto: true,
        minValue: 0,
        maxValue: 100,
        stepValue: 1
      },
      doppler: {
        id: 9,
        name: 'Doppler',
        description: 'Doppler mode',
        category: 'base',
        dataType: 'enum',
        maxValue: 2,
        descriptions: { 0: 'Off', 1: 'Target', 2: 'Rain' }
      },
      clearTargets: {
        id: 15,
        name: 'Clear targets',
        description: 'Clear all targets',
        category: 'targets',
        dataType: 'button'
      },
      firmwareVersion: {
        id: 60,
        name: 'Firmware version',
        description: 'Firmware version',
        category: 'info',
        dataType: 'string',
        isReadOnly: true
      }
    }
  } as unknown as CapabilityManifest;

  let radar: WritableSignal<ActiveRadar>;
  let ui: WritableSignal<{ radarLayer: boolean }>;
  let api: {
    radar: WritableSignal<ActiveRadar>;
    radars: WritableSignal<Array<{ id: string; name: string }>>;
    init: ReturnType<typeof vi.fn>;
    setControl: ReturnType<typeof vi.fn>;
  };

  const values = (v: Record<string, ControlValue>) =>
    new Map(Object.entries(v));

  beforeEach(() => {
    TestBed.resetTestingModule();
    ui = signal({ radarLayer: true });
    radar = signal({
      device: { id: 'fur6424A', name: 'DRS4D-NXT 6424', brand: 'Furuno' },
      capabilities,
      controls: values({
        power: { value: 1 },
        range: { value: 1852 },
        gain: { auto: true, value: 28 },
        doppler: { value: 0 },
        firmwareVersion: { value: '01.05' }
      })
    });
    api = {
      radar,
      radars: signal([
        { id: 'fur6424A', name: 'DRS4D-NXT 6424' },
        { id: 'fur6424B', name: 'DRS4D-NXT 6424 B' }
      ]),
      init: vi.fn(async () => 'fur6424B'),
      setControl: vi.fn(async () => undefined)
    };
    TestBed.configureTestingModule({
      imports: [RadarPanel],
      providers: [
        {
          provide: AppFacade,
          useValue: {
            config: {
              radars: { opacity: 1, rings: true },
              units: { distance: 'kilometer' }
            },
            uiCtrl: () => ui(),
            formatValueForDisplay: (v: number) => `${v}`,
            saveConfig: (): void => undefined,
            parseHttpErrorResponse: (): void => undefined
          }
        },
        { provide: RadarAPIService, useValue: api }
      ]
    });
  });

  const open = () => {
    const fixture = TestBed.createComponent(RadarPanel);
    fixture.detectChanges();
    return fixture;
  };
  const control = (el: HTMLElement, name: string): HTMLElement => {
    const row = Array.from(el.querySelectorAll<HTMLElement>('.ctl')).find(
      (c) => c.querySelector('.ctl-name')?.textContent?.trim() === name
    );
    if (!row) {
      throw new Error(`no ${name} control`);
    }
    return row;
  };

  it('groups the controls by category', () => {
    const el: HTMLElement = open().nativeElement;
    const titles = Array.from(el.querySelectorAll('mat-panel-title')).map((t) =>
      t.textContent?.trim()
    );
    expect(titles).toEqual(['Base', 'Targets', 'Info']);
  });

  it('shows the Doppler mode the radar reports', () => {
    const el: HTMLElement = open().nativeElement;
    expect(
      control(el, 'Doppler').querySelector('.ctl-value')!.textContent?.trim()
    ).toBe('Off');
  });

  describe('a step set on the panel', () => {
    const report = (id: string, cv: ControlValue) =>
      radar.update((r) => ({
        ...r,
        controls: new Map(r.controls).set(id, cv)
      }));
    const thumb = (el: HTMLElement) =>
      control(el, 'Doppler').querySelector<HTMLInputElement>(
        'input[matSliderThumb]'
      )!;
    const choose = (
      fixture: ReturnType<typeof open>,
      el: HTMLElement,
      step: number
    ) => {
      thumb(el).value = String(step);
      thumb(el).dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    it('goes back to the value the radar reports when it refuses the change', () => {
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      choose(fixture, el, 2);
      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'doppler', {
        value: 2
      });

      report('doppler', { value: 0 });
      fixture.detectChanges();

      expect(thumb(el).value).toBe('0');
      expect(
        control(el, 'Doppler').querySelector('.ctl-value')!.textContent?.trim()
      ).toBe('Off');
    });

    it('keeps the same control when the radar takes the change', () => {
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      const before = thumb(el);
      choose(fixture, el, 2);

      report('doppler', { value: 2 });
      fixture.detectChanges();

      expect(thumb(el)).toBe(before);
      expect(thumb(el).value).toBe('2');
    });

    it('stays where it was set while only other controls are reported', () => {
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      choose(fixture, el, 2);

      report('gain', { auto: true, value: 30 });
      fixture.detectChanges();

      expect(thumb(el).value).toBe('2');
      expect(
        control(el, 'Doppler').querySelector('.ctl-value')!.textContent?.trim()
      ).toBe('Off');
    });

    it('goes back when the change does not reach the radar', async () => {
      // the request fails after a round trip, as it does on the network
      api.setControl.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('offline')))
          )
      );
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      choose(fixture, el, 2);
      expect(thumb(el).value).toBe('2');

      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();

      expect(thumb(el).value).toBe('0');
    });
  });

  it('sets the auto adjustment once Auto is switched on, before the radar answers', () => {
    radar.update((r) => ({
      ...r,
      capabilities: {
        ...r.capabilities,
        controls: {
          ...r.capabilities.controls,
          sea: {
            id: 6,
            name: 'Sea clutter',
            description: 'Sea clutter suppression',
            category: 'base',
            dataType: 'number',
            hasAuto: true,
            hasAutoAdjustable: true,
            autoAdjustMinValue: -50,
            autoAdjustMaxValue: 50,
            minValue: 0,
            maxValue: 100
          }
        }
      },
      controls: new Map(r.controls).set('sea', { auto: false, value: 50 })
    }));
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    control(el, 'Sea clutter')
      .querySelector<HTMLElement>('mat-slide-toggle button')!
      .click();
    fixture.detectChanges();

    const field = control(el, 'Sea clutter').querySelector<HTMLInputElement>(
      'input[type=number]'
    )!;
    field.value = '-20';
    field.dispatchEvent(new Event('change'));

    expect(api.setControl).toHaveBeenLastCalledWith('fur6424A', 'sea', {
      auto: true,
      autoValue: -20
    });
  });

  it('keeps a value set before Auto is switched on and off again, before the radar answers', () => {
    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set('gain', { auto: false, value: 28 })
    }));
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    const thumb = () =>
      control(el, 'Gain').querySelector<HTMLInputElement>(
        'input[matSliderThumb]'
      )!;
    const toggle = () =>
      control(el, 'Gain').querySelector<HTMLElement>(
        'mat-slide-toggle button'
      )!;
    thumb().value = '40';
    thumb().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    toggle().click();
    fixture.detectChanges();
    toggle().click();
    fixture.detectChanges();

    expect(api.setControl).toHaveBeenLastCalledWith('fur6424A', 'gain', {
      auto: false
    });
    expect(thumb().value).toBe('40');
  });

  it('keeps a change made on one radar off the next one', () => {
    radar.update((r) => {
      const controls = new Map(r.controls);
      controls.delete('gain');
      return { ...r, controls };
    });
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    const field = () =>
      control(el, 'Gain').querySelector<HTMLInputElement>(
        'input[type=number]'
      )!;
    field().value = '40';
    field().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    radar.update((r) => ({
      ...r,
      device: { ...r.device, id: 'fur6424B', name: 'DRS4D-NXT 6424 B' },
      controls: new Map(r.controls)
    }));
    fixture.detectChanges();

    expect(field().value).toBe('');
  });

  it('shows an enum the radar has not reported as a drop-down, not as its first step', () => {
    radar.update((r) => {
      const controls = new Map(r.controls);
      controls.delete('doppler');
      return { ...r, controls };
    });
    const el: HTMLElement = open().nativeElement;
    const row = control(el, 'Doppler');
    expect(row.querySelector('mat-slider')).toBeNull();
    expect(row.querySelector('mat-select')).not.toBeNull();
    expect(row.querySelector('.ctl-value')!.textContent?.trim()).toBe('—');
  });

  it('shows a level with no reported value as an empty field, not a slider at its minimum', () => {
    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set('gain', { auto: false })
    }));
    const el: HTMLElement = open().nativeElement;
    const row = control(el, 'Gain');
    expect(row.querySelector('mat-slider')).toBeNull();
    expect(
      row.querySelector<HTMLInputElement>('input[type=number]')!.value
    ).toBe('');
  });

  it('shows read-only information as text', () => {
    const el: HTMLElement = open().nativeElement;
    const row = control(el, 'Firmware version');
    expect(row.querySelector('.ctl-value')!.textContent?.trim()).toBe('01.05');
    expect(row.querySelector('input')).toBeNull();
  });

  it('hides the gain slider while gain is on auto, and shows it once it is not', () => {
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    const toggle = control(el, 'Gain').querySelector(
      'mat-slide-toggle button'
    )!;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(control(el, 'Gain').querySelector('mat-slider')).toBeNull();

    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set('gain', { auto: false, value: 28 })
    }));
    fixture.detectChanges();

    expect(control(el, 'Gain').querySelector('mat-slider')).not.toBeNull();
    expect(
      control(el, 'Gain').querySelector('.ctl-value')!.textContent?.trim()
    ).toBe('28');
  });

  it('shows an auto adjustment as an offset, not as a value label', () => {
    radar.update((r) => ({
      ...r,
      capabilities: {
        ...r.capabilities,
        controls: {
          ...r.capabilities.controls,
          sea: {
            id: 6,
            name: 'Sea clutter',
            description: 'Sea clutter suppression',
            category: 'base',
            dataType: 'number',
            hasAuto: true,
            hasAutoAdjustable: true,
            autoAdjustMinValue: -50,
            autoAdjustMaxValue: 50,
            minValue: 0,
            maxValue: 100,
            descriptions: { 0: 'Off' }
          }
        }
      },
      controls: new Map(r.controls).set('sea', {
        auto: true,
        autoValue: 0,
        value: 0
      })
    }));
    const el: HTMLElement = open().nativeElement;
    expect(
      control(el, 'Sea clutter')
        .querySelector('.ctl-value')!
        .textContent?.trim()
    ).toBe('A0');
  });

  it('shows and takes an angle in degrees while the radar uses radians', () => {
    radar.update((r) => ({
      ...r,
      capabilities: {
        ...r.capabilities,
        controls: {
          ...r.capabilities.controls,
          bearingAlignment: {
            id: 50,
            name: 'Bearing alignment',
            description: 'Heading offset of the antenna',
            category: 'base',
            dataType: 'number',
            minValue: -Math.PI,
            maxValue: Math.PI,
            stepValue: Math.PI / 1800,
            units: 'rad'
          }
        }
      },
      controls: new Map(r.controls).set('bearingAlignment', {
        value: Math.PI / 36
      })
    }));
    const fixture = open();
    const row = control(fixture.nativeElement, 'Bearing alignment');
    expect(row.querySelector('mat-slider')).toBeNull();
    const field = row.querySelector<HTMLInputElement>('input[type=number]')!;
    expect(field.value).toBe('5');
    expect([field.min, field.max, field.step]).toEqual(['-180', '180', '0.1']);

    field.value = '-12.5';
    field.dispatchEvent(new Event('change'));

    const [, id, change] = api.setControl.mock.calls.at(-1)!;
    expect(id).toBe('bearingAlignment');
    expect(change.value).toBeCloseTo((-12.5 * Math.PI) / 180, 10);

    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set('bearingAlignment', {
        value: String(Math.PI / 18)
      })
    }));
    fixture.detectChanges();
    expect(field.value).toBe('10');
  });

  it('switches auto off with an { auto } change', () => {
    const fixture = open();
    control(fixture.nativeElement, 'Gain')
      .querySelector<HTMLElement>('mat-slide-toggle button')!
      .click();

    expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'gain', {
      auto: false
    });
  });

  it('presses a button control with an empty change', () => {
    const el: HTMLElement = open().nativeElement;
    Array.from(el.querySelectorAll<HTMLElement>('.ctl-button'))
      .find((b) => b.textContent?.trim() === 'Clear targets')!
      .click();

    expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'clearTargets', {});
  });

  it('colours the lozenge by power state and transmits from standby', () => {
    const el: HTMLElement = open().nativeElement;
    expect(el.querySelector('.lozenge')!.classList).toContain('power-standby');
    expect(el.querySelector('.state')!.textContent?.trim()).toBe('Standby');

    el.querySelector<HTMLElement>('.power-button')!.click();

    expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'power', {
      value: 2
    });
  });

  it('disables power and range while the radar does not allow them', () => {
    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls)
        .set('power', { value: 1, allowed: false })
        .set('range', { value: 1852, allowed: false })
    }));
    const el: HTMLElement = open().nativeElement;
    expect(el.querySelector<HTMLButtonElement>('.power-button')!.disabled).toBe(
      true
    );
    el.querySelectorAll<HTMLButtonElement>('.range button').forEach((b) =>
      expect(b.disabled).toBe(true)
    );
  });

  describe('range', () => {
    const rangeButton = (el: HTMLElement, which: string) =>
      el.querySelector<HTMLButtonElement>(`.range .${which}`)!;
    const atRange = (value: number | undefined, validValues?: number[]) =>
      radar.update((r) => ({
        ...r,
        capabilities: {
          ...r.capabilities,
          controls: {
            ...r.capabilities.controls,
            range: { ...r.capabilities.controls['range'], validValues }
          }
        } as CapabilityManifest,
        controls: new Map(r.controls).set('range', { value })
      }));

    it('shows the range between a shorter + and a longer - button', () => {
      const el: HTMLElement = open().nativeElement;
      expect(el.querySelector('.range-text')!.textContent?.trim()).toBe('1 nm');

      rangeButton(el, 'range-in').click();

      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'range', {
        value: 926
      });
    });

    it('greys the button that would step past either end of the ranges', () => {
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      expect(rangeButton(el, 'range-out').disabled).toBe(true);
      expect(rangeButton(el, 'range-in').disabled).toBe(false);

      atRange(926);
      fixture.detectChanges();

      expect(rangeButton(el, 'range-in').disabled).toBe(true);
      rangeButton(el, 'range-out').click();
      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'range', {
        value: 1852
      });
    });

    it('steps once per tap before the radar reports the range sent', () => {
      atRange(463, [231, 463, 926, 1852]);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;

      rangeButton(el, 'range-out').click();
      fixture.detectChanges();
      rangeButton(el, 'range-out').click();

      expect(api.setControl.mock.calls.map((c) => c[2])).toEqual([
        { value: 926 },
        { value: 1852 }
      ]);
    });

    it('starts at the shortest range while the radar reports none', () => {
      atRange(undefined);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.range-text')!.textContent?.trim()).toBe('—');

      rangeButton(el, 'range-out').click();

      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'range', {
        value: 926
      });
    });

    it('steps from the nearest listed range to a reported range not listed', () => {
      atRange(926, [500, 750, 1000, 1500]);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.range-text')!.textContent?.trim()).toBe(
        '1/2 nm'
      );

      rangeButton(el, 'range-out').click();
      fixture.detectChanges();
      rangeButton(el, 'range-in').click();

      expect(api.setControl.mock.calls.map((c) => c[2])).toEqual([
        { value: 1000 },
        { value: 750 }
      ]);
    });

    it('greys a step past the list from a reported range not listed', () => {
      atRange(2000, [500, 750, 1000, 1500]);
      const el: HTMLElement = open().nativeElement;

      expect(rangeButton(el, 'range-out').disabled).toBe(true);
      rangeButton(el, 'range-in').click();
      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'range', {
        value: 1500
      });
    });

    it('opens the list on the range in use', async () => {
      const fixture = open();
      rangeButton(fixture.nativeElement, 'range-value').click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement?.textContent?.trim()).toBe(
        'radio_button_checked 1 nm'
      );
    });

    it('jumps to any range from the list behind the range shown', async () => {
      const fixture = open();
      rangeButton(fixture.nativeElement, 'range-value').click();
      fixture.detectChanges();
      await fixture.whenStable();

      const items = Array.from(
        document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
      );
      expect(items.map((i) => i.textContent?.trim())).toEqual([
        'radio_button_unchecked 1/2 nm',
        'radio_button_checked 1 nm'
      ]);
      items[0].click();

      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'range', {
        value: 926
      });
    });
  });

  it('switches to another radar from the radar menu', async () => {
    const fixture = open();
    fixture.nativeElement.querySelector('.radar-name')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
    );
    expect(items.map((i) => i.textContent?.trim())).toEqual([
      'radio_button_checked DRS4D-NXT 6424',
      'radio_button_unchecked DRS4D-NXT 6424 B'
    ]);
    items[1].click();

    expect(api.init).toHaveBeenCalledWith('fur6424B');
  });

  it('offers no radar menu with a single radar', () => {
    api.radars.set([{ id: 'fur6424A', name: 'DRS4D-NXT 6424' }]);
    const el: HTMLElement = open().nativeElement;
    expect(el.querySelector<HTMLButtonElement>('.radar-name')!.disabled).toBe(
      true
    );
  });

  const transmit = () =>
    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set('power', { value: 2 })
    }));

  it('switches the range rings with the rings button and saves the choice', () => {
    transmit();
    const fixture = open();
    const app = TestBed.inject(AppFacade);
    const save = vi.spyOn(app, 'saveConfig');
    const rings = () =>
      fixture.nativeElement.querySelector('.rings-button') as HTMLElement;

    rings().click();
    expect(app.config.radars.rings).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);

    rings().click();
    expect(app.config.radars.rings).toBe(true);
  });

  it('offers no range rings while the radar sends no picture', () => {
    const fixture = open();
    const app = TestBed.inject(AppFacade);
    const rings = () =>
      fixture.nativeElement.querySelector('.rings-button') as HTMLElement;

    // in standby
    rings().click();
    expect(app.config.radars.rings).toBe(true);
    expect(rings().getAttribute('aria-label')).toBe(
      'Range rings show with the radar picture on the chart'
    );

    // transmitting, with the overlay hidden
    transmit();
    ui.set({ radarLayer: false });
    fixture.detectChanges();
    rings().click();
    expect(app.config.radars.rings).toBe(true);

    ui.set({ radarLayer: true });
    fixture.detectChanges();
    expect(rings().getAttribute('aria-label')).toBe('Hide range rings');
  });

  it('hides and shows the overlay with the eye button', () => {
    const fixture = open();
    const disconnect = vi.fn();
    const connect = vi.fn();
    fixture.componentInstance.disconnect.subscribe(disconnect);
    fixture.componentInstance.connect.subscribe(connect);
    const eye = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.radar-head > button')
      ).at(-1) as HTMLElement;

    eye().click();
    expect(disconnect).toHaveBeenCalledTimes(1);

    ui.set({ radarLayer: false });
    fixture.componentRef.changeDetectorRef.markForCheck();
    eye().click();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  describe('guard zones', () => {
    const withZone = (value: ControlValue) =>
      radar.update((r) => ({
        ...r,
        capabilities: {
          ...r.capabilities,
          controls: {
            ...r.capabilities.controls,
            guardZone1: {
              id: 16,
              name: 'Guard zone 1',
              description: 'Guard zone',
              category: 'guardZones',
              dataType: 'zone',
              hasEnabled: true
            }
          }
        } as unknown as CapabilityManifest,
        controls: new Map(r.controls).set('guardZone1', value)
      }));
    const zoneBlock = (el: HTMLElement) =>
      control(el, 'Guard zone 1').querySelector<HTMLElement>('.zone-edit')!;
    const button = (el: HTMLElement, label: string) =>
      Array.from(
        zoneBlock(el).querySelectorAll<HTMLButtonElement>('button')
      ).find((b) => b.textContent?.trim() === label)!;
    beforeEach(() => transmit());

    const zone: ControlValue = {
      value: 0,
      endValue: Math.PI / 2,
      startDistance: 100,
      endDistance: 800,
      enabled: true
    };

    it('offers drawing a zone the radar does not hold yet', () => {
      withZone({ value: 0, endValue: 0, startDistance: 0, endDistance: 0 });
      const el: HTMLElement = open().nativeElement;
      expect(button(el, 'Draw').disabled).toBe(false);
      expect(button(el, 'Edit').disabled).toBe(true);
      expect(button(el, 'Clear').disabled).toBe(true);
    });

    it('draws a zone from the panel', () => {
      withZone(zone);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      button(el, 'Draw').click();
      fixture.detectChanges();
      expect(TestBed.inject(GuardZoneEditService).edit()?.mode).toBe('draw');
      expect(zoneBlock(el).querySelector('.zone-hint')!.textContent).toContain(
        'Drag across the chart'
      );
    });

    it('edits a zone in numbers and saves it in one change', () => {
      withZone(zone);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      button(el, 'Edit').click();
      fixture.detectChanges();

      const field = (label: string) =>
        zoneBlock(el).querySelector<HTMLInputElement>(
          `input[aria-label="${label}"]`
        )!;
      expect(field('To bearing').value).toBe('90');
      expect(field('Outer distance').value).toBe('0.8');

      field('Outer distance').value = '1.5';
      field('Outer distance').dispatchEvent(new Event('change'));
      fixture.detectChanges();
      button(el, 'Save').click();

      expect(api.setControl).toHaveBeenCalledWith('fur6424A', 'guardZone1', {
        value: 0,
        endValue: Math.PI / 2,
        startDistance: 100,
        endDistance: 1500,
        enabled: true
      });
    });

    it('shows a typed distance as the zone rules limit it', () => {
      withZone(zone);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      button(el, 'Edit').click();
      fixture.detectChanges();

      const inner = zoneBlock(el).querySelector<HTMLInputElement>(
        'input[aria-label="Inner distance"]'
      )!;
      // the inner distance stays a zone depth inside the outer one, also
      // when the same refused value is typed again
      for (let i = 0; i < 2; i++) {
        inner.value = '2';
        inner.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(inner.value).toBe('0.75');
      }
    });

    it('ends the edit when the panel closes', () => {
      withZone(zone);
      const fixture = open();
      button(fixture.nativeElement, 'Edit').click();
      fixture.destroy();
      expect(TestBed.inject(GuardZoneEditService).edit()).toBeUndefined();
    });

    it('ends the edit and offers no drawing while the radar is hidden', () => {
      withZone(zone);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      button(el, 'Draw').click();
      ui.set({ radarLayer: false });
      fixture.detectChanges();

      expect(TestBed.inject(GuardZoneEditService).edit()).toBeUndefined();
      expect(button(el, 'Draw').disabled).toBe(true);
      expect(button(el, 'Edit').disabled).toBe(true);
    });

    it('ends the edit and offers no drawing while the radar is in standby', () => {
      withZone(zone);
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      button(el, 'Edit').click();
      radar.update((r) => ({
        ...r,
        controls: new Map(r.controls).set('power', { value: 1 })
      }));
      fixture.detectChanges();

      expect(TestBed.inject(GuardZoneEditService).edit()).toBeUndefined();
      expect(button(el, 'Draw').disabled).toBe(true);
      expect(button(el, 'Edit').disabled).toBe(true);
    });

    it('keeps no edit that a failed save puts back in standby', async () => {
      withZone(zone);
      let refuse: (err: Error) => void = () => undefined;
      api.setControl.mockImplementationOnce(
        () => new Promise((_, reject) => (refuse = reject))
      );
      const fixture = open();
      const el: HTMLElement = fixture.nativeElement;
      button(el, 'Edit').click();
      fixture.detectChanges();
      button(el, 'Save').click();
      radar.update((r) => ({
        ...r,
        controls: new Map(r.controls).set('power', { value: 1 })
      }));
      fixture.detectChanges();

      refuse(new Error('refused'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(GuardZoneEditService).edit()).toBeUndefined();
    });

    it('switches a zone off as the radar holds it', () => {
      withZone(zone);
      const el: HTMLElement = open().nativeElement;
      zoneBlock(el)
        .querySelector<HTMLElement>('mat-slide-toggle button')!
        .click();
      expect(api.setControl).toHaveBeenCalledWith(
        'fur6424A',
        'guardZone1',
        expect.objectContaining({ endDistance: 800, enabled: false })
      );
    });
  });
});
