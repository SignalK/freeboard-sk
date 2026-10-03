import { describe, expect, it } from 'vitest';
import { mapWebappList, SKAppsList } from './webapps';

const app = (o: Partial<SKAppsList>): SKAppsList => ({
  author: '',
  description: 'd',
  license: '',
  location: undefined,
  _location: undefined,
  name: 'x',
  version: '1',
  ...o
});

describe('mapWebappList', () => {
  it('maps each location form to a server-relative URL', () => {
    expect(
      mapWebappList([
        app({ name: 'linked' }),
        app({ name: 'legacy', _location: '/signalk-server/legacy/public/' }),
        app({ name: 'plain', _location: '/plain/' }),
        app({ name: 'modern', location: '/modern/' })
      ]).map((a) => a.url)
    ).toEqual(['/linked', '/legacy/public/', '/plain/', '/modern/']);
  });

  it('leaves out Freeboard itself and empty entries', () => {
    expect(
      mapWebappList([
        app({ name: '@signalk/freeboard-sk', location: '/fb/' }),
        null
      ])
    ).toEqual([]);
    expect(mapWebappList(undefined)).toEqual([]);
  });
});
