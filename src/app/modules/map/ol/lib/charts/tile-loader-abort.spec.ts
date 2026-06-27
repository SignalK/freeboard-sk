import { expect, describe, it } from 'vitest';
import {
  bucketForZoom,
  releaseController,
  type PendingByZoom
} from './tile-loader-abort';

function makePending(): PendingByZoom {
  return new Map();
}

describe('bucketForZoom', () => {
  it('returns the same bucket on repeated calls at the same zoom', () => {
    const pending = makePending();
    const bucket1 = bucketForZoom(pending, 10);
    const bucket2 = bucketForZoom(pending, 10);
    expect(bucket1).toBe(bucket2);
  });

  it('does not abort any controller when the zoom is unchanged', () => {
    const pending = makePending();
    const bucket = bucketForZoom(pending, 10);
    const controller = new AbortController();
    bucket.add(controller);

    bucketForZoom(pending, 10);

    expect(controller.signal.aborted).toBe(false);
  });

  it('aborts all controllers from a superseded zoom', () => {
    const pending = makePending();
    const bucket = bucketForZoom(pending, 8);
    const c1 = new AbortController();
    const c2 = new AbortController();
    bucket.add(c1);
    bucket.add(c2);

    bucketForZoom(pending, 12);

    expect(c1.signal.aborted).toBe(true);
    expect(c2.signal.aborted).toBe(true);
  });

  it('removes the old zoom bucket after superseding', () => {
    const pending = makePending();
    const oldBucket = bucketForZoom(pending, 8);
    const c = new AbortController();
    oldBucket.add(c);

    bucketForZoom(pending, 12);

    expect(pending.has(8)).toBe(false);
    expect(pending.has(12)).toBe(true);
  });

  it('aborts controllers across multiple superseded zooms in one call', () => {
    const pending = makePending();
    const c5 = new AbortController();
    const c7 = new AbortController();
    pending.set(5, new Set([c5]));
    pending.set(7, new Set([c7]));

    bucketForZoom(pending, 10);

    expect(c5.signal.aborted).toBe(true);
    expect(c7.signal.aborted).toBe(true);
    expect(pending.has(5)).toBe(false);
    expect(pending.has(7)).toBe(false);
    expect(pending.has(10)).toBe(true);
  });
});

describe('releaseController', () => {
  it('deletes the bucket when its last controller is removed', () => {
    const pending = makePending();
    const bucket = bucketForZoom(pending, 9);
    const controller = new AbortController();
    bucket.add(controller);

    releaseController(pending, 9, controller);

    expect(pending.has(9)).toBe(false);
  });

  it('leaves the bucket intact when other controllers remain', () => {
    const pending = makePending();
    const bucket = bucketForZoom(pending, 9);
    const c1 = new AbortController();
    const c2 = new AbortController();
    bucket.add(c1);
    bucket.add(c2);

    releaseController(pending, 9, c1);

    expect(pending.has(9)).toBe(true);
    expect(pending.get(9)?.has(c2)).toBe(true);
    expect(pending.get(9)?.has(c1)).toBe(false);
  });

  it('is a no-op when the zoom bucket has already been removed', () => {
    const pending = makePending();
    const controller = new AbortController();

    expect(() => releaseController(pending, 9, controller)).not.toThrow();
    expect(pending.has(9)).toBe(false);
  });

  it('is a no-op when the controller is not in the bucket', () => {
    const pending = makePending();
    const bucket = bucketForZoom(pending, 9);
    const resident = new AbortController();
    bucket.add(resident);
    const stranger = new AbortController();

    expect(() => releaseController(pending, 9, stranger)).not.toThrow();
    expect(pending.has(9)).toBe(true);
    expect(pending.get(9)?.has(resident)).toBe(true);
  });
});
