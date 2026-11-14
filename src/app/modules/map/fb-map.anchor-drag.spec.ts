import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { Collection, Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

import { FBMapComponent } from './fb-map.component';

// While the anchor is dragged, and until the stream reports it where the server
// accepted it, the anchor layer is told to hold the point where the user put it
// (anchorMoving). Exercised on a bare prototype instance, as in
// fb-map.waypoint-snap.spec.ts.

function deferred() {
  let resolve!: (v?: unknown) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bareComponent(): any {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.ngZone = { run: (fn: () => void) => fn() };
  cmp.anchorMoving = signal(false);
  cmp.anchorMoveSeq = 0;
  cmp.answers = [] as ReturnType<typeof deferred>[];
  cmp.arrivals = [] as ReturnType<typeof deferred>[];
  cmp.anchor = {
    reportRefusal: vi.fn(),
    setAnchorPosition: vi.fn(() => {
      const d = deferred();
      cmp.answers.push(d);
      return d.promise;
    }),
    whenAnchorAt: vi.fn(() => {
      const d = deferred();
      cmp.arrivals.push(d);
      return d.promise;
    })
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dragAnchor(cmp: any, f = anchorFeature()) {
  cmp.onModifyStart({ features: new Collection([f]) });
  cmp.applyModifyEnd({ features: new Collection([f]) });
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('FBMapComponent: holding the anchor while it is moved', () => {
  it('holds the anchor from the start of the drag', () => {
    const cmp = bareComponent();
    cmp.onModifyStart({ features: new Collection([anchorFeature()]) });
    expect(cmp.anchorMoving()).toBe(true);
  });

  it('does not hold the anchor for other features', () => {
    const cmp = bareComponent();
    const f = new Feature(new Point([0, 0]));
    f.setId('waypoint.a');
    cmp.onModifyStart({ features: new Collection([f]) });
    expect(cmp.anchorMoving()).toBe(false);
  });

  it('keeps holding after the server accepts, until the stream reports the anchor there', async () => {
    const cmp = bareComponent();
    dragAnchor(cmp);
    cmp.answers[0].resolve(true);
    await settle();
    expect(cmp.anchor.whenAnchorAt).toHaveBeenCalledWith(
      cmp.anchor.setAnchorPosition.mock.calls[0][0]
    );
    expect(cmp.anchorMoving()).toBe(true);
    cmp.arrivals[0].resolve();
    await settle();
    expect(cmp.anchorMoving()).toBe(false);
    expect(cmp.anchor.reportRefusal).not.toHaveBeenCalled();
  });

  it('releases the anchor at once and reports the refusal when the server refuses', async () => {
    const cmp = bareComponent();
    dragAnchor(cmp);
    const refusal = { status: 403 };
    cmp.answers[0].reject(refusal);
    await settle();
    expect(cmp.anchorMoving()).toBe(false);
    expect(cmp.anchor.whenAnchorAt).not.toHaveBeenCalled();
    expect(cmp.anchor.reportRefusal).toHaveBeenCalledWith(
      refusal,
      'Anchor not moved'
    );
  });

  it('does not let the answer to an earlier move end a later drag', async () => {
    const cmp = bareComponent();
    const f = anchorFeature();
    dragAnchor(cmp, f);
    cmp.onModifyStart({ features: new Collection([f]) });
    cmp.answers[0].reject({ status: 403 });
    await settle();
    expect(cmp.anchorMoving()).toBe(true);
  });
});
