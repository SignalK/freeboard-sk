import { describe, expect, it } from 'vitest';
import { Feature, Map as OlMap } from 'ol';
import { Point } from 'ol/geom';
import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Style } from 'ol/style';
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
});
