import { afterEach, describe, expect, it, vi } from 'vitest';
import { Feature, Map as OlMap } from 'ol';
import BaseEvent from 'ol/events/Event';
import { Point } from 'ol/geom';
import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import ImageLayer from 'ol/layer/Image';
import Layer from 'ol/layer/Layer';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import RasterSource from 'ol/source/Raster';
import CanvasTileLayerRenderer from 'ol/renderer/canvas/TileLayer';
import Tile from 'ol/Tile';
import Disposable from 'ol/Disposable';
import { FrameState } from 'ol/Map';
import { Style } from 'ol/style';
import {
  attachImageAdjustmentFilter,
  chartLayerClassName,
  IMAGE_FILTER
} from '../ol/lib/charts/chart-utils';
import { ON_TWIN } from '../ol/lib/util';
import { mirrorLayers } from './layer-mirror';

const vectorLayer = (id: string, zIndex = 0) => {
  const layer = new VectorLayer({
    source: new VectorSource<Feature>({
      features: [new Feature(new Point([0, 0]))]
    }),
    zIndex
  });
  layer.set('id', id);
  return layer;
};

// The mirror keeps its twins in one group on the target map.
const twinsOn = (map: OlMap): BaseLayer[] =>
  (map.getLayers().item(0) as LayerGroup).getLayers().getArray();

describe('mirrorLayers', () => {
  it('shows every layer again with the same source and properties', () => {
    const main = new OlMap();
    const tiles = new TileLayer({ source: new XYZ({ url: 'x/{z}/{x}/{y}' }) });
    const routes = vectorLayer('routes', 500);
    routes.setOpacity(0.5);
    main.addLayer(tiles);
    main.addLayer(routes);
    const second = new OlMap();

    mirrorLayers(main, second);

    const [tileTwin, routeTwin] = twinsOn(second) as [
      TileLayer<XYZ>,
      VectorLayer<VectorSource>
    ];
    expect(tileTwin).toBeInstanceOf(TileLayer);
    expect(tileTwin.getSource()).toBe(tiles.getSource());
    expect(routeTwin).not.toBe(routes);
    expect(routeTwin.getSource()).toBe(routes.getSource());
    expect(routeTwin.getZIndex()).toBe(500);
    expect(routeTwin.getOpacity()).toBe(0.5);
    expect(routeTwin.get('id')).toBe('routes');
  });

  it('follows property, source and style changes', () => {
    const main = new OlMap();
    const routes = vectorLayer('routes');
    main.addLayer(routes);
    const second = new OlMap();
    mirrorLayers(main, second);
    const twin = twinsOn(second)[0] as VectorLayer<VectorSource>;

    routes.setVisible(false);
    const source = new VectorSource();
    routes.setSource(source);
    const style = new Style();
    routes.setStyle(style);

    expect(twin.getVisible()).toBe(false);
    expect(twin.getSource()).toBe(source);
    expect(twin.getStyle()).toBe(style);
  });

  it('draws vector layers as their originals do: same buffer and updates', () => {
    const main = new OlMap();
    const options = {
      renderBuffer: 250,
      updateWhileAnimating: true,
      updateWhileInteracting: true
    };
    main.addLayer(new VectorLayer({ ...options, source: new VectorSource() }));
    main.addLayer(new VectorTileLayer(options));
    const second = new OlMap();

    mirrorLayers(main, second);

    for (const twin of twinsOn(second) as (VectorLayer | VectorTileLayer)[]) {
      expect(twin.getRenderBuffer()).toBe(250);
      expect(twin.getUpdateWhileAnimating()).toBe(true);
      expect(twin.getUpdateWhileInteracting()).toBe(true);
    }
    expect(twinsOn(second)).toHaveLength(2);
  });

  it("keeps a vector layer's declutter group and a vector tile layer's render mode", () => {
    // A data overlay declutters its labels among its own layers only.
    const main = new OlMap();
    main.addLayer(
      new VectorLayer({ declutter: 'ext/depth', source: new VectorSource() })
    );
    main.addLayer(new VectorTileLayer({ renderMode: 'vector' }));
    const second = new OlMap();

    mirrorLayers(main, second);

    const [vector, tiles] = twinsOn(second) as [VectorLayer, VectorTileLayer];
    expect(vector.getDeclutter()).toBe('ext/depth');
    expect(tiles.getRenderMode()).toBe('vector');
  });

  it("follows a raster chart's preload, so a pan shows the lower zoom there too", () => {
    const main = new OlMap();
    const chart = new TileLayer({ source: new XYZ({ url: 'c/{z}/{x}/{y}' }) });
    main.addLayer(chart);
    const second = new OlMap();
    mirrorLayers(main, second);

    chart.setPreload(1);

    expect((twinsOn(second)[0] as TileLayer).getPreload()).toBe(1);
  });

  it('adds and removes twins as layers come and go, keeping their order', () => {
    const main = new OlMap();
    const a = vectorLayer('a');
    const c = vectorLayer('c');
    main.addLayer(a);
    main.addLayer(c);
    const second = new OlMap();
    mirrorLayers(main, second);

    main.getLayers().insertAt(1, vectorLayer('b'));
    expect(twinsOn(second).map((l) => l.get('id'))).toEqual(['a', 'b', 'c']);

    main.removeLayer(a);
    expect(twinsOn(second).map((l) => l.get('id'))).toEqual(['b', 'c']);
  });

  it('mirrors the layers inside a group, including ones added later', () => {
    const main = new OlMap();
    const group = new LayerGroup();
    group.getLayers().push(vectorLayer('first'));
    main.addLayer(group);
    const second = new OlMap();
    mirrorLayers(main, second);

    group.getLayers().push(vectorLayer('later'));

    const twinGroup = twinsOn(second)[0] as LayerGroup;
    expect(twinGroup).toBeInstanceOf(LayerGroup);
    expect(
      twinGroup
        .getLayers()
        .getArray()
        .map((l) => l.get('id'))
    ).toEqual(['first', 'later']);
  });

  it('stops following and clears the target when stopped', () => {
    const main = new OlMap();
    const routes = vectorLayer('routes');
    main.addLayer(routes);
    const second = new OlMap();
    const stop = mirrorLayers(main, second);
    const twin = twinsOn(second)[0];

    stop();
    routes.setVisible(false);
    main.addLayer(vectorLayer('new'));

    expect(second.getLayers().getLength()).toBe(0);
    expect(twin.getVisible()).toBe(true);
  });

  it('lets go of the shared sources when stopped', () => {
    const main = new OlMap();
    const routes = vectorLayer('routes');
    main.addLayer(routes);
    const source = routes.getSource();
    const before = source.getListeners('change')?.length ?? 0;
    const second = new OlMap();

    const stop = mirrorLayers(main, second);
    expect(source.getListeners('change')?.length).toBeGreaterThan(before);
    stop();

    expect(source.getListeners('change')?.length ?? 0).toBe(before);
  });

  it("keeps a chart's own canvas and its brightness and contrast", () => {
    const main = new OlMap();
    const chart = new TileLayer({
      className: chartLayerClassName('osm'),
      source: new XYZ({ url: 'x/{z}/{x}/{y}' })
    });
    const setAdjustment = attachImageAdjustmentFilter(chart);
    main.addLayer(chart);
    const second = new OlMap();
    mirrorLayers(main, second);
    const twin = twinsOn(second)[0] as TileLayer<XYZ>;

    setAdjustment({ brightness: 0.3, contrast: 1 });
    const canvas = document.createElement('canvas');
    twin.dispatchEvent({
      type: 'postrender',
      context: { canvas }
    } as unknown as BaseEvent);

    expect(twin.getClassName()).toBe(chart.getClassName());
    expect(twin.get(IMAGE_FILTER)).toBe('brightness(0.3) contrast(1)');
    expect(canvas.style.filter).toBe('brightness(0.3) contrast(1)');
  });

  it('draws a layer with its own element into an element of its own', () => {
    // A MapStyle chart's background: a plain layer that returns a div.
    const div = document.createElement('div');
    div.className = 'ol-mapbox-style-background';
    const background = new Layer({
      render: (frameState: FrameState) => {
        div.style.backgroundColor =
          frameState.viewState.resolution > 100 ? 'blue' : 'white';
        return div;
      }
    });
    const main = new OlMap();
    main.addLayer(background);
    const second = new OlMap();
    mirrorLayers(main, second);
    const twin = twinsOn(second)[0] as Layer;
    const frame = (resolution: number) =>
      ({ viewState: { resolution } }) as unknown as FrameState;

    twin.render(frame(1000), null);
    background.render(frame(10), null);
    const drawn = twin.render(frame(1000), null);

    expect(drawn).not.toBe(div);
    expect(drawn.className).toBe('ol-mapbox-style-background');
    expect(drawn.style.backgroundColor).toBe('blue');
    // The main chart's own element is left as the main chart drew it.
    expect(div.style.backgroundColor).toBe('white');
  });

  it("has the original's element drawn again after the twin's first frame", () => {
    // The twin's first frame draws the element for the second pane's zoom,
    // with nothing yet to put back: the main chart must draw its own again.
    const div = document.createElement('div');
    const background = new Layer({ render: () => div });
    const main = new OlMap();
    main.addLayer(background);
    const second = new OlMap();
    mirrorLayers(main, second);
    const twin = twinsOn(second)[0] as Layer;
    const redrawn = vi.fn();
    background.on('change', redrawn);
    const frame = { viewState: { resolution: 1000 } } as unknown as FrameState;

    twin.render(frame, null);
    twin.render(frame, null);

    expect(redrawn).toHaveBeenCalledTimes(1);
  });

  it('follows a background set on a layer later', () => {
    const main = new OlMap();
    const chart = vectorLayer('chart');
    main.addLayer(chart);
    const second = new OlMap();
    mirrorLayers(main, second);

    chart.setBackground('#102030');

    expect(twinsOn(second)[0].getBackground()).toBe('#102030');
  });

  it('leaves nothing behind for a layer it fails to show', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const inner = new ImageLayer();
    const forget = vi.fn();
    inner.set(ON_TWIN, () => forget);
    const group = new LayerGroup({ layers: [inner] });
    group.getBackground = () => {
      throw new Error('cannot read');
    };
    const main = new OlMap({ layers: [group, vectorLayer('routes')] });
    const second = new OlMap();

    mirrorLayers(main, second);

    // The group's own twin of its layer is let go; the rest is still shown.
    expect(forget).toHaveBeenCalledTimes(1);
    expect(twinsOn(second).map((l) => l.get('id'))).toEqual(['routes']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('hands a layer that asks for it each twin, and tells it once the twin is gone', () => {
    const main = new OlMap();
    const overlay = new ImageLayer();
    let twin: BaseLayer;
    let inPaneWhenGone: boolean | undefined;
    const second = new OlMap();
    const onTwin = vi.fn((t: BaseLayer) => {
      twin = t;
      return () => (inPaneWhenGone = twinsOn(second).includes(t));
    });
    overlay.set(ON_TWIN, onTwin);
    main.addLayer(overlay);

    mirrorLayers(main, second);
    expect(onTwin).toHaveBeenCalledTimes(1);
    expect(twinsOn(second)).toEqual([twin]);
    expect(twin.get(ON_TWIN)).toBeUndefined();

    main.removeLayer(overlay);
    expect(inPaneWhenGone).toBe(false);
  });

  it('tells a layer its twin is gone when the mirror stops', () => {
    const main = new OlMap();
    const overlay = new ImageLayer();
    const forget = vi.fn();
    overlay.set(ON_TWIN, () => forget);
    main.addLayer(overlay);

    const stop = mirrorLayers(main, new OlMap());
    expect(forget).not.toHaveBeenCalled();
    stop();

    expect(forget).toHaveBeenCalledTimes(1);
  });

  it('redraws a twin whenever its original is redrawn', () => {
    // A style's sprite sheet arriving redraws the layer with the same style.
    const main = new OlMap();
    const routes = vectorLayer('routes');
    const tiles = new TileLayer({ source: new XYZ({ url: 'x/{z}/{x}/{y}' }) });
    main.addLayer(routes);
    main.addLayer(tiles);
    const second = new OlMap();
    mirrorLayers(main, second);
    const twins = twinsOn(second);
    const revisions = twins.map((t) => t.getRevision());

    routes.changed();
    tiles.changed();

    twins.forEach((t, i) =>
      expect(t.getRevision()).toBeGreaterThan(revisions[i])
    );
  });

  it('lets go of the tiles a twin kept when its layer goes', () => {
    const main = new OlMap();
    const tiles = new TileLayer({ source: new XYZ({ url: 'x/{z}/{x}/{y}' }) });
    main.addLayer(tiles);
    const second = new OlMap();
    mirrorLayers(main, second);
    const renderer = (twinsOn(second)[0] as TileLayer<XYZ>).getRenderer();
    expect(renderer).toBeInstanceOf(CanvasTileLayerRenderer);
    const kept = new Disposable();
    const dispose = vi.spyOn(kept, 'dispose');
    (renderer as CanvasTileLayerRenderer)
      .getTileCache()
      .set('0/0/0', kept as unknown as Tile);

    main.removeLayer(tiles);

    expect(dispose).toHaveBeenCalled();
  });

  it("lets a raster chart's preload finish before its twin goes", () => {
    vi.useFakeTimers();
    try {
      const main = new OlMap();
      const chart = new TileLayer({
        preload: 1,
        source: new XYZ({ url: 'c/{z}/{x}/{y}' })
      });
      main.addLayer(chart);
      const second = new OlMap();
      mirrorLayers(main, second);
      const twin = twinsOn(second)[0] as TileLayer<XYZ>;
      const renderer = twin.getRenderer() as CanvasTileLayerRenderer;
      // What OL leaves after drawing a frame of a layer that preloads: a
      // timer that queues the lower zoom's tiles, reading the layer.
      setTimeout(() =>
        renderer.enqueueTiles(
          { viewState: {} } as FrameState,
          [0, 0, 1, 1],
          1,
          {},
          0
        )
      );

      main.removeLayer(chart);

      expect(() => vi.runAllTimers()).not.toThrow();
      expect(twin.hasRenderer()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('a layer it cannot show', () => {
    afterEach(() => vi.restoreAllMocks());

    it('is left out with one warning, however often the split opens', () => {
      class OwnRenderer extends Layer {}
      const main = new OlMap();
      main.addLayer(new OwnRenderer({}));
      main.addLayer(vectorLayer('routes'));
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      mirrorLayers(main, new OlMap())();
      const second = new OlMap();
      mirrorLayers(main, second);

      expect(twinsOn(second).map((l) => l.get('id'))).toEqual(['routes']);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('leaves out an image computed for one view, as hillshading is', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const main = new OlMap();
      main.addLayer(
        new ImageLayer({
          source: new RasterSource({ sources: [], operation: (p) => p[0] })
        })
      );
      main.addLayer(vectorLayer('routes'));
      const second = new OlMap();

      mirrorLayers(main, second);

      expect(twinsOn(second).map((l) => l.get('id'))).toEqual(['routes']);
    });
  });
});
