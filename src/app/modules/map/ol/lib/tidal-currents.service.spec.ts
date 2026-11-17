import { describe, expect, it } from 'vitest';
import { gridPointBudget } from './tidal-currents.service';

describe('gridPointBudget', () => {
  it('asks for about one arrow per 50x50 px', () => {
    expect(gridPointBudget(1000, 500)).toBe(200);
    expect(gridPointBudget(1543, 859)).toBe(530);
  });

  it('clamps small and huge maps', () => {
    expect(gridPointBudget(0, 0)).toBe(100);
    expect(gridPointBudget(300, 300)).toBe(100);
    expect(gridPointBudget(5000, 5000)).toBe(1500);
  });
});
