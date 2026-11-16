import { describe, expect, it } from 'vitest';

import { ControlValue } from './radar-api.service';
import {
  adjustSpoke,
  NO_ADJUSTMENT,
  refusesChanges,
  shownControls,
  spokeAdjustment,
  zoomSteps
} from './radar-local-view';

const controls = (v: Record<string, ControlValue>) =>
  new Map(Object.entries(v));

describe('radar local view', () => {
  it('takes a refused login as one that may only watch', () => {
    expect(refusesChanges(401)).toBe(true);
    expect(refusesChanges(403)).toBe(true);
    expect(refusesChanges(500)).toBe(false);
    expect(refusesChanges(undefined)).toBe(false);
  });

  it('zooms within the range the radar sends, not so far its pixels show', () => {
    const ranges = [100, 250, 500, 1000, 2000, 4000].map((value) => ({
      value
    }));
    expect(zoomSteps(ranges, 2000).map((o) => o.value)).toEqual([
      250, 500, 1000, 2000
    ]);
  });

  it('shows gain as set here and the range no further than the radar sends', () => {
    const radar = controls({
      gain: { auto: true, value: 30 },
      range: { value: 1852 },
      power: { value: 2 }
    });
    const shown = shownControls(
      radar,
      new Map([
        ['gain', { auto: false, value: 80 }],
        ['range', { value: 3704 }]
      ])
    );
    expect(shown.get('gain')).toEqual({ auto: false, value: 80 });
    expect(shown.get('range')?.value).toBe(1852);
    expect(shown.get('power')).toBe(radar.get('power'));
  });

  it('reshapes nothing until gain or sea is set here', () => {
    const radar = controls({ gain: { value: 50 }, sea: { value: 20 } });
    expect(spokeAdjustment(radar, new Map())).toEqual(NO_ADJUSTMENT);
    expect(spokeAdjustment(radar, new Map([['gain', { auto: true }]]))).toEqual(
      NO_ADJUSTMENT
    );
  });

  it('lifts the echoes with more gain and clears close ones with more sea', () => {
    const radar = controls({ gain: { value: 50 }, sea: { value: 0 } });
    const adjustment = spokeAdjustment(
      radar,
      new Map([
        ['gain', { value: 100 }],
        ['sea', { value: 100 }]
      ])
    );
    expect(adjustment.gain).toBeCloseTo(0.4);
    expect(adjustment.sea).toBeCloseTo(1);

    const lifted = new Uint8Array([0, 4, 8, 15, 20]);
    adjustSpoke(lifted, 50000, 16, { gain: adjustment.gain, sea: 0 });
    // no echo stays none, the strongest stays the strongest, and values
    // from the legend's colours up (Doppler, trails) are left alone
    expect(Array.from(lifted)).toEqual([0, 10, 14, 15, 20]);

    const cleared = new Uint8Array(100).fill(8);
    adjustSpoke(cleared, 5000, 16, { gain: 0, sea: adjustment.sea });
    expect(cleared[0]).toBe(0);
    expect(cleared[99]).toBe(8);
  });

  it('reshapes from the value shown when Auto alone is switched off here', () => {
    const radar = controls({ gain: { auto: true, value: 80 } });
    expect(
      spokeAdjustment(radar, new Map([['gain', { auto: false }]])).gain
    ).toBeCloseTo(0.24);
  });

  it('never brings back what the radar’s own sea took away', () => {
    const radar = controls({ sea: { value: 80 } });
    expect(spokeAdjustment(radar, new Map([['sea', { value: 10 }]])).sea).toBe(
      0
    );
  });
});
