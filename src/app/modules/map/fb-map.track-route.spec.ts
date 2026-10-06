import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { Collection, Feature } from 'ol';

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
  cmp.trackHistory = { label: () => 'FERRY' };
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
});
