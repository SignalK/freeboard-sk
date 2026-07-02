import { describe, it, expect, vi } from 'vitest';
import { createChartMethods, toChartLayer } from './chart-methods';
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
    setOrder: vi.fn()
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
