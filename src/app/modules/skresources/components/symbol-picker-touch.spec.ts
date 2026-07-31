import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Platform } from '@angular/cdk/platform';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import { NoteDialog } from './notes/note-dialog';
import { WaypointDialog } from './waypoints/waypoint-dialog';

/**
 * Symbol pickers must stay scrollable under a finger (#651).
 *
 * On a touch platform `MatTooltip` reserves the long press for itself by
 * writing an inline `touch-action: none` onto its trigger element
 * (`_disableNativeGesturesIfNecessary`). `touch-action` is read from wherever a
 * touch *starts*, so a trigger that fills every row of a scrolling list leaves
 * the finger nowhere to land that pans it: the note dialog's symbol dropdown
 * and the waypoint dialog's symbol grid both became unscrollable, stranding
 * every symbol below the fold. The desktop path takes the `mouseenter` branch
 * and never writes the style, which is why this only shows up on a tablet or a
 * chartplotter — for many Freeboard users, their only input device.
 *
 * These render each picker with the platform reported as iOS, since that is
 * what selects the touch branch inside the directive.
 */

/** `touch-action: none` set on the element the finger lands on kills the pan. */
const blocksTouchScroll = (el: HTMLElement) => el.style.touchAction === 'none';

const appStub = {
  config: {
    units: { positionFormat: 'HDd' },
    resources: { notes: { groupNameEdit: false } }
  }
} as unknown as AppFacade;

const touchPlatform = {
  provide: Platform,
  useValue: { IOS: true, ANDROID: false, isBrowser: true }
};

const commonProviders = [
  provideNoopAnimations(),
  provideHttpClient(),
  provideHttpClientTesting(),
  touchPlatform,
  { provide: AppFacade, useValue: appStub },
  { provide: MatDialogRef, useValue: { close: () => undefined } }
];

describe('note dialog symbol dropdown', () => {
  let fixture: ComponentFixture<NoteDialog>;
  let overlay: OverlayContainer;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [NoteDialog],
      providers: [
        ...commonProviders,
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Note',
            editable: true,
            addMode: true,
            note: {
              name: 'a note',
              description: '',
              mimeType: 'text/markdown',
              properties: {}
            },
            position: null
          }
        }
      ]
    });

    fixture = TestBed.createComponent(NoteDialog);
    overlay = TestBed.inject(OverlayContainer);
    fixture.detectChanges();
    await fixture.whenStable();

    // The options only exist once the panel is open — the symbol select is the
    // first of the dialog's two (the second picks the note's format).
    fixture.debugElement
      .queryAll(By.directive(MatSelect))[0]
      .componentInstance.open();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('leaves the option rows able to scroll the panel under a finger', () => {
    const options = Array.from(
      overlay.getContainerElement().querySelectorAll('mat-option')
    ) as HTMLElement[];

    // Guard the guard: an empty list would pass the assertion vacuously.
    expect(options.length).toBeGreaterThan(1);
    expect(options.filter(blocksTouchScroll)).toEqual([]);
  });
});

describe('waypoint dialog symbol grid', () => {
  let fixture: ComponentFixture<WaypointDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [WaypointDialog],
      providers: [
        ...commonProviders,
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Waypoint',
            addMode: true,
            waypoint: {
              name: 'a waypoint',
              description: '',
              type: 'waypoint',
              feature: {
                geometry: { type: 'Point', coordinates: [0, 0] },
                properties: {}
              }
            }
          }
        }
      ]
    });

    fixture = TestBed.createComponent(WaypointDialog);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('leaves the symbol tiles able to scroll the grid under a finger', () => {
    const tiles = Array.from(
      fixture.nativeElement.querySelectorAll('.unselected-icon mat-icon')
    ) as HTMLElement[];

    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.filter(blocksTouchScroll)).toEqual([]);
  });
});
