import { describe, it, expect } from 'vitest';
import { AISBaseLayerComponent, SKTarget } from './ais-base.component';

/**
 * Behaviour tests for the vessel display filters resolved by
 * `okToRenderTarget()` (#478). The "Buddies only" filter is a `-998` sentinel in
 * `filterShipTypes` (mirroring the `-999` "IMO only" sentinel) and must AND with
 * the other filters, so a target renders only when it satisfies every active one.
 *
 * `okToRenderTarget` only reads plain instance fields, so exercise it on a bare
 * prototype instance — no Angular DI needed (same approach as the chart-opacity
 * spec).
 */
function component(fields: {
  targets: Map<string, SKTarget>;
  filterShipTypes?: number[];
  filterByShipType?: boolean;
  filterIds?: string[];
}) {
  const c = Object.create(
    AISBaseLayerComponent.prototype
  ) as AISBaseLayerComponent;
  Object.assign(c, fields);
  return c as unknown as { okToRenderTarget: (id: string) => boolean };
}

function vessel(props: Partial<SKTarget>): SKTarget {
  return { registrations: {}, ...props } as SKTarget;
}

describe('okToRenderTarget — Buddies only filter (#478)', () => {
  const buddy = vessel({ buddy: true });
  const stranger = vessel({ buddy: false });

  it('renders every vessel when the buddies-only sentinel is absent', () => {
    const c = component({
      targets: new Map([
        ['b', buddy],
        ['s', stranger]
      ]),
      filterShipTypes: []
    });
    expect(c.okToRenderTarget('b')).toBe(true);
    expect(c.okToRenderTarget('s')).toBe(true);
  });

  it('renders only buddies when the -998 sentinel is set', () => {
    const c = component({
      targets: new Map([
        ['b', buddy],
        ['s', stranger]
      ]),
      filterShipTypes: [-998]
    });
    expect(c.okToRenderTarget('b')).toBe(true);
    expect(c.okToRenderTarget('s')).toBe(false);
  });

  it('hides a non-vessel target (no buddy flag) when buddies-only is set', () => {
    const aton = vessel({}); // buddy undefined
    const c = component({
      targets: new Map([['a', aton]]),
      filterShipTypes: [-998]
    });
    expect(c.okToRenderTarget('a')).toBe(false);
  });

  it('ANDs with IMO only — a buddy without an IMO is hidden', () => {
    const buddyWithImo = vessel({
      buddy: true,
      registrations: { imo: 'IMO1234567' }
    });
    const buddyNoImo = vessel({ buddy: true });
    const c = component({
      targets: new Map([
        ['bi', buddyWithImo],
        ['bn', buddyNoImo]
      ]),
      filterShipTypes: [-998, -999]
    });
    expect(c.okToRenderTarget('bi')).toBe(true);
    expect(c.okToRenderTarget('bn')).toBe(false);
  });

  it('ANDs with a filterIds selection', () => {
    const c = component({
      targets: new Map([
        ['b', buddy],
        ['s', stranger]
      ]),
      filterShipTypes: [-998],
      filterIds: ['s'] // stranger selected, but not a buddy
    });
    expect(c.okToRenderTarget('s')).toBe(false);
    // buddy is a buddy but not in the id selection
    expect(c.okToRenderTarget('b')).toBe(false);
  });

  it('ANDs with the ship-type filter', () => {
    const buddyCargo = vessel({ buddy: true, type: { id: 70, name: 'Cargo' } });
    const strangerCargo = vessel({
      buddy: false,
      type: { id: 70, name: 'Cargo' }
    });
    const c = component({
      targets: new Map([
        ['bc', buddyCargo],
        ['sc', strangerCargo]
      ]),
      filterByShipType: true,
      filterShipTypes: [70, -998]
    });
    expect(c.okToRenderTarget('bc')).toBe(true);
    expect(c.okToRenderTarget('sc')).toBe(false);
  });
});
