import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SKResourceService } from './resources.service';
import { SKChart } from './resource-classes';
import { ChartImageAdjustment, ChartResource, FBCharts } from 'src/app/types';

/**
 * #836: chart opacity and image adjustment are per-user display preferences
 * held in the app config. `transformChart()` applies them to the in-memory
 * chart, so a chart sent back to the server must carry the resource's own
 * `defaultOpacity` and no `imageAdjustment` -- otherwise one user's settings
 * overwrite the shared resource. Exercised on a bare prototype instance with
 * the server calls stubbed -- no Angular DI needed.
 */
const ADJ: ChartImageAdjustment = { brightness: 1.2, contrast: 0.8 };

type Internals = {
  transformChart: (c: ChartResource, id: string) => SKChart;
  absorbChartDelta: (id: string, value: unknown) => boolean;
  withoutLocalState: (c: SKChart) => SKChart;
  chartCacheSignal: { (): FBCharts; set: (v: FBCharts) => void };
};

function svcWithPrefs(
  chartOpacity: Record<string, number> = { 'my-chart': 0.37 },
  chartImageAdjustment: Record<string, ChartImageAdjustment> = {
    'my-chart': ADJ
  }
) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(svc as unknown as Record<string, unknown>, {
    app: {
      hostDef: { url: 'http://sk.local:3000' },
      config: {
        selections: {
          charts: null,
          chartOpacity,
          chartImageAdjustment,
          chartDisplayMinZoom: {}
        }
      },
      sIsFetching: signal(false),
      parseHttpErrorResponse: vi.fn(),
      debug: vi.fn()
    },
    // Field initialisers do not run on a bare prototype instance.
    adoptedOverlays: new Map(),
    chartCacheSignal: signal<FBCharts>([])
  });
  return { svc, internals: svc as unknown as Internals };
}

const resource = (defaultOpacity?: number): ChartResource => ({
  name: 'Radar',
  type: 'WMS',
  url: 'https://wms.example/radar',
  layers: ['radar'],
  ...(defaultOpacity === undefined ? {} : { defaultOpacity })
});

describe('sending a chart with user display preferences to the server (#836)', () => {
  it('applies the preferences to the chart on the map', () => {
    const { internals } = svcWithPrefs();
    const chart = internals.transformChart(resource(1), 'my-chart');
    expect(chart.defaultOpacity).toBe(0.37);
    expect(chart.imageAdjustment).toEqual(ADJ);
  });

  it("sends the resource's own opacity, not the user's", () => {
    const { internals } = svcWithPrefs();
    const outbound = internals.withoutLocalState(
      internals.transformChart(resource(0.8), 'my-chart')
    );
    expect(outbound.defaultOpacity).toBe(0.8);
  });

  it('sends no opacity when the resource declared none', () => {
    const { internals } = svcWithPrefs();
    const outbound = internals.withoutLocalState(
      internals.transformChart(resource(), 'my-chart')
    );
    expect('defaultOpacity' in outbound).toBe(false);
  });

  it('never sends the image adjustment', () => {
    const { internals } = svcWithPrefs();
    const outbound = internals.withoutLocalState(
      internals.transformChart(resource(1), 'my-chart')
    );
    expect('imageAdjustment' in outbound).toBe(false);
  });

  it('sends no bookkeeping field of its own', () => {
    const { internals } = svcWithPrefs();
    const outbound = internals.withoutLocalState(
      internals.transformChart(resource(1), 'my-chart')
    );
    expect(Object.keys(outbound)).not.toContain('resourceOpacity');
  });

  it("still sends the resource's opacity after the user changes it on the map", () => {
    const { svc, internals } = svcWithPrefs({});
    internals.chartCacheSignal.set([
      ['my-chart', internals.transformChart(resource(0.8), 'my-chart'), true]
    ]);
    // Each setter rebuilds the cache entry from the instance.
    svc.chartSetOpacity('my-chart', 0.25);
    svc.chartSetImageAdjustment('my-chart', ADJ);
    const cached = internals.chartCacheSignal()[0][1];
    expect(cached.defaultOpacity).toBe(0.25);
    const outbound = internals.withoutLocalState(cached);
    expect(outbound.defaultOpacity).toBe(0.8);
    expect('imageAdjustment' in outbound).toBe(false);
  });

  it('keeps the opacity of a chart that did not come from the server', () => {
    // A new chart built in the Add dialog: its opacity is the resource's.
    const { internals } = svcWithPrefs();
    const outbound = internals.withoutLocalState(
      new SKChart({ ...resource(), defaultOpacity: 0.6 })
    );
    expect(outbound.defaultOpacity).toBe(0.6);
  });

  it('Chart Properties Save writes the resource unchanged by user preferences', async () => {
    const { svc } = svcWithPrefs();
    const putToServer = vi.fn(async () => undefined);
    Object.assign(svc as unknown as Record<string, unknown>, {
      fromServer: async (_c: string, id: string) =>
        (svc as unknown as Internals).transformChart(resource(1), id),
      putToServer,
      dialog: {
        open: (_c: unknown, cfg: { data: SKChart }) => ({
          // the dialog hands back the chart it was given, renamed
          afterClosed: () =>
            of({ save: true, chart: { ...cfg.data, name: 'Renamed' } })
        })
      }
    });

    await svc.editChartInfo('my-chart');
    await new Promise((resolve) => setTimeout(resolve));

    expect(putToServer).toHaveBeenCalledOnce();
    const [, id, chart] = putToServer.mock.calls[0] as unknown as [
      string,
      string,
      SKChart
    ];
    expect(id).toBe('my-chart');
    expect(chart.name).toBe('Renamed');
    expect(chart.defaultOpacity).toBe(1);
    expect('imageAdjustment' in chart).toBe(false);
  });

  it("does not absorb a delta that changes the resource's opacity, though the user's hides it", () => {
    const { internals } = svcWithPrefs();
    internals.chartCacheSignal.set([
      ['my-chart', internals.transformChart(resource(1), 'my-chart'), true]
    ]);
    // Both sides draw at the user's 0.37; only the resource changed. It must
    // reach the cache through a full refresh, not be dropped as a no-op.
    expect(internals.absorbChartDelta('my-chart', resource(0.5))).toBe(false);
  });
});
