import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Map as OlMap, View } from 'ol';
import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import Layer from 'ol/layer/Layer';
import { MapComponent } from '../ol/lib/map.component';
import { PluginOverlayComponent } from '../ol/lib/plugin-overlay/layer-plugin-overlay.component';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import type { OverlayFrameDelivery } from 'src/app/modules/plotterext/overlay-registry';
import { mirrorLayers } from './layer-mirror';

/*
 * A plugin image overlay closes each frame's bitmap once nothing can draw it
 * again. With the split view open its twin draws the same frames on the second
 * pane, and keeps drawing the old one through a gesture there while the main
 * chart moves on; a bitmap closed under it would leave the overlay blank.
 */

const bitmap = () =>
  ({ width: 100, height: 50, close: vi.fn() }) as unknown as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };

const frame = (image: ImageBitmap): OverlayFrameDelivery => ({
  image,
  extent: [0, 0, 1000, 500]
});

/** Lets a test say what a layer's renderer draws, and has it render. */
const renderer = (layer: BaseLayer) => {
  let image: unknown = null;
  vi.spyOn(layer as Layer, 'getRenderer').mockImplementation(
    () => ({ getImage: () => image }) as never
  );
  return {
    draws(drawn: unknown) {
      image = drawn;
      layer.dispatchEvent('postrender');
    }
  };
};

describe('A plugin image overlay in the split view', () => {
  let main: OlMap;
  let deliver: (frame: OverlayFrameDelivery) => void;

  beforeEach(() => {
    main = new OlMap({ view: new View({ center: [0, 0], zoom: 10 }) });
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeDetectorRef, useValue: { detach: () => undefined } },
        { provide: MapComponent, useValue: { getMap: () => main } },
        {
          provide: PlotterExtensionService,
          useValue: {
            overlays: {
              registerSink: (
                _key: string,
                sink: (frame: OverlayFrameDelivery) => void
              ) => {
                deliver = sink;
                return () => undefined;
              },
              clearRequest: () => undefined
            },
            requestOverlayFrame: () => undefined
          }
        }
      ]
    });
  });

  const openSplit = () => {
    const overlay = TestBed.runInInjectionContext(
      () => new PluginOverlayComponent()
    );
    overlay.overlayKey = 'ext/depth';
    overlay.ngOnInit();
    const second = new OlMap();
    const stop = mirrorLayers(main, second);
    const pane = second.getLayers().item(0) as LayerGroup;
    return {
      overlay,
      second,
      stop,
      mainChart: renderer(main.getLayers().item(0)),
      secondPane: renderer(pane.getLayers().item(0))
    };
  };

  it('keeps the frame the second pane draws open while the main chart moves on', () => {
    const { mainChart, secondPane } = openSplit();
    const [a, b, c] = [bitmap(), bitmap(), bitmap()];
    deliver(frame(a));
    mainChart.draws(a);
    secondPane.draws(a);

    // a gesture on the second pane: it keeps drawing A as frames arrive
    deliver(frame(b));
    mainChart.draws(b);
    deliver(frame(c));
    mainChart.draws(c);

    expect(a.close).not.toHaveBeenCalled();
    expect(b.close).toHaveBeenCalled();

    // the gesture ends and the second pane draws the newest frame
    secondPane.draws(c);
    expect(a.close).toHaveBeenCalled();
    expect(c.close).not.toHaveBeenCalled();
  });

  it('releases the frame only the second pane drew when the split closes', () => {
    const { mainChart, secondPane, stop } = openSplit();
    const [a, b] = [bitmap(), bitmap()];
    deliver(frame(a));
    mainChart.draws(a);
    secondPane.draws(a);
    deliver(frame(b));
    mainChart.draws(b);
    expect(a.close).not.toHaveBeenCalled();

    stop();

    expect(a.close).toHaveBeenCalled();
    expect(b.close).not.toHaveBeenCalled();
  });

  it('closes every frame when the overlay goes, and leaves the second pane', () => {
    const { overlay, second, mainChart, secondPane } = openSplit();
    const [a, b] = [bitmap(), bitmap()];
    deliver(frame(a));
    mainChart.draws(a);
    secondPane.draws(a);
    deliver(frame(b));
    mainChart.draws(b);

    overlay.ngOnDestroy();

    expect(a.close).toHaveBeenCalled();
    expect(b.close).toHaveBeenCalled();
    expect(
      (second.getLayers().item(0) as LayerGroup).getLayers().getLength()
    ).toBe(0);
  });
});
