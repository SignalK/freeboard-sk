import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
