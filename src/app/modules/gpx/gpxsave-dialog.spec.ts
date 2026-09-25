import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { GPXExportDialog, GPXExportData } from './gpxsave-dialog';
import { GPXSaveFacade } from './gpxsave-dialog.facade';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import { TrackHistoryService } from '../skstream/track-history.service';
import type { GpxTrackData, TrackExportChoice } from './track-export';
import type { Position } from '../../types';

const CTX = 'vessels.urn:mrn:imo:mmsi:366000012';
const displayedLine: Position[] = [
  [-80.1, 25.7],
  [-80.2, 25.8]
];

/** The dialog's members these tests drive. */
interface DialogUnderTest {
  trackChoice: TrackExportChoice;
  customFrom: string;
  customTo: string;
  canSave: boolean;
  save(): Promise<void>;
}

/** A single-context Track API response. */
const trackResponse = (coords: Position[][], times: string[][]) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates: coords },
      properties: { context: CTX, providerId: 'tracks', coordTimes: times }
    }
  ]
});

function setup(opts: {
  tracksApi?: boolean;
  historyShown?: boolean;
  initialChoice?: TrackExportChoice;
  get?: ReturnType<typeof vi.fn>;
}) {
  const saveToFile = vi.fn();
  const showAlert = vi.fn();
  const get = opts.get ?? vi.fn();
  const data: GPXExportData = {
    routes: [],
    tracks: [
      {
        context: CTX,
        label: 'FERRY ONE (366000012)',
        displayed: { lines: [displayedLine], times: [[undefined, undefined]] }
      }
    ],
    tracksOnly: true,
    initialChoice: opts.initialChoice
  };
  TestBed.configureTestingModule({
    imports: [GPXExportDialog],
    providers: [
      {
        provide: AppFacade,
        useValue: {
          featureFlags: signal({ tracksApi: opts.tracksApi ?? true }),
          trackSource: signal({ api: 'v2', provider: 'tracks' }),
          sIsFetching: signal(false),
          showAlert
        }
      },
      { provide: SKResourceService, useValue: {} },
      {
        provide: GPXSaveFacade,
        useValue: {
          result$: new Subject<number>(),
          prepData: (d: GPXExportData) => ({
            routes: d.routes,
            waypoints: d.waypoints,
            tracks: d.tracks
          }),
          saveToFile,
          clear: () => undefined
        }
      },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: SignalKClient, useValue: { api: { get } } },
      {
        provide: TrackHistoryService,
        useValue: {
          isShown: () => !!opts.historyShown,
          range: () => ({ from: 1000, to: 2000 })
        }
      }
    ]
  });
  // the wiring is under test, not the Material template
  TestBed.overrideComponent(GPXExportDialog, { set: { template: '' } });
  const fixture = TestBed.createComponent(GPXExportDialog);
  fixture.detectChanges();
  const dialog = fixture.componentInstance as unknown as DialogUnderTest;
  const savedTracks = (): GpxTrackData[] =>
    saveToFile.mock.calls[0]?.[1]?.trk?.tracks;
  return { dialog, get, saveToFile, showAlert, savedTracks };
}

describe('GPXExportDialog track export', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('saves the displayed track without asking the server', async () => {
    const { dialog, get, savedTracks } = setup({});
    expect(dialog.trackChoice).toBe('displayed');
    await dialog.save();
    expect(get).not.toHaveBeenCalled();
    expect(savedTracks()).toHaveLength(1);
    expect(savedTracks()[0].lines).toEqual([displayedLine]);
  });

  it('fetches a range and saves what the server recorded', async () => {
    const recorded: Position[] = [
      [-81, 24],
      [-81.1, 24.1],
      [-81.2, 24.2]
    ];
    const times = [
      '2026-09-20T10:00:00.000Z',
      '2026-09-20T10:01:00.000Z',
      '2026-09-20T10:02:00.000Z'
    ];
    const get = vi.fn(() => of(trackResponse([recorded], [times])));
    const { dialog, savedTracks } = setup({ get });
    dialog.trackChoice = '7d';
    await dialog.save();

    expect(get).toHaveBeenCalledTimes(1);
    const [version, path] = get.mock.calls[0] as unknown as [number, string];
    expect(version).toBe(2);
    const q = new URLSearchParams(path.split('?')[1]);
    expect(q.get('context')).toBe(CTX);
    expect(q.has('from')).toBe(true);
    expect(q.get('times')).toBe('true');
    expect(q.has('maxPoints')).toBe(false);

    expect(savedTracks()[0].lines).toEqual([recorded]);
    expect(savedTracks()[0].times).toEqual([times]);
    expect(savedTracks()[0].name).toMatch(/^FERRY ONE \(366000012\) /);
  });

  it('says so and saves nothing when the fetch fails', async () => {
    const get = vi.fn(() => throwError(() => new Error('503')));
    const { dialog, saveToFile, showAlert } = setup({ get });
    dialog.trackChoice = 'all';
    await dialog.save();
    expect(showAlert).toHaveBeenCalledWith(
      'GPX Save',
      expect.stringMatching(/Unable to fetch/)
    );
    expect(saveToFile).not.toHaveBeenCalled();
  });

  it('saves nothing when the range holds no track', async () => {
    const get = vi.fn(() => of({ type: 'FeatureCollection', features: [] }));
    const { dialog, saveToFile, showAlert } = setup({ get });
    dialog.trackChoice = '30d';
    await dialog.save();
    expect(showAlert).toHaveBeenCalledWith(
      'GPX Save',
      expect.stringMatching(/No track is recorded/)
    );
    expect(saveToFile).not.toHaveBeenCalled();
  });

  it('cannot save a range it cannot resolve', () => {
    const { dialog } = setup({});
    expect(dialog.canSave).toBe(true);
    dialog.trackChoice = 'custom';
    dialog.customFrom = '2026-09-25T10:00';
    dialog.customTo = '2026-09-24T10:00';
    expect(dialog.canSave).toBe(false);
    dialog.customTo = '2026-09-26T10:00';
    expect(dialog.canSave).toBe(true);
    // the Track history range while that history is not shown
    dialog.trackChoice = 'history';
    expect(dialog.canSave).toBe(false);
  });

  it('starts on the Track history range only while it is shown', () => {
    expect(
      setup({ initialChoice: 'history', historyShown: true }).dialog.trackChoice
    ).toBe('history');
    TestBed.resetTestingModule();
    expect(
      setup({ initialChoice: 'history', historyShown: false }).dialog
        .trackChoice
    ).toBe('displayed');
    TestBed.resetTestingModule();
    // without a v2 provider there are no ranges at all
    expect(
      setup({ initialChoice: 'history', historyShown: true, tracksApi: false })
        .dialog.trackChoice
    ).toBe('displayed');
  });
});
