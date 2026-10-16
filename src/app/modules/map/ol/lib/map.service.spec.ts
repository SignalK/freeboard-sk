import { describe, expect, it } from 'vitest';
import { Map } from 'ol';
import { MapService } from './map.service';

describe('MapService', () => {
  it('forgets a removed map and keeps the others in order', () => {
    const service = new MapService();
    const main = new Map();
    const second = new Map();
    service.addMap(main);
    service.addMap(second, true);

    service.removeMap(second);

    expect(service.getMaps()).toEqual([main]);
  });

  it('keeps the main chart first when a secondary map registers before it', () => {
    const service = new MapService();
    const main = new Map();
    const second = new Map();
    service.addMap(second, true);
    service.addMap(main);

    expect(service.getMaps()).toEqual([main, second]);
  });
});
