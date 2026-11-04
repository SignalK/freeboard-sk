import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import { WaypointDialog } from './waypoint-dialog';
import { fromUtm } from 'src/app/lib/coord-entry';

/**
 * The waypoint dialog takes a position in DD, DDM, DMS or UTM, and always
 * saves it as WGS84 decimal degrees.
 */

type Closed = {
  save: boolean;
  waypoint: { feature: { geometry: { coordinates: number[] } } };
};

async function open(coordinates: [number, number], positionFormat = 'XY') {
  const close = vi.fn<(r: Closed) => void>();
  TestBed.configureTestingModule({
    imports: [WaypointDialog],
    providers: [
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AppFacade,
        useValue: { config: { units: { positionFormat } } }
      },
      { provide: MatDialogRef, useValue: { close } },
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
              geometry: { type: 'Point', coordinates },
              properties: {}
            }
          }
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(WaypointDialog);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, close };
}

const el = (f: ComponentFixture<WaypointDialog>) =>
  f.nativeElement as HTMLElement;

/** The editable position fields, in template order. */
const positionInputs = (f: ComponentFixture<WaypointDialog>) =>
  Array.from(
    el(f).querySelectorAll('._ap-wpt-coords input')
  ) as HTMLInputElement[];

function type(
  f: ComponentFixture<WaypointDialog>,
  input: HTMLInputElement,
  value: string
) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
  f.detectChanges();
}

/** The text each format chip shows. */
const LABEL = {
  DD: 'DD.DDDD°',
  DDM: "DD° MM.MMM'",
  DMS: `DD° MM' SS.SS"`
};

async function choose(f: ComponentFixture<WaypointDialog>, label: string) {
  const btn = Array.from(
    el(f).querySelectorAll('._ap-wpt-position mat-chip-option button')
  ).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  btn.click();
  f.detectChanges();
  await f.whenStable();
}

const saveButton = (f: ComponentFixture<WaypointDialog>) =>
  Array.from(el(f).querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'SAVE'
  ) as HTMLButtonElement;

function save(
  f: ComponentFixture<WaypointDialog>,
  close: Mock<(r: Closed) => void>
) {
  saveButton(f).click();
  const result = close.mock.calls.at(-1)?.[0] as Closed;
  expect(result.save).toBe(true);
  return result.waypoint.feature.geometry.coordinates;
}

describe('waypoint dialog position entry', () => {
  it('opens in the notation of the position display setting', async () => {
    const { fixture } = await open([-3.5, 47.6375], 'DMdH');
    const [lat, lon] = positionInputs(fixture);
    expect(lat.value).toBe(`47° 38.250' N`);
    expect(lon.value).toBe(`3° 30.000' W`);
  });

  it('saves the original position untouched when only the format changes', async () => {
    const original: [number, number] = [-3.123456789, 47.987654321];
    const { fixture, close } = await open(original);
    await choose(fixture, LABEL.DMS);
    await choose(fixture, 'UTM');
    await choose(fixture, LABEL.DDM);
    expect(save(fixture, close)).toEqual(original);
  });

  it('saves typed degrees, minutes and seconds as decimal degrees', async () => {
    const { fixture, close } = await open([0, 0]);
    await choose(fixture, LABEL.DMS);
    const [lat, lon] = positionInputs(fixture);
    type(fixture, lat, `47° 38' 15" S`);
    type(fixture, lon, `003° 30' 00" W`);
    const [x, y] = save(fixture, close);
    expect(y).toBeCloseTo(-47.6375, 9);
    expect(x).toBeCloseTo(-3.5, 9);
  });

  it('saves a UTM entry as WGS84 lon/lat', async () => {
    const { fixture, close } = await open([0, 0]);
    await choose(fixture, 'UTM');
    const [zone, easting, northing] = positionInputs(fixture);
    type(fixture, zone, '31');
    type(fixture, easting, '448252');
    type(fixture, northing, '5411955');
    const [x, y] = save(fixture, close);
    expect(x).toBeCloseTo(2.2945, 4);
    expect(y).toBeCloseTo(48.8584, 4);
  });

  it('saves a southern UTM entry with a negative latitude', async () => {
    const { fixture, close } = await open([0, 0]);
    await choose(fixture, 'UTM');
    fixture.debugElement
      .query(By.directive(MatSelect))
      .componentInstance.open();
    fixture.detectChanges();
    await fixture.whenStable();
    const south = Array.from(
      TestBed.inject(OverlayContainer)
        .getContainerElement()
        .querySelectorAll('mat-option')
    ).find((o) => o.textContent?.trim() === 'S') as HTMLElement;
    south.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const [zone, easting, northing] = positionInputs(fixture);
    type(fixture, zone, '56');
    type(fixture, easting, '334901');
    type(fixture, northing, '6252289');
    const expected = fromUtm({
      zone: 56,
      hemisphere: 'S',
      easting: 334901,
      northing: 6252289
    });
    const [x, y] = save(fixture, close);
    expect(y).toBeLessThan(0);
    expect([x, y]).toEqual(expected);
  });

  it('disables SAVE when the UTM zone is out of range', async () => {
    const { fixture } = await open([0, 0]);
    await choose(fixture, 'UTM');
    const [zone] = positionInputs(fixture);
    type(fixture, zone, '61');
    expect(saveButton(fixture).disabled).toBe(true);
    expect(
      el(fixture).querySelector('._ap-wpt-error[role="alert"]')?.textContent
    ).toContain('Not a valid UTM position');
    type(fixture, zone, '31');
    expect(saveButton(fixture).disabled).toBe(false);
  });

  it('disables SAVE while a coordinate is not valid', async () => {
    const { fixture } = await open([0, 0]);
    const [lat] = positionInputs(fixture);
    type(fixture, lat, '95');
    expect(saveButton(fixture).disabled).toBe(true);
    expect(el(fixture).textContent).toContain('Not a valid latitude.');
    type(fixture, lat, '45 N');
    expect(saveButton(fixture).disabled).toBe(false);
  });

  it('keeps the active format when its chip is clicked again', async () => {
    const { fixture } = await open([-3.5, 47.6375], 'DMdH');
    await choose(fixture, LABEL.DDM);
    const [lat] = positionInputs(fixture);
    expect(lat.value).toBe(`47° 38.250' N`);
    const selected = el(fixture).querySelectorAll(
      '._ap-wpt-position mat-chip-option.mat-mdc-chip-selected'
    );
    expect(Array.from(selected).map((c) => c.textContent?.trim())).toEqual([
      LABEL.DDM
    ]);
  });

  it('explains that UTM does not cover polar positions', async () => {
    const { fixture } = await open([10, 85]);
    await choose(fixture, 'UTM');
    expect(el(fixture).textContent).toContain('UTM covers 80°S to 84°N only');
    expect(saveButton(fixture).disabled).toBe(true);
  });

  it('shows both the coverage hint and an invalid UTM entry', async () => {
    const { fixture } = await open([10, 85]);
    await choose(fixture, 'UTM');
    const [zone] = positionInputs(fixture);
    type(fixture, zone, '61');
    const alerts = Array.from(
      el(fixture).querySelectorAll('._ap-wpt-error[role="alert"]')
    ).map((a) => a.textContent ?? '');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toContain('UTM covers 80°S to 84°N only');
    expect(alerts[1]).toContain('Not a valid UTM position');
  });

  it('keeps telling the user to switch format while they edit a polar UTM', async () => {
    const { fixture } = await open([10, 85]);
    await choose(fixture, 'UTM');
    const [zone] = positionInputs(fixture);
    type(fixture, zone, '33');
    const alert = el(fixture).querySelector('._ap-wpt-error[role="alert"]');
    expect(alert?.textContent).toContain('UTM covers 80°S to 84°N only');
  });
});
