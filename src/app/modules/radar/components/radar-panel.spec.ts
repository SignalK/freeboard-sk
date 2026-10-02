import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RadarPanel } from './radar-panel';
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
  let radarLayer: boolean;
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
    radarLayer = true;
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
            config: { radars: { opacity: 1 } },
            uiCtrl: () => ({ radarLayer }),
            formatValueForDisplay: (v: number) => `${v}`,
            saveConfig: () => undefined,
            parseHttpErrorResponse: () => undefined
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
  const control = (el: HTMLElement, name: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('.ctl')).find(
      (c) => c.querySelector('.ctl-name')?.textContent?.trim() === name
    );

  it('groups the controls by category', () => {
    const el: HTMLElement = open().nativeElement;
    const titles = Array.from(el.querySelectorAll('mat-panel-title')).map((t) =>
      t.textContent.trim()
    );
    expect(titles).toEqual(['Base', 'Targets', 'Info']);
  });

  it('shows the Doppler mode the radar reports', () => {
    const el: HTMLElement = open().nativeElement;
    expect(
      control(el, 'Doppler').querySelector('.ctl-value').textContent.trim()
    ).toBe('Off');
  });

  it('shows read-only information as text', () => {
    const el: HTMLElement = open().nativeElement;
    const row = control(el, 'Firmware version');
    expect(row.querySelector('.ctl-value').textContent.trim()).toBe('01.05');
    expect(row.querySelector('input')).toBeNull();
  });

  it('hides the gain slider while gain is on auto, and shows it once it is not', () => {
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    const toggle = control(el, 'Gain').querySelector('mat-slide-toggle button');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(control(el, 'Gain').querySelector('mat-slider')).toBeNull();

    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set('gain', { auto: false, value: 28 })
    }));
    fixture.detectChanges();

    expect(control(el, 'Gain').querySelector('mat-slider')).not.toBeNull();
    expect(
      control(el, 'Gain').querySelector('.ctl-value').textContent.trim()
    ).toBe('28');
  });

  it('switches auto off with an { auto } change', () => {
    const fixture = open();
    control(fixture.nativeElement, 'Gain')
      .querySelector<HTMLElement>('mat-slide-toggle button')
      .click();

    expect(api.setControl).toHaveBeenCalledWith(undefined, 'gain', {
      auto: false
    });
  });

  it('presses a button control with an empty change', () => {
    const el: HTMLElement = open().nativeElement;
    Array.from(el.querySelectorAll<HTMLElement>('.ctl-button'))
      .find((b) => b.textContent.trim() === 'Clear targets')
      .click();

    expect(api.setControl).toHaveBeenCalledWith(undefined, 'clearTargets', {});
  });

  it('colours the lozenge by power state and transmits from standby', () => {
    const el: HTMLElement = open().nativeElement;
    expect(el.querySelector('.lozenge').classList).toContain('power-standby');
    expect(el.querySelector('.state').textContent.trim()).toBe('Standby');

    el.querySelector<HTMLElement>('.power-button').click();

    expect(api.setControl).toHaveBeenCalledWith(undefined, 'power', {
      value: 2
    });
  });

  it('switches to another radar from the radar menu', async () => {
    const fixture = open();
    fixture.nativeElement.querySelector('.radar-name').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
    );
    expect(items.map((i) => i.textContent.trim())).toEqual([
      'radio_button_checked DRS4D-NXT 6424',
      'radio_button_unchecked DRS4D-NXT 6424 B'
    ]);
    items[1].click();

    expect(api.init).toHaveBeenCalledWith('fur6424B');
  });

  it('offers no radar menu with a single radar', () => {
    api.radars.set([{ id: 'fur6424A', name: 'DRS4D-NXT 6424' }]);
    const el: HTMLElement = open().nativeElement;
    expect(el.querySelector<HTMLButtonElement>('.radar-name').disabled).toBe(
      true
    );
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

    radarLayer = false;
    fixture.componentRef.changeDetectorRef.markForCheck();
    eye().click();
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
