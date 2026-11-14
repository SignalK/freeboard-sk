import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { Collection, Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';

// While the anchor is dragged, and until the server answers the move, the
// anchor layer is told to hold the point where the user put it (anchorMoving).
// Exercised on a bare prototype instance, as in fb-map.waypoint-snap.spec.ts.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bareComponent(setAnchorPosition: () => unknown): any {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.ngZone = { run: (fn: () => void) => fn() };
  cmp.anchorMoving = signal(false);
  cmp.anchor = {
    setAnchorPosition: vi.fn(setAnchorPosition),
    reportRefusal: vi.fn()
  };
  cmp.app = { data: {}, debug: vi.fn() };
  cmp.mapInteract = {
    draw: { forSave: { id: 'anchor', coords: null } }
  };
  return cmp;
}

function anchorFeature() {
  const f = new Feature(new Point(fromLonLat([23.55, 60.12])));
  f.setId('anchor');
  return f;
}

function deferred() {
  let resolve!: (v: unknown) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('FBMapComponent: holding the anchor while it is moved', () => {
  it('holds the anchor from the start of the drag', () => {
    const cmp = bareComponent(() => undefined);
    cmp.onModifyStart({ features: new Collection([anchorFeature()]) });
    expect(cmp.anchorMoving()).toBe(true);
  });

  it('does not hold the anchor for other features', () => {
    const cmp = bareComponent(() => undefined);
    const f = new Feature(new Point([0, 0]));
    f.setId('waypoint.a');
    cmp.onModifyStart({ features: new Collection([f]) });
    expect(cmp.anchorMoving()).toBe(false);
  });

  it('keeps holding until the server accepts the move', async () => {
    const answer = deferred();
    const cmp = bareComponent(() => answer.promise);
    const f = anchorFeature();
    cmp.onModifyStart({ features: new Collection([f]) });
    cmp.applyModifyEnd({ features: new Collection([f]) });
    expect(cmp.anchor.setAnchorPosition).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(cmp.anchorMoving()).toBe(true);
    answer.resolve(true);
    await vi.waitFor(() => expect(cmp.anchorMoving()).toBe(false));
    expect(cmp.anchor.reportRefusal).not.toHaveBeenCalled();
  });

  it('releases the anchor and reports the refusal when the server refuses', async () => {
    const answer = deferred();
    const cmp = bareComponent(() => answer.promise);
    const f = anchorFeature();
    cmp.onModifyStart({ features: new Collection([f]) });
    cmp.applyModifyEnd({ features: new Collection([f]) });
    const refusal = { status: 403 };
    answer.reject(refusal);
    await vi.waitFor(() => expect(cmp.anchorMoving()).toBe(false));
    expect(cmp.anchor.reportRefusal).toHaveBeenCalledWith(
      refusal,
      'Anchor not moved'
    );
  });
});
