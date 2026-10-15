import { Map as OlMap } from 'ol';
import Collection, { CollectionEvent } from 'ol/Collection';
import { EventsKey } from 'ol/events';
import BaseLayer from 'ol/layer/Base';
import BaseVectorLayer from 'ol/layer/BaseVector';
import LayerGroup from 'ol/layer/Group';
import ImageLayer from 'ol/layer/Image';
import Layer from 'ol/layer/Layer';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { ObjectEvent } from 'ol/Object';
import { unByKey } from 'ol/Observable';
import { FrameState } from 'ol/Map';
import CanvasTileLayerRenderer from 'ol/renderer/canvas/TileLayer';
import RasterSource from 'ol/source/Raster';
import { followImageFilter } from '../ol/lib/charts/chart-utils';
import { ON_TWIN, OnTwin } from '../ol/lib/util';

/*
 * The split view's second pane shows the main chart's layers through twins:
 * a layer of the same kind with the same source and properties. Sharing the
 * source means both panes draw the very same features (so a tap on either hits
 * the same Feature objects) and vector tiles are fetched and decoded once;
 * raster tiles are kept by each pane, the browser's cache serving the second.
 * Each twin follows its original as layers come and go and as their
 * properties and styles change.
 */

/**
 * Not copied: an unmanaged layer's own map, a group's child collection, and a
 * layer's request to be told about its twins.
 */
const NOT_COPIED = new Set(['map', 'layers', ON_TWIN]);

interface Twin {
  layer: BaseLayer;
  stop: () => void;
}

/** Layers already reported as not shown in the second pane. */
const unmirrored = new WeakSet<BaseLayer>();

/**
 * A twin for a layer that draws its own element instead of using a renderer,
 * such as the background of a MapStyle chart. Its element can be in only one
 * map, so the twin copies the original's output into an element of its own,
 * then puts the original's element back as its own map drew it. On its first
 * frame it has nothing to put back yet, so it asks the original to be drawn
 * again on its own map.
 */
function elementTwin(layer: Layer): Layer {
  const own = document.createElement('div');
  let theirs: HTMLElement | null = null;
  return new Layer({
    source: layer.getSource(),
    render: (frameState: FrameState) => {
      const before = theirs?.style.cssText;
      const drawn = layer.render(frameState, null);
      if (drawn instanceof HTMLElement) {
        theirs = drawn;
        own.className = drawn.className;
        own.style.cssText = drawn.style.cssText;
        if (before !== undefined) {
          drawn.style.cssText = before;
        } else {
          layer.changed();
        }
      }
      return own;
    }
  });
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
  // The class name gives a chart its own canvas, as on the main chart, so a
  // chart's brightness and contrast filter applies to that chart alone.
  const className = layer.getClassName();
  // How a vector layer draws is set when it is made, not by properties.
  const drawing =
    layer instanceof BaseVectorLayer
      ? {
          declutter: layer.getDeclutter(),
          renderBuffer: layer.getRenderBuffer(),
          updateWhileAnimating: layer.getUpdateWhileAnimating(),
          updateWhileInteracting: layer.getUpdateWhileInteracting()
        }
      : {};
  if (layer instanceof VectorTileLayer) {
    return {
      twin: new VectorTileLayer({
        className,
        ...drawing,
        renderMode: layer.getRenderMode()
      })
    };
  }
  if (layer instanceof VectorLayer) {
    return { twin: new VectorLayer({ className, ...drawing }) };
  }
  // A WebGL tile layer's style is not a property: a layer styled for its data
  // hands its twin the style through ON_TWIN.
  if (layer instanceof WebGLTileLayer) {
    return {
      twin: new WebGLTileLayer({ className, source: layer.getSource() })
    };
  }
  if (layer instanceof TileLayer) {
    return { twin: new TileLayer({ className }) };
  }
  if (layer instanceof ImageLayer) {
    // A raster source (a MapStyle chart's hillshading) computes one image for
    // one view: two maps would each throw away the other's, endlessly.
    if (layer.getSource() instanceof RasterSource) {
      return null;
    }
    return { twin: new ImageLayer({ className }) };
  }
  // Only a plain Layer: a subclass draws through a renderer of its own.
  if (Object.getPrototypeOf(layer) === Layer.prototype) {
    return { twin: elementTwin(layer as Layer) };
  }
  return null;
}

function copyProperties(from: BaseLayer, to: BaseLayer) {
  const properties = { ...from.getProperties() };
  NOT_COPIED.forEach((key) => delete properties[key]);
  to.setProperties(properties);
}

function twinOf(layer: BaseLayer): Twin | null {
  let made: ReturnType<typeof createTwin> = null;
  const keys: EventsKey[] = [];
  let forget: (() => void) | undefined;
  const stop = () => {
    unByKey(keys);
    made?.stopChildren?.();
    forget?.();
  };
  try {
    made = createTwin(layer);
    if (!made) {
      if (!unmirrored.has(layer)) {
        unmirrored.add(layer);
        console.warn(
          'Split view: a layer of this kind is not shown in the second pane',
          layer
        );
      }
      return null;
    }
    const { twin } = made;
    copyProperties(layer, twin);
    const background = layer.getBackground();
    if (background) {
      twin.setBackground(background);
    }
    keys.push(
      layer.on('propertychange', (e: ObjectEvent) => {
        if (!NOT_COPIED.has(e.key)) {
          twin.set(e.key, layer.get(e.key));
        }
      })
    );
    if (twin instanceof Layer) {
      keys.push(...followImageFilter(twin));
      forget = (layer.get(ON_TWIN) as OnTwin | undefined)?.(twin);
      if (layer instanceof BaseVectorLayer && twin instanceof BaseVectorLayer) {
        twin.setStyle(layer.getStyle());
      }
      // A new style or background is not a property change, and a layer
      // redrawn with the same style (a style's sprite sheet arriving, a new
      // wind indicator) signals only 'change'; the twin is redrawn with it.
      keys.push(
        layer.on('change', () => {
          const background = layer.getBackground() || undefined;
          if (twin.getBackground() !== background) {
            twin.setBackground(background);
          }
          if (
            layer instanceof BaseVectorLayer &&
            twin instanceof BaseVectorLayer &&
            twin.getStyle() !== layer.getStyle()
          ) {
            twin.setStyle(layer.getStyle());
          } else {
            twin.changed();
          }
        })
      );
    }
    return { layer: twin, stop };
  } catch (err) {
    // Whatever was set up so far (a group's own twins included) goes again.
    stop();
    made?.twin.dispose();
    console.warn('Split view: a layer could not be shown in both panes', err);
    return null;
  }
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
    to.remove(twin.layer);
    twin.stop();
    // A tile left in the twin's cache keeps its decoded vector tile in the
    // shared source, and its canvas, for as long as the chart is shown.
    const renderer =
      twin.layer instanceof Layer && twin.layer.hasRenderer()
        ? twin.layer.getRenderer()
        : null;
    if (renderer instanceof CanvasTileLayerRenderer) {
      renderer.getTileCache().clear();
      renderer.getSourceTileCache().clear();
    }
    // Drops the twin's renderer (and its canvas or WebGL context) and its
    // listener on the shared source, which would otherwise keep it alive.
    twin.layer.dispose();
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
    group.dispose();
  };
}
