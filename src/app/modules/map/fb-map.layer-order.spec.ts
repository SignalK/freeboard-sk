import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The map's draw order lives in literal [zIndex] bindings in the template, so
// the guard reads the template itself. Rendering FbMapComponent would need its
// whole service graph just to check a few numbers.
const template = readFileSync(
  resolve(process.cwd(), 'src/app/modules/map/fb-map.component.html'),
  'utf8'
);

/** zIndex of every element with a numeric literal [zIndex], by tag name. */
function layerZIndexes(): Map<string, number[]> {
  const layers = new Map<string, number[]>();
  const re = /<([a-z][\w-]*)\s[^<]*?\[zIndex\]="(\d+)"/g;
  for (const [, tag, z] of template.matchAll(re)) {
    layers.set(tag, [...(layers.get(tag) ?? []), Number(z)]);
  }
  return layers;
}

describe('fb-map layer order', () => {
  const layers = layerZIndexes();
  const z = (tag: string): number[] => {
    const found = layers.get(tag);
    expect(found, `no [zIndex] found for <${tag}>`).toBeDefined();
    return found;
  };
  const [cpa] = z('fb-cpa-alarms');

  it('draws the CPA alarm above every AIS layer (#1010)', () => {
    // The danger ring sits on the target's position, so the target's own AIS
    // icon must not cover it. #519 set this; #520 reverted it in a merge.
    const ais = [...layers]
      .filter(([tag]) => tag.startsWith('sk-ais-'))
      .flatMap(([, zs]) => zs);
    expect(ais.length).toBeGreaterThan(0);
    expect(cpa).toBeGreaterThan(Math.max(...ais));
  });

  it('draws the CPA alarm above routes, waypoints, notes and regions', () => {
    for (const tag of [
      'fb-routes',
      'fb-route-direction',
      'fb-waypoints',
      'fb-notes',
      'fb-regions'
    ]) {
      expect(cpa, tag).toBeGreaterThan(Math.max(...z(tag)));
    }
  });

  it('keeps the CPA alarm below the MOB alarm and the own vessel', () => {
    expect(cpa).toBeLessThan(Math.min(...z('fb-alarms')));
    expect(cpa).toBeLessThan(Math.min(...z('fb-vessel')));
  });
});
