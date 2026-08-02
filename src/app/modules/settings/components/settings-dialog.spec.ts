import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsDialog } from './settings-dialog';
import { SettingsFacade } from '../settings.facade';
import { AppFacade } from 'src/app/app.facade';
import { WakeLockService } from 'src/app/lib/services';
import { S57Service } from '../../map/ol';
import { RadarAPIService } from '../../radar/radar-api.service';
import { defaultConfig, initData } from 'src/app/app.config';

/**
 * "Single Click for Note Details" configures how a note responds to a tap, so it
 * belongs in Resources -> NOTES with the rest of the note options rather than in
 * Display (#649). Only its position in the dialog moved — it still persists to
 * `display.singleClickNoteDetails`, so an existing user's choice carries over.
 *
 * Each tab is asserted after selecting it: Material attaches only the active
 * tab's body, so the option is unreachable from any other tab's markup.
 */
const NOTE_DETAILS_LABEL = 'Single Click for Note Details';

/** Checkboxes under `root` carrying the given visible label. */
const checkboxesByLabel = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('mat-checkbox')).filter((b) =>
    (b.textContent ?? '').includes(label)
  );

describe('settings dialog — note details option placement', () => {
  let fixture: ComponentFixture<SettingsDialog>;
  let dialog: HTMLElement;
  let settings: ReturnType<typeof defaultConfig>;
  let applied: number;

  /** Activate a tab by its visible label and let its body attach. */
  const selectTab = async (label: string) => {
    const tab = Array.from(
      dialog.querySelectorAll<HTMLElement>('.mat-mdc-tab')
    ).find((t) => (t.textContent ?? '').trim() === label);
    expect(tab, `no "${label}" tab`).toBeTruthy();
    tab?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    settings = defaultConfig();
    applied = 0;

    const facadeStub = {
      settings,
      applicationList: [],
      favouritesList: [],
      fixedPosition: [0, 0],
      resourcePathList: [],
      refresh: () => undefined,
      applySettings: () => applied++,
      emitChangeEvent: () => undefined
    } as unknown as SettingsFacade;

    const appStub = {
      config: settings,
      data: initData(),
      featureFlags: () => ({ radarApi: false }),
      uiCtrl: () => ({ radarLayer: false }),
      serverConfig: { unitPreferences: () => ({}) },
      alignUnitPrefs: () => undefined,
      lineDashMap: new Map([['none', 'none']]),
      formatLineDashArray: () => null
    } as unknown as AppFacade;

    TestBed.configureTestingModule({
      imports: [SettingsDialog],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SettingsFacade, useValue: facadeStub },
        { provide: AppFacade, useValue: appStub },
        { provide: WakeLockService, useValue: { isAvailable: false } },
        { provide: S57Service, useValue: { setOptions: () => undefined } },
        {
          provide: RadarAPIService,
          useValue: { listRadars: () => Promise.resolve([]) }
        },
        { provide: MatDialogRef, useValue: { close: () => undefined } }
      ]
    });

    fixture = TestBed.createComponent(SettingsDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    dialog = fixture.nativeElement as HTMLElement;
  });

  it('shows the option in the NOTES group of the Resources tab', async () => {
    await selectTab('Resources');

    const notes = dialog.querySelector('#sectNotes');
    expect(notes).toBeTruthy();
    expect(
      checkboxesByLabel(notes as HTMLElement, NOTE_DETAILS_LABEL)
    ).toHaveLength(1);
  });

  it('no longer shows the option on the Display tab', async () => {
    await selectTab('Display');

    expect(checkboxesByLabel(dialog, NOTE_DETAILS_LABEL)).toHaveLength(0);
  });

  it('still writes through to display.singleClickNoteDetails, and persists', async () => {
    await selectTab('Resources');

    const notes = dialog.querySelector('#sectNotes') as HTMLElement;
    const input = checkboxesByLabel(notes, NOTE_DETAILS_LABEL)[0].querySelector(
      'input'
    ) as HTMLInputElement;

    expect(settings.display.singleClickNoteDetails).toBe(false);
    const before = applied;

    input.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(settings.display.singleClickNoteDetails).toBe(true);
    expect(applied).toBeGreaterThan(before);
  });
});
