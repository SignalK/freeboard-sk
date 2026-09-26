import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TrackHistoryDialog } from './track-history-dialog';

const AIS = 'vessels.urn:mrn:imo:mmsi:366000010';
const BOX: [number, number, number, number] = [-100, 20, -99, 21];

/** The Track history window's status line (#842): what it says when history
 * is shown but can't be seen, and when it offers to bring it into view. */
describe('TrackHistoryDialog status', () => {
  let history: {
    shown: ReturnType<typeof signal<string[]>>;
    tracks: ReturnType<typeof signal<Map<string, { lines: number[][][] }>>>;
    extents: ReturnType<typeof signal<Map<string, typeof BOX | null>>>;
    offscreen: ReturnType<typeof signal<string[]>>;
    failed: ReturnType<typeof signal<Set<string>>>;
    extentFailed: ReturnType<typeof signal<Set<string>>>;
    [k: string]: unknown;
  };
  let dialog: TrackHistoryDialog;

  const status = () =>
    (dialog as unknown as { statusText: () => string }).statusText();
  const showsShow = () =>
    (dialog as unknown as { showOffscreen: () => boolean }).showOffscreen();

  beforeEach(() => {
    history = {
      shown: signal(['self']),
      tracks: signal(new Map()),
      extents: signal(new Map()),
      offscreen: signal([]),
      failed: signal(new Set()),
      extentFailed: signal(new Set()),
      spans: signal(new Map()),
      range: signal({ from: null, to: null }),
      scrubTime: signal(null),
      label: (c: string) => (c === 'self' ? 'Own vessel' : 'TEST 1')
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MAT_DIALOG_DATA, useValue: { history } }]
    });
    TestBed.overrideComponent(TrackHistoryDialog, { set: { template: '' } });
    dialog = TestBed.createComponent(TrackHistoryDialog).componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('says a track drawn nowhere was recorded outside this area, and offers Show', () => {
    history.extents.set(new Map([['self', BOX]]));
    history.offscreen.set(['self']);
    expect(status()).toBe('Recorded outside this area');
    expect(showsShow()).toBe(true);
  });

  it('says so when the range holds no track at all, with nothing to show', () => {
    history.extents.set(new Map([['self', null]]));
    expect(status()).toBe('No recorded track in this time range');
    expect(showsShow()).toBe(false);
  });

  it('falls back to area and range while where the track lies is unknown', () => {
    expect(status()).toBe('No recorded track in this area and time range');
    expect(showsShow()).toBe(false);
  });

  it('names the vessels out of view beside the ones shown', () => {
    history.shown.set(['self', AIS]);
    history.tracks.set(
      new Map([
        [
          'self',
          {
            lines: [
              [
                [0, 0],
                [1, 1],
                [2, 2]
              ]
            ]
          }
        ]
      ])
    );
    history.extents.set(
      new Map([
        ['self', BOX],
        [AIS, BOX]
      ])
    );
    history.offscreen.set([AIS]);
    expect(status()).toBe('3 points shown · TEST 1 outside this area');
    expect(showsShow()).toBe(true);
  });

  it('counts no drawn track as shown when all of it is out of view', () => {
    history.tracks.set(new Map([['self', { lines: [[[0, 0]]] }]]));
    history.extents.set(new Map([['self', BOX]]));
    history.offscreen.set(['self']);
    expect(status()).toBe('Recorded outside this area');
    expect(showsShow()).toBe(true);
  });

  it("says so when where a vessel's track lies couldn't be loaded", () => {
    history.shown.set(['self', AIS]);
    history.extentFailed.set(new Set(['self']));
    history.offscreen.set([AIS]);
    expect(status()).toBe("Couldn't load history for Own vessel");
    expect(showsShow()).toBe(false);
  });

  it('shows just the count when everything is in view', () => {
    history.tracks.set(new Map([['self', { lines: [[[0, 0]]] }]]));
    expect(status()).toBe('1 points shown');
    expect(showsShow()).toBe(false);
  });

  it('does not offer Show beside a failure about another vessel', () => {
    history.shown.set(['self', AIS]);
    history.failed.set(new Set(['self']));
    history.offscreen.set([AIS]);
    expect(status()).toBe("Couldn't load history for Own vessel");
    expect(showsShow()).toBe(false);
  });
});
