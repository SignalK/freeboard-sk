import { describe, it, expect } from 'vitest';
import { cpaShapes } from './layer-cpa-alarm.component';

const SELF: [number, number] = [4.2, 52.1];
const TARGET: [number, number] = [4.25, 52.12];
const SELF_AT_CPA: [number, number] = [4.22, 52.11];
const TARGET_AT_CPA: [number, number] = [4.221, 52.111];

describe('cpaShapes', () => {
  it('extends both course lines to the closest approach and joins its ends', () => {
    expect(
      cpaShapes({
        self: SELF,
        target: TARGET,
        selfAtCpa: SELF_AT_CPA,
        targetAtCpa: TARGET_AT_CPA
      })
    ).toEqual({
      ring: TARGET,
      courseLines: [
        [SELF, SELF_AT_CPA],
        [TARGET, TARGET_AT_CPA]
      ],
      cpaLine: [SELF_AT_CPA, TARGET_AT_CPA]
    });
  });

  it('draws own course to the closest approach when the target is not on the chart', () => {
    const shapes = cpaShapes({
      self: SELF,
      selfAtCpa: SELF_AT_CPA,
      targetAtCpa: TARGET_AT_CPA
    });
    expect(shapes.ring).toBeUndefined();
    expect(shapes.courseLines).toEqual([[SELF, SELF_AT_CPA]]);
    expect(shapes.cpaLine).toEqual([SELF_AT_CPA, TARGET_AT_CPA]);
  });

  it('joins the two vessels when the alarm gives no closest approach', () => {
    expect(cpaShapes({ self: SELF, target: TARGET })).toEqual({
      ring: TARGET,
      courseLines: [],
      rangeLine: [TARGET, SELF]
    });
  });
});
