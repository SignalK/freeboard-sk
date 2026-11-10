import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { VesselPopoverComponent } from './vessel-popover.component';
import { AppFacade } from 'src/app/app.facade';
import { Buddies, SKVessel } from 'src/app/modules';
import { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import { GPXExportService } from 'src/app/modules/gpx/gpx-export.service';

const vessel = (id: string, distance: number | null, timeTo: number | null) => {
  const v = new SKVessel();
  v.id = id;
  v.name = id;
  v.position = [24.95, 60.15];
  v.lastUpdated = new Date();
  // SKVessel types these as numbers but starts them, and a vessel that does
  // not report them, at null.
  v.closestApproach = { distance, timeTo } as SKVessel['closestApproach'];
  return v;
};

const render = (radarTracked = false) => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AppFacade,
        useValue: {
          config: {
            units: { positionFormat: 'XY' },
            vessels: { aisShowTrack: false, trail: false }
          },
          data: { vessels: { flagged: [], aisTracks: new Map() } },
          featureFlags: signal({}),
          mapZoom: signal(10),
          isVesselTrackShown: () => false,
          formatValueForDisplay: (v: number, unit: string) => `${v} ${unit}`,
          formatSpeed: (v: number) => `${v}`,
          formattedSpeedUnits: 'kn',
          twsDisplayUnitPath: () => '',
          hostDef: { url: '' }
        }
      },
      { provide: Buddies, useValue: {} },
      {
        provide: TrackHistoryService,
        useValue: {
          refreshRecorded: (): void => undefined,
          available: () => false
        }
      },
      { provide: GPXExportService, useValue: { tailOnly: () => false } }
    ]
  });
  const fixture = TestBed.createComponent(VesselPopoverComponent);
  fixture.componentRef.setInput('radarTracked', radarTracked);
  const show = (v: SKVessel) => {
    fixture.componentRef.setInput('vessel', v);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };
  return Object.assign(show, { fixture });
};

/** CPA and TCPA follow the vessel the popover shows, as it updates. */
describe('VesselPopoverComponent — CPA and TCPA', () => {
  it('shows the CPA and TCPA the vessel reports', () => {
    const text = render()(vessel('vessels.a', 120, 300));
    expect(text).toContain('120 m');
    expect(text).toContain('300 s');
  });

  it('clears them when the next vessel reports none', () => {
    const show = render();
    show(vessel('vessels.a', 120, 300));
    const text = show(vessel('vessels.b', null, null));
    expect(text).not.toContain('120 m');
    expect(text).not.toContain('300 s');
  });
});

/** A vessel drawn in place of a radar target can stop that tracking. */
describe('VesselPopoverComponent — radar tracking', () => {
  const stopButton = (fixture: { nativeElement: HTMLElement }) =>
    Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('mat-icon')
    ).find((i) => i.textContent?.trim() === 'gps_off');

  it('offers to stop the radar tracking a linked target', () => {
    const show = render(true);
    show(vessel('vessels.a', null, null));
    const button = stopButton(show.fixture);
    expect(button).toBeTruthy();

    let untracked = 0;
    show.fixture.componentInstance.untrack.subscribe(() => untracked++);
    button!.click();
    expect(untracked).toBe(1);
  });

  it('offers nothing while no radar target is linked', () => {
    const show = render(false);
    show(vessel('vessels.a', null, null));
    expect(stopButton(show.fixture)).toBeUndefined();
  });
});
