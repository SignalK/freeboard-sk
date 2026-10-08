import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { Collection, Feature } from 'ol';
import { Subject } from 'rxjs';

import { FBMapComponent } from './fb-map.component';
import { RouteBufferRegistry } from '../plotterext/route-buffer.registry';
import { Position } from 'src/app/types';

// A tap on a recorded track offers the passage through it as a route (MAKE
// ROUTE), which opens as a draft, as a drawn route does. Exercised on a bare
// prototype instance, as in fb-map.pointer-down.spec.ts: a TestBed fixture
// would import the whole map template graph.

const T0 = Date.UTC(2026, 9, 1, 6, 0, 0);
const MIN = 60000;
const A: Position = [177.2, -17.8];
const STEP = 0.0015; // degrees of longitude a minute, about 5 knots here

/** Anchored at A, sails east (pausing `pause` minutes half way), anchored at
 * the end: one point a minute. */
function passage(pause: number) {
  const line: Position[] = [];
  const times: string[] = [];
  let t = T0;
  const add = (p: Position) => {
    line.push(p);
    times.push(new Date(t).toISOString());
    t += MIN;
  };
  let lon = A[0];
  for (let i = 0; i < 120; i++) add([lon, A[1]]);
  for (let i = 0; i < 30; i++) add([(lon += STEP), A[1]]);
  for (let i = 0; i < pause; i++) add([lon, A[1]]);
  for (let i = 0; i < 30; i++) add([lon, (A[1] as number) + (i + 1) * STEP]);
  const end: Position = [lon, A[1] + 30 * STEP];
  for (let i = 0; i < 120; i++) add(end);
  return {
    lines: [line],
    times: [times],
    turn: [A[0] + 30 * STEP, A[1]] as Position,
    end
  };
}

const near = (a: Position, b: Position) =>
  Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4;

const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.overlay = signal({ show: false });
  cmp.mapInteract = { draw: { features: null } };
  cmp.clickWorldOffset = 0;
  cmp.trackHistory = { label: () => 'FERRY', wholeTrack: () => undefined };
  cmp.trackHistoryFeatures = {};
  cmp.routeBuffers = new RouteBufferRegistry();
  cmp.infoPanel = { openWith: vi.fn() };
  cmp.app = { useInfoPanel: () => true };
  return cmp;
};

/** Open the popover for a tap on `id`, a track of `context`, half way out. */
const tap = (
  cmp: ReturnType<typeof bareComponent>,
  id: string,
  context: string,
  track: ReturnType<typeof passage>,
  withTimes = true
) => {
  const at: Position = [A[0] + 15 * STEP, A[1]];
  cmp.trackHistoryFeatures[id] = {
    context,
    lines: track.lines,
    times: withTimes ? track.times : undefined,
    at
  };
  cmp.formatPopover(id, at);
  return cmp.overlay().trackHistory;
};

describe('FBMapComponent — a route from a recorded track', () => {
  it('offers the passage of the own trail between its anchorages', () => {
    const track = passage(20);
    const th = tap(bareComponent(), 'trail.self.server', 'self', track);

    expect(near(th.route[0], A)).toBe(true);
    expect(near(th.route[th.route.length - 1], track.end)).toBe(true);
  });

  it('ends another vessel’s passage at a shorter stop, as at a ferry terminal', () => {
    const track = passage(20);
    const th = tap(
      bareComponent(),
      'track-vessels.vessels.urn:mrn:imo:mmsi:520000001',
      'vessels.urn:mrn:imo:mmsi:520000001',
      track
    );

    expect(near(th.route[0], A)).toBe(true);
    expect(near(th.route[th.route.length - 1], track.turn)).toBe(true);
  });

  it('offers no route for a track without recording times', () => {
    const th = tap(
      bareComponent(),
      'trail.self.server',
      'self',
      passage(0),
      false
    );

    expect(th.route).toBeUndefined();
  });

  it('opens the passage in the route panel as a draft route', () => {
    const cmp = bareComponent();
    const th = tap(cmp, 'trail.self.server', 'self', passage(0));

    cmp.routeFromTrack();

    const [draft] = cmp.routeBuffers.all();
    expect(draft.saved).toBe(false);
    expect(draft.name).toBe('Track of FERRY');
    expect(draft.points.map((p) => p.position)).toEqual(th.route);
    expect(cmp.infoPanel.openWith).toHaveBeenCalledWith('routes', [
      draft.routeId,
      expect.anything(),
      true
    ]);
    expect(cmp.overlay().show).toBe(false);
  });

  it('opens the draft’s popover where the route panel is off', () => {
    const cmp = bareComponent();
    cmp.app = { useInfoPanel: () => false };
    tap(cmp, 'trail.self.server', 'self', passage(0));
    const at = cmp.overlay().position;
    // the tap selected the track
    cmp.mapInteract.draw.features = new Collection([new Feature()]);
    let selectedAtOpen: number;
    const formatPopover = vi
      .spyOn(cmp, 'formatPopover')
      .mockImplementation(() => {
        selectedAtOpen = cmp.mapInteract.draw.features.getLength();
      });

    cmp.routeFromTrack();

    const [draft] = cmp.routeBuffers.all();
    expect(formatPopover).toHaveBeenCalledWith(`route.${draft.routeId}`, at);
    expect(cmp.infoPanel.openWith).not.toHaveBeenCalled();
    // nothing selected for the draft's MODIFY to edit in place of the route
    expect(selectedAtOpen).toBe(0);
  });

  describe('a track drawn clipped to the view', () => {
    const HISTORY_ID = 'trackhistory.self.0';

    /** The passage with only its middle drawn, as a track clipped to a view
     * between the two anchorages comes back. */
    const clipped = (track: ReturnType<typeof passage>) => ({
      ...track,
      lines: [track.lines[0].slice(125, 160)],
      times: [track.times[0].slice(125, 160)]
    });

    const withWholeTrack = () => {
      const cmp = bareComponent();
      const answer = new Subject<unknown>();
      cmp.trackHistory.wholeTrack = vi.fn(() => answer);
      return { cmp, answer };
    };

    it('answers again from the whole track, so the route reaches the anchorages', () => {
      const track = passage(0);
      const { cmp, answer } = withWholeTrack();

      const drawn = tap(cmp, HISTORY_ID, 'self', clipped(track));
      // a route read from the clipped track would start at the view's edge
      expect(drawn.route).toBeUndefined();

      answer.next({ context: 'self', lines: track.lines, times: track.times });

      expect(cmp.trackHistory.wholeTrack).toHaveBeenCalledWith(
        'history',
        'self'
      );
      const th = cmp.overlay().trackHistory;
      expect(near(th.route[0], A)).toBe(true);
      expect(near(th.route[th.route.length - 1], track.end)).toBe(true);
      expect(th.start).not.toBe(drawn.start);
    });

    it('asks for the whole AIS track by vessel', () => {
      const { cmp } = withWholeTrack();
      tap(
        cmp,
        'track-vessels.vessels.urn:mrn:imo:mmsi:520000001',
        'vessels.urn:mrn:imo:mmsi:520000001',
        passage(0)
      );

      expect(cmp.trackHistory.wholeTrack).toHaveBeenCalledWith(
        'ais',
        'vessels.urn:mrn:imo:mmsi:520000001'
      );
    });

    it('leaves the own trail as drawn', () => {
      const { cmp } = withWholeTrack();
      tap(cmp, 'trail.self.server', 'self', passage(0));

      expect(cmp.trackHistory.wholeTrack).not.toHaveBeenCalled();
    });

    it('offers no route when the whole track cannot be had', () => {
      const { cmp, answer } = withWholeTrack();
      const drawn = tap(cmp, HISTORY_ID, 'self', clipped(passage(0)));

      answer.error(new Error('offline'));

      expect(cmp.overlay().trackHistory).toEqual(drawn);
      expect(drawn.route).toBeUndefined();
      expect(drawn.start).toBeDefined();
    });

    it('keeps to the voyage tapped where the vessel crossed its own track', () => {
      // out east to E, then back west a few metres to the north, to anchor
      // at A again
      const line: Position[] = [];
      const times: string[] = [];
      let t = T0;
      const add = (p: Position) => {
        line.push(p);
        times.push(new Date(t).toISOString());
        t += MIN;
      };
      const BACK = 0.0001;
      const E: Position = [A[0] + 30 * STEP, A[1]];
      for (let i = 0; i < 120; i++) add(A);
      for (let i = 1; i <= 30; i++) add([A[0] + i * STEP, A[1]]);
      for (let i = 0; i < 120; i++) add(E);
      for (let i = 29; i >= 0; i--) add([A[0] + i * STEP, A[1] + BACK]);
      for (let i = 0; i < 120; i++) add([A[0], A[1] + BACK]);
      const { cmp, answer } = withWholeTrack();
      // the tap, nearer the way back, was on the way out: only that is drawn
      const at: Position = [A[0] + 15 * STEP, A[1] + BACK * 0.8];
      cmp.trackHistoryFeatures[HISTORY_ID] = {
        context: 'self',
        lines: [line.slice(125, 145)],
        times: [times.slice(125, 145)],
        at
      };
      cmp.formatPopover(HISTORY_ID, at);

      answer.next({ context: 'self', lines: [line], times: [times] });

      const th = cmp.overlay().trackHistory;
      expect(near(th.route[0], A)).toBe(true);
      expect(near(th.route[th.route.length - 1], E)).toBe(true);
    });

    it('asks again for the passage alone when the whole track came thinned', () => {
      const track = passage(0);
      const cmp = bareComponent();
      const whole = new Subject<unknown>();
      const detail = new Subject<unknown>();
      cmp.trackHistory.wholeTrack = vi.fn((_s, _c, within) =>
        within ? detail : whole
      );
      tap(cmp, HISTORY_ID, 'self', clipped(track));
      // every other point: the anchorages still show, the turn does not
      const thin = (a: unknown[]) => a.filter((_, i) => i % 2 === 0);
      const thinned = {
        context: 'self',
        lines: [thin(track.lines[0])],
        times: [thin(track.times[0])],
        resolution: 'PT2M'
      };

      whole.next(thinned);

      const th = cmp.overlay().trackHistory;
      expect(th.route).toBeUndefined();
      expect(th.start).toBeDefined();
      const [, , within] = cmp.trackHistory.wholeTrack.mock.calls[1];
      expect(within.from).toBeLessThanOrEqual(Date.parse(track.times[0][0]));
      expect(within.to).toBeGreaterThanOrEqual(
        Date.parse(track.times[0][track.times[0].length - 1])
      );

      detail.next({ context: 'self', lines: track.lines, times: track.times });

      const route = cmp.overlay().trackHistory.route;
      expect(near(route[0], A)).toBe(true);
      expect(near(route[route.length - 1], track.end)).toBe(true);
      expect(cmp.overlay().trackHistory.start).toBe(th.start);
    });

    it('drops an answer for a popover no longer open', () => {
      const track = passage(0);
      const { cmp, answer } = withWholeTrack();
      const drawn = tap(cmp, HISTORY_ID, 'self', clipped(track));
      cmp.formatPopover(null, null);

      answer.next({ context: 'self', lines: track.lines, times: track.times });

      expect(cmp.overlay().trackHistory).toEqual(drawn);
    });
  });
});
