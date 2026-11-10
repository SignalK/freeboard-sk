import { describe, it, expect } from 'vitest';
import {
  aisTargetShown,
  AIS_FILTER_IMO_ONLY,
  AIS_FILTER_BUDDIES_ONLY,
  AIS_FILTER_PLEASURE
} from './ais-filter';

const yacht = { registrations: {}, type: { id: 36 } };
const ship = { registrations: { imo: 'IMO9234567' }, type: { id: 70 } };

describe('aisTargetShown', () => {
  it('shows every target when no filter is set', () => {
    expect(aisTargetShown('a', yacht, {})).toBe(true);
    expect(aisTargetShown('a', yacht, { filterIds: null })).toBe(true);
  });

  it('hides targets without an IMO number under IMO only', () => {
    const f = { filterShipTypes: [AIS_FILTER_IMO_ONLY] };
    expect(aisTargetShown('y', yacht, f)).toBe(false);
    expect(aisTargetShown('s', ship, f)).toBe(true);
  });

  it('treats a target without registrations as having no IMO number', () => {
    expect(
      aisTargetShown('x', {}, { filterShipTypes: [AIS_FILTER_IMO_ONLY] })
    ).toBe(false);
    expect(
      aisTargetShown('x', undefined, { filterShipTypes: [AIS_FILTER_IMO_ONLY] })
    ).toBe(false);
  });

  it('shows only buddies under buddies only', () => {
    const f = { filterShipTypes: [AIS_FILTER_BUDDIES_ONLY] };
    expect(aisTargetShown('b', { ...yacht, buddy: true }, f)).toBe(true);
    expect(aisTargetShown('y', yacht, f)).toBe(false);
  });

  it('matches ship types by their tens', () => {
    const f = { filterByShipType: true, filterShipTypes: [70] };
    expect(aisTargetShown('s', ship, f)).toBe(true);
    expect(aisTargetShown('s', { type: { id: 79 } }, f)).toBe(true);
    expect(aisTargetShown('y', yacht, f)).toBe(false);
  });

  it('filters sailing and pleasure craft on the Pleasure row', () => {
    const f = {
      filterByShipType: true,
      filterShipTypes: [AIS_FILTER_PLEASURE]
    };
    for (const id of [36, 37, 38, 39]) {
      expect(aisTargetShown('y', { type: { id } }, f)).toBe(true);
    }
    expect(aisTargetShown('f', { type: { id: 30 } }, f)).toBe(false);
    expect(aisTargetShown('t', { type: { id: 31 } }, f)).toBe(false);
  });

  it('filters fishing vessels on their own row', () => {
    const f = { filterByShipType: true, filterShipTypes: [30] };
    expect(aisTargetShown('f', { type: { id: 30 } }, f)).toBe(true);
    expect(aisTargetShown('y', yacht, f)).toBe(false);
  });

  it('filters towing, dredging, diving and military vessels as special craft', () => {
    const f = { filterByShipType: true, filterShipTypes: [50] };
    for (const id of [31, 32, 33, 34, 35, 52]) {
      expect(aisTargetShown('t', { type: { id } }, f)).toBe(true);
    }
    expect(aisTargetShown('y', yacht, f)).toBe(false);
  });

  it('hides a target without a ship type under the ship-type filter', () => {
    const f = { filterByShipType: true, filterShipTypes: [10, 50] };
    expect(aisTargetShown('x', {}, f)).toBe(false);
  });

  it('ignores the ship-type list while the ship-type filter is off', () => {
    const f = { filterByShipType: false, filterShipTypes: [70] };
    expect(aisTargetShown('y', yacht, f)).toBe(true);
  });

  it('shows only the ticked vessels of a selection', () => {
    const f = { filterIds: ['s'] };
    expect(aisTargetShown('s', ship, f)).toBe(true);
    expect(aisTargetShown('y', yacht, f)).toBe(false);
  });
});
