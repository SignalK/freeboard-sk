import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsDialog } from './settings-dialog';
import { SettingsFacade } from '../settings.facade';
import { AppFacade } from 'src/app/app.facade';
import { WakeLockService } from 'src/app/lib/services';
import { S57Service } from '../../map/ol';
import { RadarAPIService } from '../../radar/radar-api.service';
import { CourseService } from 'src/app/modules/course/course.service';
import { defaultConfig, initData } from 'src/app/app.config';
import {
  resolveTrailSource,
  TrackSource
} from 'src/app/modules/skstream/track-source';

/**
 * Freeboard sends the arrival circle with every course it starts, so changing
 * it in Settings has to reach a course already being followed as well;
 * otherwise the map keeps drawing the old circle and arrival uses it too.
 */
describe('settings dialog — arrival circle', () => {
  let fixture: ComponentFixture<SettingsDialog>;
  let dialog: HTMLElement;
  let settings: ReturnType<typeof defaultConfig>;
  let destination: number[] | null;
  let setArrivalCircle: ReturnType<typeof vi.fn>;
  const trackSource = signal<TrackSource | null>(null);

  const selectTab = async (label: string) => {
    const tab = Array.from(
      dialog.querySelectorAll<HTMLElement>('.mat-mdc-tab')
    ).find((t) => (t.textContent ?? '').trim() === label);
    tab?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Type `value` into the Arrival Circle field and commit it. */
  const enterArrivalCircle = async (value: string) => {
    await selectTab('Course');
    const field = Array.from(
      dialog.querySelectorAll<HTMLElement>('mat-form-field')
    ).find((f) => (f.textContent ?? '').includes('Arrival Circle'));
    const input = field?.querySelector('input') as HTMLInputElement;
    expect(input, 'no Arrival Circle field').toBeTruthy();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    settings = defaultConfig();
    destination = null;
    setArrivalCircle = vi.fn(() => Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [SettingsDialog],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SettingsFacade,
          useValue: {
            settings,
            applicationList: [],
            favouritesList: [],
            fixedPosition: [0, 0],
            resourcePathList: [],
            refresh: () => undefined,
            applySettings: () => undefined,
            emitChangeEvent: () => undefined
          }
        },
        {
          provide: AppFacade,
          useValue: {
            config: settings,
            trackSource,
            serverTrailWanted: () =>
              resolveTrailSource(
                settings.vessels.trailSource,
                trackSource()
              ) === 'server',
            data: initData(),
            featureFlags: () => ({ radarApi: false }),
            uiCtrl: () => ({ radarLayer: false }),
            serverConfig: { unitPreferences: () => ({}) },
            alignUnitPrefs: () => undefined,
            lineDashMap: new Map([['none', 'none']]),
            formatLineDashArray: () => null
          }
        },
        { provide: WakeLockService, useValue: { isAvailable: false } },
        { provide: S57Service, useValue: { setOptions: () => undefined } },
        {
          provide: RadarAPIService,
          useValue: { listRadars: () => Promise.resolve([]) }
        },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: CourseService,
          useValue: {
            courseData: () => ({ position: destination }),
            setArrivalCircle
          }
        }
      ]
    });

    fixture = TestBed.createComponent(SettingsDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    dialog = fixture.nativeElement as HTMLElement;
  });

  it('applies a new arrival circle to the course being followed', async () => {
    destination = [24.95, 60.16];

    await enterArrivalCircle('50');

    expect(settings.course.arrivalCircle).toBe(50);
    expect(setArrivalCircle).toHaveBeenCalledWith(50);
  });

  it('only saves the setting when no course is being followed', async () => {
    await enterArrivalCircle('50');

    expect(settings.course.arrivalCircle).toBe(50);
    expect(setArrivalCircle).not.toHaveBeenCalled();
  });

  it('applies a negative entry as its size', async () => {
    destination = [24.95, 60.16];

    await enterArrivalCircle('-50');

    expect(settings.course.arrivalCircle).toBe(50);
    expect(setArrivalCircle).toHaveBeenCalledWith(50);
  });

  it('does not send an arrival circle of 0', async () => {
    destination = [24.95, 60.16];

    await enterArrivalCircle('0');

    expect(setArrivalCircle).not.toHaveBeenCalled();
  });
});
