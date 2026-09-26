import { describe, it, expect, vi } from 'vitest';
import { createChartMethods, toChartLayer, toChartTime } from './chart-methods';
import { FBChart, FBCharts } from 'src/app/types';

/** Build an FBChart tuple from a partial SKChart-shaped object. */
function chart(
  id: string,
  visible: boolean,
  props: Record<string, unknown> = {}
): FBChart {
  return [id, props as never, visible] as FBChart;
}

function setup(available: FBCharts = []) {
  const deps = {
    listAvailableOrdered: vi.fn(async () => available),
    setVisibility: vi.fn(),
    setOpacity: vi.fn(),
    setOrder: vi.fn(),
    // A chart is temporal when its (stub) SKChart carries a `time` block.
    isTemporal: vi.fn((c: FBChart) => !!(c?.[1] as { time?: unknown })?.time),
    setTime: vi.fn()
  };
  const methods = createChartMethods(deps);
  // The bus dispatches handlers as (params, ctx); ctx is unused here.
  const call = async (name: string, params?: unknown) =>
    methods[name](params, {} as never);
  return { deps, methods, call };
}

describe('toChartLayer', () => {
  it('maps required fields and defaults opacity to 1', () => {
    const layer = toChartLayer(chart('c1', true, { name: 'Chart One' }));
    expect(layer).toEqual({
      id: 'c1',
      name: 'Chart One',
      visible: true,
      opacity: 1
    });
  });

  it('falls back to id when name is missing', () => {
    expect(toChartLayer(chart('c1', false)).name).toBe('c1');
  });

  it('includes optional fields only when present', () => {
    const layer = toChartLayer(
      chart('c1', true, {
        name: 'C',
        type: 'raster',
        bounds: [-80.5, 25.5, -80, 26],
        minZoom: 4,
        maxZoom: 18,
        defaultOpacity: 0.5
      })
    );
    expect(layer).toEqual({
      id: 'c1',
      name: 'C',
      visible: true,
      opacity: 0.5,
      type: 'raster',
      bounds: [-80.5, 25.5, -80, 26],
      minZoom: 4,
      maxZoom: 18
    });
  });

  it('omits malformed bounds', () => {
    const layer = toChartLayer(
      chart('c1', true, { name: 'C', bounds: [1, 2, 3] })
    );
    expect(layer.bounds).toBeUndefined();
    // south above north is not a box either
    expect(
      toChartLayer(chart('c2', true, { name: 'C', bounds: [1, 5, 2, 4] }))
        .bounds
    ).toBeUndefined();
  });

  it('reports a chart across the antimeridian as west > east (#847)', () => {
    // a chart whose extent was stored unwrapped, east past 180
    const layer = toChartLayer(
      chart('fiji', true, { name: 'Fiji', bounds: [176, -20, 182, -15] })
    );
    expect(layer.bounds).toEqual([176, -20, -178, -15]);
    // already in the API's form: unchanged
    expect(
      toChartLayer(
        chart('fiji2', true, { name: 'Fiji', bounds: [176, -20, -178, -15] })
      ).bounds
    ).toEqual([176, -20, -178, -15]);
  });
});

describe('chart.list', () => {
  it('returns the available charts mapped in order', async () => {
    const { call } = setup([
      chart('top', true, { name: 'Top' }),
      chart('bottom', false, { name: 'Bottom' })
    ]);
    const res = (await call('chart.list')) as {
      charts: { id: string; visible: boolean }[];
    };
    expect(res.charts.map((c) => c.id)).toEqual(['top', 'bottom']);
    expect(res.charts[1].visible).toBe(false);
  });
});

describe('chart.setVisibility', () => {
  const available = [chart('c1', true, { name: 'C1' })];

  it('shows/hides known charts', async () => {
    const { call, deps } = setup(available);
    const res = await call('chart.setVisibility', {
      ids: ['c1'],
      visible: false
    });
    expect(res).toEqual({});
    expect(deps.setVisibility).toHaveBeenCalledWith(['c1'], false);
  });

  it('rejects a non-array ids with charts.badRequest', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setVisibility', { ids: 'c1', visible: true })
    ).rejects.toHaveProperty('reason', 'charts.badRequest');
  });

  it('rejects a non-boolean visible with charts.badRequest', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setVisibility', { ids: ['c1'], visible: 1 })
    ).rejects.toHaveProperty('reason', 'charts.badRequest');
  });

  it('rejects an unknown id with charts.unknownId', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setVisibility', { ids: ['nope'], visible: true })
    ).rejects.toHaveProperty('reason', 'charts.unknownId');
  });

  it('treats an empty batch as a no-op', async () => {
    const { call, deps } = setup(available);
    expect(
      await call('chart.setVisibility', { ids: [], visible: true })
    ).toEqual({});
    expect(deps.setVisibility).not.toHaveBeenCalled();
  });
});

describe('chart.setOpacity', () => {
  const available = [chart('c1', true, { name: 'C1' })];

  it('sets opacity on known charts', async () => {
    const { call, deps } = setup(available);
    await call('chart.setOpacity', { ids: ['c1'], opacity: 0.4 });
    expect(deps.setOpacity).toHaveBeenCalledWith(['c1'], 0.4);
  });

  it('rejects opacity out of range with charts.badRequest', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setOpacity', { ids: ['c1'], opacity: 1.5 })
    ).rejects.toHaveProperty('reason', 'charts.badRequest');
  });

  it('rejects a non-number opacity with charts.badRequest', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setOpacity', { ids: ['c1'], opacity: 'x' })
    ).rejects.toHaveProperty('reason', 'charts.badRequest');
  });

  it('rejects an unknown id with charts.unknownId', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setOpacity', { ids: ['nope'], opacity: 0.5 })
    ).rejects.toHaveProperty('reason', 'charts.unknownId');
  });
});

describe('chart.setOrder', () => {
  const available = [
    chart('a', true, { name: 'A' }),
    chart('b', true, { name: 'B' })
  ];

  it('applies a topmost-first order', async () => {
    const { call, deps } = setup(available);
    await call('chart.setOrder', { order: ['b', 'a'] });
    expect(deps.setOrder).toHaveBeenCalledWith(['b', 'a']);
  });

  it('rejects a non-array order with charts.badRequest', async () => {
    const { call } = setup(available);
    await expect(call('chart.setOrder', { order: 'b' })).rejects.toHaveProperty(
      'reason',
      'charts.badRequest'
    );
  });

  it('rejects an unknown id with charts.unknownId', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setOrder', { order: ['a', 'zz'] })
    ).rejects.toHaveProperty('reason', 'charts.unknownId');
  });
});

describe('chart.list — time (charts.time)', () => {
  const T0 = '2026-09-18T12:00:00.000Z';
  const T1 = '2026-09-18T15:00:00.000Z';
  const radar = chart('radar', true, {
    name: 'Radar',
    time: { url: 'x?t={time}', current: true, from: T0, to: T1, step: 300000 },
    timeValue: null
  });

  it('carries a time object only for temporal charts', async () => {
    const { call } = setup([radar, chart('static', true, { name: 'S' })]);
    const { charts } = (await call('chart.list')) as {
      charts: Array<{ id: string; time?: unknown }>;
    };
    expect(charts[0].time).toEqual({
      value: null,
      current: true,
      from: T0,
      to: T1,
      step: 300000
    });
    expect('time' in charts[1]).toBe(false);
  });

  it('reports the shown instant, an archival source and explicit values', () => {
    const archive = chart('a', true, {
      time: { current: false, values: [T0, T1] },
      timeValue: T1
    });
    expect(toChartTime(archive)).toEqual({
      value: T1,
      current: false,
      values: [T0, T1]
    });
    // toChartLayer only projects time when told the chart is temporal.
    expect('time' in toChartLayer(archive)).toBe(false);
    expect(toChartLayer(archive, true).time?.value).toBe(T1);
  });
});

describe('chart.setTime', () => {
  const T0 = '2026-09-18T12:00:00.000Z';
  const available = [
    chart('radar', true, { time: { current: true, from: T0, to: T0 } }),
    chart('static', true, { name: 'S' })
  ];

  it('retargets known temporal charts, passing the instant through unchanged', async () => {
    const { call, deps } = setup(available);
    await call('chart.setTime', {
      ids: ['radar'],
      time: '2026-09-18T12:02:30Z'
    });
    expect(deps.setTime).toHaveBeenCalledWith(
      ['radar'],
      '2026-09-18T12:02:30Z'
    );
  });

  it('returns a chart to live for null', async () => {
    const { call, deps } = setup(available);
    await call('chart.setTime', { ids: ['radar'], time: null });
    expect(deps.setTime).toHaveBeenCalledWith(['radar'], null);
  });

  it('rejects a time that is neither null nor an ISO 8601 instant with charts.badRequest', async () => {
    const { call, deps } = setup(available);
    for (const time of ['noon', 1758196800000, undefined, '']) {
      await expect(
        call('chart.setTime', { ids: ['radar'], time })
      ).rejects.toHaveProperty('reason', 'charts.badRequest');
    }
    expect(deps.setTime).not.toHaveBeenCalled();
  });

  it('rejects a malformed ids list with charts.badRequest', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setTime', { ids: 'radar', time: null })
    ).rejects.toHaveProperty('reason', 'charts.badRequest');
  });

  it('rejects an unknown id with charts.unknownId', async () => {
    const { call } = setup(available);
    await expect(
      call('chart.setTime', { ids: ['nope'], time: null })
    ).rejects.toHaveProperty('reason', 'charts.unknownId');
  });

  it('rejects a managed chart without a time dimension with charts.notTemporal', async () => {
    const { call, deps } = setup(available);
    await expect(
      call('chart.setTime', { ids: ['radar', 'static'], time: T0 })
    ).rejects.toHaveProperty('reason', 'charts.notTemporal');
    expect(deps.setTime).not.toHaveBeenCalled();
  });

  it('treats an empty batch as a no-op', async () => {
    const { call, deps } = setup(available);
    await expect(call('chart.setTime', { ids: [], time: T0 })).resolves.toEqual(
      {}
    );
    expect(deps.setTime).not.toHaveBeenCalled();
  });
});
