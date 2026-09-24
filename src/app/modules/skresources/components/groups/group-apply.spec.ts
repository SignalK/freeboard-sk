import { describe, it, expect } from 'vitest';
import {
  applyGroupToSelections,
  GroupSelections,
  isValidGroup
} from './group-apply';

const baseline = (): GroupSelections => ({
  routes: ['r0'],
  waypoints: ['w0'],
  regions: ['z0'],
  charts: ['c0']
});

describe('applyGroupToSelections', () => {
  it('replaces a type whose list has ids', () => {
    const sel = baseline();
    const applied = applyGroupToSelections({ routes: ['r1', 'r2'] }, sel);
    expect(sel.routes).toEqual(['r1', 'r2']);
    expect(applied).toEqual(['routes']);
  });

  it('empties a type whose list is [] (hide that type)', () => {
    const sel = baseline();
    const applied = applyGroupToSelections({ charts: [] }, sel);
    expect(sel.charts).toEqual([]);
    expect(applied).toEqual(['charts']);
  });

  it('leaves a type untouched when its key is absent, and never reports it', () => {
    const sel = baseline();
    const applied = applyGroupToSelections({ routes: ['r1'] }, sel);
    expect(sel.waypoints).toEqual(['w0']);
    expect(sel.regions).toEqual(['z0']);
    expect(sel.charts).toEqual(['c0']);
    expect(applied).not.toContain('waypoints');
  });

  it('applies a new-group document as Freeboard saves it (three [] lists, no charts)', () => {
    const sel = baseline();
    const applied = applyGroupToSelections(
      { routes: [], waypoints: [], regions: [] },
      sel
    );
    expect(sel).toEqual({
      routes: [],
      waypoints: [],
      regions: [],
      charts: ['c0']
    });
    expect(applied).toEqual(['routes', 'waypoints', 'regions']);
  });

  it('copies each list so the selection does not alias the group document', () => {
    const group = { routes: ['r1'] };
    const sel = baseline();
    applyGroupToSelections(group, sel);
    sel.routes!.push('r9');
    expect(group.routes).toEqual(['r1']);
  });

  it('reports applied types in routes, waypoints, regions, charts order', () => {
    const applied = applyGroupToSelections(
      { charts: ['c1'], routes: ['r1'], regions: ['z1'], waypoints: ['w1'] },
      baseline()
    );
    expect(applied).toEqual(['routes', 'waypoints', 'regions', 'charts']);
  });
});

describe('isValidGroup', () => {
  it('accepts absent lists, [] and arrays of strings', () => {
    expect(isValidGroup({ name: 'g' })).toBe(true);
    expect(isValidGroup({ name: 'g', routes: [], charts: ['c1'] })).toBe(true);
  });

  it('rejects a list that is not an array of strings', () => {
    expect(isValidGroup({ name: 'g', routes: 'r1' })).toBe(false);
    expect(isValidGroup({ name: 'g', charts: [1] })).toBe(false);
    expect(isValidGroup(null)).toBe(false);
  });
});
