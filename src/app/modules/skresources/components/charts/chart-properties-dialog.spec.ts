import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChartPropertiesDialog } from './chart-properties-dialog';
import { AppFacade } from 'src/app/app.facade';
import { SKChart } from '../../resource-classes';

/**
 * #783: a user-added chart (source `resources-provider`) can be given an
 * auto-refresh interval from its Properties dialog. The resource stores
 * milliseconds; the field is whole minutes, 0 meaning never. A provider-served
 * chart keeps its provider-declared interval and only shows it.
 */
describe('ChartPropertiesDialog — refresh interval', () => {
  let fixture: ComponentFixture<ChartPropertiesDialog>;
  let close: ReturnType<typeof vi.fn>;

  const open = async (chart: Partial<SKChart>) => {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ChartPropertiesDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: chart },
        { provide: AppFacade, useValue: {} }
      ]
    });
    fixture = TestBed.createComponent(ChartPropertiesDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const minutesInput = () =>
    fixture.nativeElement.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement | null;

  const typeMinutes = async (value: string) => {
    const input = minutesInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const save = () =>
    (
      fixture.componentInstance as unknown as {
        handleClose: (save: boolean) => void;
      }
    ).handleClose(true);

  const saved = (): SKChart => close.mock.calls[0][0].chart;

  const userChart = (extra: Partial<SKChart> = {}): Partial<SKChart> => ({
    name: 'NEXRAD',
    description: '',
    type: 'tilelayer',
    url: 'https://radar.example/{z}/{x}/{y}.png',
    layers: [],
    source: 'resources-provider',
    ...extra
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows a stored interval in minutes for a user-added chart', async () => {
    await open(userChart({ refreshInterval: 300000 }));
    expect(minutesInput()?.value).toBe('5');
  });

  it('writes the entered minutes back as milliseconds on save', async () => {
    await open(userChart());
    await typeMinutes('10');
    save();
    expect(saved().refreshInterval).toBe(600000);
  });

  it('drops the key when the interval is set to 0', async () => {
    await open(userChart({ refreshInterval: 300000 }));
    await typeMinutes('0');
    save();
    expect('refreshInterval' in saved()).toBe(false);
  });

  it('rejects a fractional number of minutes rather than rounding it', async () => {
    await open(userChart({ refreshInterval: 300000 }));
    await typeMinutes('1.5');
    const saveButton = fixture.nativeElement.querySelector(
      'mat-dialog-actions button'
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
    // Even if a save got through, the fraction is not persisted as something
    // the user did not type.
    save();
    expect('refreshInterval' in saved()).toBe(false);
  });

  it('leaves a provider-served chart read-only and its interval untouched', async () => {
    await open({
      ...userChart({ refreshInterval: 120000 }),
      source: 'charts-plugin'
    });
    expect(minutesInput()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('every 2 min');
    save();
    expect(saved().refreshInterval).toBe(120000);
  });

  it('offers no interval for a vector (Mapbox style) source', async () => {
    await open(userChart({ type: 'mapstyleJSON' }));
    expect(minutesInput()).toBeNull();
    save();
    expect('refreshInterval' in saved()).toBe(false);
  });
});

/**
 * #808: picking a layer fills in what the capabilities document can tell us
 * about the new chart -- its name and description from the layer's title and
 * abstract while the chart still carries its placeholder name, and a refresh
 * cadence for a time-varying layer while the interval is still 0 -- without
 * ever overwriting a value the user has typed.
 */
describe('ChartPropertiesDialog — layer pick pre-fills', () => {
  let fixture: ComponentFixture<ChartPropertiesDialog>;
  let close: ReturnType<typeof vi.fn>;

  const T0 = '2026-09-18T00:00:00.000Z';
  const T1 = '2026-09-18T12:00:00.000Z';

  const wmsCapabilities = {
    type: 'WMS',
    name: 'IEM WMS',
    description: '',
    url: 'https://wms.example',
    layers: [
      {
        name: 'nexrad-n0q',
        title: 'NEXRAD Base Reflectivity',
        description: 'Composite radar mosaic, updated every 10 minutes.',
        selected: false,
        parent: null,
        time: { from: T0, to: T1, interval: 600000, current: T1 }
      },
      {
        name: 'nexrad-n0r',
        title: 'NEXRAD Base Reflectivity (legacy)',
        description: 'Legacy mosaic',
        selected: false,
        parent: null,
        time: { from: T0, to: T1, interval: 5000, current: T1 }
      },
      {
        name: 'coastline',
        title: 'Coastline',
        description: 'Static coastline',
        selected: false,
        parent: null,
        time: null
      }
    ]
  };

  const wmtsCapabilities = {
    type: 'WMTS',
    name: 'GIBS',
    description: '',
    url: 'https://wmts.example',
    layers: [
      {
        id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        name: 'Corrected Reflectance (True Color, MODIS, Terra)',
        description: 'Daily true-colour imagery',
        format: 'jpg',
        time: { from: T0, to: T1, values: [T0, T1], current: T1 }
      }
    ]
  };

  // The dialog fetches capabilities through a worker; answer it directly
  // (see the lessons log: vi.mock is unavailable here, stub the global).
  class StubWorker {
    static reply: unknown = null;
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage() {
      queueMicrotask(() => this.onmessage?.({ data: StubWorker.reply }));
    }
    terminate() {}
  }

  const open = async (chart: Partial<SKChart>, capabilities: unknown) => {
    StubWorker.reply = capabilities;
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ChartPropertiesDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: chart },
        { provide: AppFacade, useValue: {} }
      ]
    });
    fixture = TestBed.createComponent(ChartPropertiesDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const dialog = () =>
    fixture.componentInstance as unknown as {
      handleLayerSelection: (layers: string[]) => void;
      refreshMinutes: number;
      data: SKChart;
    };

  // ngModel writes the field asynchronously, so settle before reading it.
  const pick = async (layers: string[]) => {
    dialog().handleLayerSelection(layers);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const nameInput = () =>
    fixture.nativeElement.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;

  const minutesInput = () =>
    fixture.nativeElement.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement | null;

  const typeInto = async (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const newWms = (extra: Partial<SKChart> = {}): Partial<SKChart> => ({
    name: 'New WMS Chart',
    description: '',
    type: 'WMS',
    url: 'https://wms.example',
    layers: [],
    source: 'resources-provider',
    ...extra
  });

  const newWmts = (extra: Partial<SKChart> = {}): Partial<SKChart> => ({
    name: 'New WMTS Chart',
    description: '',
    type: 'WMTS',
    url: 'https://wmts.example',
    format: 'png',
    layers: [],
    source: 'resources-provider',
    ...extra
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.stubGlobal('Worker', StubWorker);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the layer picker from the stubbed capabilities', async () => {
    await open(newWms(), wmsCapabilities);
    expect(
      fixture.nativeElement.querySelector('node-tree-select')
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Coastline');
  });

  it('names a placeholder WMS chart after the picked layer', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['coastline']);
    expect(dialog().data.name).toBe('Coastline');
    expect(dialog().data.description).toBe('Static coastline');
  });

  it('names a placeholder WMTS chart after the picked layer', async () => {
    await open(newWmts(), wmtsCapabilities);
    await pick(['MODIS_Terra_CorrectedReflectance_TrueColor']);
    expect(dialog().data.name).toBe(
      'Corrected Reflectance (True Color, MODIS, Terra)'
    );
    expect(dialog().data.description).toBe('Daily true-colour imagery');
  });

  it('uses the first selected WMS layer for a multi-select', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['nexrad-n0q', 'coastline']);
    expect(dialog().data.name).toBe('NEXRAD Base Reflectivity');
  });

  it('follows a re-pick while the name is still the one it filled in', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['coastline']);
    await pick(['nexrad-n0q']);
    expect(dialog().data.name).toBe('NEXRAD Base Reflectivity');
    // first clause of the abstract only
    expect(dialog().data.description).toBe('Composite radar mosaic');
  });

  it('never overwrites a name the user has typed', async () => {
    await open(newWms(), wmsCapabilities);
    await typeInto(nameInput(), 'My radar');
    await pick(['coastline']);
    expect(dialog().data.name).toBe('My radar');
    expect(dialog().data.description).toBe('');
  });

  it('leaves the name of an existing chart alone', async () => {
    await open(
      newWms({ name: 'Radar', layers: ['nexrad-n0q'] }),
      wmsCapabilities
    );
    await pick(['coastline']);
    expect(dialog().data.name).toBe('Radar');
  });

  it('pre-fills the refresh interval from a time-varying layer step', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['nexrad-n0q']);
    expect(minutesInput()?.value).toBe('10');
  });

  it('clamps a sub-minute step to the one-minute floor', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['nexrad-n0r']);
    expect(minutesInput()?.value).toBe('1');
  });

  it('falls back to five minutes for a WMTS list with no step', async () => {
    await open(newWmts(), wmtsCapabilities);
    await pick(['MODIS_Terra_CorrectedReflectance_TrueColor']);
    expect(minutesInput()?.value).toBe('5');
  });

  it('leaves the interval at 0 for a layer with no time dimension', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['coastline']);
    expect(minutesInput()?.value).toBe('0');
  });

  it('keeps an interval the user has set', async () => {
    await open(newWms({ refreshInterval: 900000 }), wmsCapabilities);
    await pick(['nexrad-n0q']);
    expect(minutesInput()?.value).toBe('15');
  });

  it('writes the pre-filled values through to the saved chart', async () => {
    await open(newWms(), wmsCapabilities);
    await pick(['nexrad-n0q']);
    (
      fixture.componentInstance as unknown as {
        handleClose: (save: boolean) => void;
      }
    ).handleClose(true);
    const saved: SKChart = close.mock.calls[0][0].chart;
    expect(saved.name).toBe('NEXRAD Base Reflectivity');
    expect(saved.refreshInterval).toBe(600000);
    expect(saved.time?.step).toBe(600000);
  });
});
