import { describe, expect, it } from 'vitest';
import { AISListComponent } from './aislist';

/**
 * The Vessels list names how many vessels the chart draws while a filter hides
 * some, so "IMO Only" in an anchorage full of yachts cannot empty the chart
 * unnoticed. Exercised on a bare prototype instance: `chartShown` reads only
 * the config selections, the received vessels and the AIS status signal.
 */
function list(selections: object, targets: Map<string, object>) {
  const c = Object.create(AISListComponent.prototype);
  c.app = {
    config: {
      selections: {
        aisTargets: null,
        aisFilterByShipType: false,
        aisTargetTypes: [],
        ...selections
      }
    },
    data: { vessels: { aisTargets: targets } }
  };
  c.skstream = { aisStatus: () => ({}) };
  return c as { chartShown: () => { shown: number; total: number } | null };
}

const anchorage = new Map<string, object>([
  ['vessels.a', { registrations: {} }],
  ['vessels.b', { registrations: {} }],
  ['vessels.c', { registrations: { imo: 'IMO9234567' } }]
]);

describe('AISListComponent: chart filter hint', () => {
  it('says nothing while the chart draws every vessel', () => {
    expect(list({}, anchorage).chartShown()).toBeNull();
  });

  it('counts the vessels IMO Only leaves on the chart', () => {
    expect(list({ aisTargetTypes: [-999] }, anchorage).chartShown()).toEqual({
      shown: 1,
      total: 3
    });
  });

  it('counts unticked vessels as hidden', () => {
    expect(list({ aisTargets: ['vessels.a'] }, anchorage).chartShown()).toEqual(
      { shown: 1, total: 3 }
    );
  });
});
