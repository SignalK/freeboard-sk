import { describe, expect, it, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { GPXExportService } from './gpx-export.service';
import { AppFacade } from '../../app.facade';
import { SKResourceService } from '../skresources/resources.service';
import type { Position } from '../../types';

const CTX = 'vessels.urn:mrn:imo:mmsi:366000012';
const T0 = '2026-09-25T14:00:00.000Z';
const T1 = '2026-09-25T14:01:00.000Z';
const recorded: Position[] = [
  [-80.1, 25.7],
  [-80.2, 25.8]
];

/** Just what the service reads from the app. */
function appStub(opts: {
  serverTrail?: Position[][];
  serverTimed?: { lines: Position[][]; times: string[][] } | null;
  trackApi?: 'v2' | 'v1' | 'none';
  aisTimed?: Map<string, { lines: Position[][]; times: string[][] }>;
}) {
  const local = { lines: [recorded], times: [[T0, T1]] };
  return {
    data: {
      vessels: {
        self: { name: 'eSea Street' },
        aisTargets: new Map([
          [CTX, { name: 'FERRY ONE', mmsi: '366000012', track: [] }]
        ]),
        aisTracks: new Map([[CTX, [[...recorded, [-80.3, 25.9]]]]])
      }
    },
    selfTrailFromServer: signal(opts.serverTrail ?? []),
    selfTrailTimed: signal(opts.serverTimed ?? null),
    localTrailTimed: () => local,
    aisTracksTimed: signal(opts.aisTimed ?? new Map()),
    trackSource: signal(
      opts.trackApi
        ? {
            api: opts.trackApi,
            serverHasTracksApi: opts.trackApi === 'v2',
            v1SelfTrack: opts.trackApi === 'v1',
            v1AisTracks: opts.trackApi === 'v1'
          }
        : null
    )
  };
}

function service(app: ReturnType<typeof appStub>) {
  TestBed.configureTestingModule({
    providers: [
      GPXExportService,
      { provide: AppFacade, useValue: app },
      { provide: MatDialog, useValue: {} },
      { provide: SKResourceService, useValue: { routes: signal([]) } }
    ]
  });
  return TestBed.inject(GPXExportService);
}

describe('GPXExportService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('offers the local trail when the server trail is not drawn', () => {
    const own = service(appStub({})).ownTrail();
    expect(own.context).toBe('self');
    expect(own.label).toBe('eSea Street trail');
    expect(own.displayed.lines).toEqual([recorded]);
  });

  it('offers the server trail, as recorded, when it is the one drawn', () => {
    const serverLine: Position[] = [
      [-81, 25],
      [-81.1, 25.1]
    ];
    const own = service(
      appStub({
        serverTrail: [serverLine],
        serverTimed: {
          lines: [serverLine],
          times: [['2026-09-25T10:00:00.000Z', '2026-09-25T10:01:00.000Z']]
        }
      })
    ).ownTrail();
    // a later local trail is its own stretch (more than the join gap apart)
    expect(own.displayed.lines).toEqual([serverLine, recorded]);
    expect(own.displayed.times[0]).toEqual([
      '2026-09-25T10:00:00.000Z',
      '2026-09-25T10:01:00.000Z'
    ]);
  });

  it("offers an AIS vessel's displayed track with its recording times", () => {
    const t = service(
      appStub({
        trackApi: 'v2',
        aisTimed: new Map([[CTX, { lines: [recorded], times: [[T0, T1]] }]])
      })
    ).vesselTrack(CTX);
    expect(t.label).toBe('FERRY ONE (366000012)');
    expect(t.tailOnly).toBe(false);
    // the live tail since the last fetch has no recorded time yet
    expect(t.displayed.times).toEqual([[T0, T1, undefined]]);
  });

  it('says when an AIS track is only the tail Freeboard gathered', () => {
    expect(
      service(appStub({ trackApi: 'none' })).vesselTrack(CTX).tailOnly
    ).toBe(true);
    TestBed.resetTestingModule();
    // a v2 provider with nothing recorded for this vessel
    expect(service(appStub({ trackApi: 'v2' })).vesselTrack(CTX).tailOnly).toBe(
      true
    );
    TestBed.resetTestingModule();
    expect(service(appStub({ trackApi: 'v1' })).vesselTrack(CTX).tailOnly).toBe(
      false
    );
  });

  it('offers a vessel with no track drawn, for a Track history range', () => {
    const app = appStub({ trackApi: 'v2' });
    app.data.vessels.aisTracks.clear();
    app.data.vessels.aisTargets.get(CTX).track = undefined;
    const t = service(app).vesselTrack(CTX);
    expect(t.label).toBe('FERRY ONE (366000012)');
    expect(t.displayed.lines).toEqual([]);
  });

  it('has nothing to offer for an unknown vessel', () => {
    expect(service(appStub({})).vesselTrack('vessels.nobody')).toBeUndefined();
  });
});
