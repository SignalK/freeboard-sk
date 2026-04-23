import { signal } from '@angular/core';
import { SKResourceService } from './resources.service';
import { ChartResource } from 'src/app/types';

const createService = (
  listResponse: Record<string, ChartResource>,
  singleResponse?: ChartResource
) => {
  const signalk = {
    api: {
      get: (_version: number, path: string) => ({
        subscribe: (next: (res: any) => void) => {
          if (path.includes('/resources/charts/')) {
            if (singleResponse) {
              next(singleResponse)
              return
            }
            const id = path.split('/').pop() || ''
            next(listResponse[id])
            return
          }
          next(listResponse)
        }
      })
    }
  };

  const worker = {
    resource$: () => ({
      subscribe: () => undefined
    })
  };

  const dialog = {};

  const app = {
    hostDef: {
      url: 'http://localhost:3000',
      name: 'localhost'
    },
    config: {
      selections: {}
    },
    debug: () => undefined,
    parseHttpErrorResponse: () => undefined,
    sIsFetching: signal(false),
    uiConfig: () => ({
      mapConstrainZoom: false
    })
  };

  return new SKResourceService(
    dialog as any,
    signalk as any,
    worker as any,
    app as any
  );
};

describe('SKResourceService TileJSON enrichment', () => {
  const originalFetch = (globalThis as any).fetch;
  const originalAbortController = (globalThis as any).AbortController;

  beforeEach(() => {
    if (!(globalThis as any).AbortController) {
      (globalThis as any).AbortController = class {
        signal = {};
        abort() {
          return undefined;
        }
      };
    }
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (globalThis as any).AbortController = originalAbortController;
  });

  it('enriches tilejson charts with missing metadata', async () => {
    const tilejson = {
      bounds: [8, 53, 8.2, 53.3],
      minzoom: 6,
      maxzoom: 12,
      format: 'pbf'
    };

    (globalThis as any).fetch = jasmine
      .createSpy('fetch')
      .and.callFake(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(tilejson)
        })
      );

    const service = createService({
      nautical_pm: {
        name: 'Nautical',
        type: 'tileJSON',
        url: 'http://tiles.example/data/nautical_pm.json'
      }
    });

    const list = await service.listFromServer<any>('charts');
    const chart = list[0][1];

    expect(chart.minZoom).toBe(6);
    expect(chart.maxZoom).toBe(12);
    expect(chart.bounds).toEqual([8, 53, 8.2, 53.3]);
    expect(chart.format).toBe('pbf');
  });

  it('does not fetch tilejson when metadata already present', async () => {
    const fetchSpy = jasmine.createSpy('fetch');
    (globalThis as any).fetch = fetchSpy;

    const service = createService({
      sample_pm: {
        name: 'Sample Raster',
        type: 'tileJSON',
        url: 'http://tiles.example/data/sample_pm.json',
        bounds: [1, 2, 3, 4],
        minzoom: 0,
        maxzoom: 9,
        format: 'webp'
      }
    });

    const list = await service.listFromServer<any>('charts');
    const chart = list[0][1];

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(chart.minZoom).toBe(0);
    expect(chart.maxZoom).toBe(9);
    expect(chart.bounds).toEqual([1, 2, 3, 4]);
    expect(chart.format).toBe('webp');
  });

  it('enriches single chart fetch for info dialog', async () => {
    const tilejson = {
      bounds: [10, 20, 30, 40],
      minzoom: 3,
      maxzoom: 14,
      format: 'pbf'
    };

    (globalThis as any).fetch = jasmine
      .createSpy('fetch')
      .and.callFake(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(tilejson)
        })
      );

    const service = createService(
      {
        sample: {
          name: 'Sample',
          type: 'tileJSON',
          url: 'http://tiles.example/data/sample.json'
        }
      },
      {
        name: 'Sample',
        type: 'tileJSON',
        url: 'http://tiles.example/data/sample.json'
      }
    );

    const chart = await service.fromServer('charts', 'sample');

    expect(chart.minZoom).toBe(3);
    expect(chart.maxZoom).toBe(14);
    expect(chart.bounds).toEqual([10, 20, 30, 40]);
    expect(chart.format).toBe('pbf');
  });
});
