import { Map as OlMap } from 'ol';
import Collection, { CollectionEvent } from 'ol/Collection';
import { EventsKey } from 'ol/events';
import BaseLayer from 'ol/layer/Base';
import BaseVectorLayer from 'ol/layer/BaseVector';
import LayerGroup from 'ol/layer/Group';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { ObjectEvent } from 'ol/Object';
import { unByKey } from 'ol/Observable';

/*
 * The split view's second pane shows the main chart's layers through twins:
 * a layer of the same kind with the same source and properties. Sharing the
 * source means both panes draw the very same features (so a tap on either hits
 * the same Feature objects) and tiles are fetched once. Each twin follows its
 * original as layers come and go and as their properties and styles change.
 */

/** Not copied: an unmanaged layer's own map, and a group's child collection. */
const NOT_COPIED = new Set(['map', 'layers']);

interface Twin {
  layer: BaseLayer;
  stop: () => void;
}

function createTwin(
  layer: BaseLayer
): { twin: BaseLayer; stopChildren?: () => void } | null {
  if (layer instanceof LayerGroup) {
    const twin = new LayerGroup();
    return {
      twin,
      stopChildren: mirrorCollection(layer.getLayers(), twin.getLayers())
    };
  }
  if (layer instanceof VectorTileLayer) {
    return {
      twin: new VectorTileLayer({
        declutter: layer.getDeclutter(),
        renderMode: layer.getRenderMode()
      })
    };
  }
  if (layer instanceof VectorLayer) {
    return { twin: new VectorLayer({ declutter: layer.getDeclutter() }) };
  }
  if (layer instanceof WebGLTileLayer) {
    return { twin: new WebGLTileLayer({ source: layer.getSource() }) };
  }
  if (layer instanceof TileLayer) {
    return { twin: new TileLayer({ preload: layer.getPreload() }) };
  }
  if (layer instanceof ImageLayer) {
    return { twin: new ImageLayer({}) };
  }
  return null;
}

function copyProperties(from: BaseLayer, to: BaseLayer) {
  const properties = { ...from.getProperties() };
  NOT_COPIED.forEach((key) => delete properties[key]);
  to.setProperties(properties);
}

function twinOf(layer: BaseLayer): Twin | null {
  let made: ReturnType<typeof createTwin>;
  try {
    made = createTwin(layer);
  } catch (err) {
    console.warn('Split view: a layer could not be shown in both panes', err);
    return null;
  }
  if (!made) {
    return null;
  }
  const { twin, stopChildren } = made;
  copyProperties(layer, twin);
  const keys: EventsKey[] = [
    layer.on('propertychange', (e: ObjectEvent) => {
      if (!NOT_COPIED.has(e.key)) {
        twin.set(e.key, layer.get(e.key));
      }
    })
  ];
  if (layer instanceof BaseVectorLayer && twin instanceof BaseVectorLayer) {
    twin.setStyle(layer.getStyle());
    // setStyle() is not a property change; it only signals 'change'.
    keys.push(
      layer.on('change', () => {
        if (twin.getStyle() !== layer.getStyle()) {
          twin.setStyle(layer.getStyle());
        }
      })
    );
  }
  return {
    layer: twin,
    stop: () => {
      unByKey(keys);
      stopChildren?.();
    }
  };
}

/**
 * Keeps `to` holding a twin of every layer in `from`, in the same order.
 * Returns a function that stops following and removes the twins.
 */
export function mirrorCollection(
  from: Collection<BaseLayer>,
  to: Collection<BaseLayer>
): () => void {
  const twins = new Map<BaseLayer, Twin>();

  const add = (layer: BaseLayer) => {
    if (twins.has(layer)) {
      return;
    }
    const twin = twinOf(layer);
    if (!twin) {
      return;
    }
    twins.set(layer, twin);
    const index = from
      .getArray()
      .filter((l) => twins.has(l))
      .indexOf(layer);
    to.insertAt(index < 0 ? to.getLength() : index, twin.layer);
  };

  const remove = (layer: BaseLayer) => {
    const twin = twins.get(layer);
    if (!twin) {
      return;
    }
    twin.stop();
    to.remove(twin.layer);
    twins.delete(layer);
  };

  from.forEach(add);
  const keys = [
    from.on('add', (e: CollectionEvent<BaseLayer>) => add(e.element)),
    from.on('remove', (e: CollectionEvent<BaseLayer>) => remove(e.element))
  ];
  return () => {
    unByKey(keys);
    [...twins.keys()].forEach(remove);
  };
}

/**
 * Shows every layer of `source` on `target` as well, sharing their sources.
 * Returns a function that stops following and takes the twins off `target`.
 */
export function mirrorLayers(source: OlMap, target: OlMap): () => void {
  const group = new LayerGroup();
  target.addLayer(group);
  const stop = mirrorCollection(source.getLayers(), group.getLayers());
  return () => {
    stop();
    target.removeLayer(group);
  };
}
