import { describe, expect, it } from 'vitest';
import {
  gridPointBudget,
  TidalCurrentsDensity
} from './tidal-currents.service';

describe('gridPointBudget', () => {
  it('asks for about one arrow per 70x70 px by default', () => {
    expect(gridPointBudget(1400, 700)).toBe(200);
    expect(gridPointBudget(1543, 859)).toBe(270);
  });

  it('spaces arrows by the chosen density', () => {
    expect(gridPointBudget(1543, 859, 'low')).toBe(133);
    expect(gridPointBudget(1543, 859, 'standard')).toBe(270);
    expect(gridPointBudget(1543, 859, 'high')).toBe(530);
  });

  it('clamps small and huge maps per density', () => {
    expect(gridPointBudget(0, 0, 'high')).toBe(100);
    expect(gridPointBudget(300, 300, 'low')).toBe(100);
    expect(gridPointBudget(5000, 5000, 'low')).toBe(200);
    expect(gridPointBudget(5000, 5000, 'standard')).toBe(600);
    expect(gridPointBudget(5000, 5000, 'high')).toBe(1500);
  });

  it('treats an unknown density as standard', () => {
    expect(gridPointBudget(1543, 859, 'ultra' as TidalCurrentsDensity)).toBe(
      270
    );
  });
});
