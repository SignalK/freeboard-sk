import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Collection, Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { FeatureLike } from 'ol/Feature';

import { FBMapComponent } from './fb-map.component';
import { SKWaypoint } from '../skresources/resource-classes';
import type { TargetRule } from '../plotterext/actions';
import type { MapPick } from './fbmap-interact.service';
import type { OverlayHit } from './ol/lib/data-overlay/overlay-hits';

const waypoint = new SKWaypoint({
  name: 'Fuel dock',
  feature: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-80.12, 25.77] },
    properties: {}
  }
} as never);

// A bare prototype instance, as in fb-map.ext-actions.spec.ts, with a pick on.
const bareComponent = (rules: TargetRule[]) => {
  const cmp = Object.create(FBMapComponent.prototype);
  const pick = signal<MapPick | null>({
    pickId: 'p1',
    extension: 'auto-route',
    extensionName: 'Auto Route',
    rules
  });
  cmp.app = {
    data: { map: {}, atons: new Map() },
    config: { map: { popoverMulti: false }, display: { statusBar: {} } },
    uiCtrl: signal({ suppressContextMenu: false }),
    debug: (): void => undefined
  };
  cmp.mapInteract = {
    pick,
    endPick: vi.fn(() => pick.set(null)),
    isMeasuring: () => false,
    isDrawing: () => false,
    isModifying: () => false,
    isBoxSelecting: () => false,
    draw: { features: new Collection(), forSave: {} }
  };
  cmp.zoneEdit = { edit: (): null => null };
  cmp.overlay = signal({ show: false });
  cmp.menuZoom = signal(0);
  cmp.mapZoomLevel = signal(10);
  cmp.modifyMode = false;
  cmp.mouse = signal({ pixel: [10, 10], coords: [-80.11, 25.76], xy: [1, 1] });
  cmp.contextMenu = { openMenu: vi.fn(), closeMenu: vi.fn(), menuData: null };
  cmp.contextMenuPosition = { x: '0px', y: '0px' };
  cmp.skres = {
    fromCache: (type: string, id: string) =>
      type === 'waypoints' && id === 'w1' ? ['w1', waypoint] : undefined
  };
  cmp.routeBuffers = { getForRoute: (): undefined => undefined };
  cmp.dfeat = { self: { name: 'Self', position: [0, 0] }, ais: new Map() };
  cmp.plotterExt = {
    addableCellAt: (): null => null,
    actionsFor: () => [{ extension: 'x', action: { id: 'a' } }],
    overlays: {
      entry: (key: string) =>
        ({
          'auto-route/marks': {
            key,
            extension: 'auto-route',
            id: 'marks',
            title: 'Route marks',
            interactive: true,
            titleProperty: 'name'
          },
          'buoys/stations': {
            key,
            extension: 'buoys',
            id: 'stations',
            title: 'Buoys',
            interactive: true,
            titleProperty: 'name'
          }
        })[key]
    }
  };
  cmp.processMapClick = vi.fn();
  cmp.pinCursorAtTap = vi.fn();
  cmp.popoverClosed = vi.fn();
  return cmp;
};

const wptFeature = () => {
  const f = new Feature(new Point(fromLonLat([-80.12, 25.77])));
  f.setId('waypoint.w1');
  return f;
};

const clickOn = (
  cmp: ReturnType<typeof bareComponent>,
  features: FeatureLike[],
  lonlat: [number, number] = [-80.11, 25.76],
  overlayHits: OverlayHit[] = []
) => cmp.onMapSingleClick({ features, overlayHits, lonlat, worldOffset: 0 });

const overlayHit = (overlayKey: string, featureId: string | number) => ({
  overlayKey,
  source: 'marks',
  featureId,
  properties: { name: `Mark ${featureId}` },
  feature: new Feature(new Point(fromLonLat([-80.11, 25.76]))),
  above: 0
});

describe('FBMapComponent: a select during a pick (map.pick)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ends a position pick with the point and does nothing else', () => {
    const cmp = bareComponent([{ kind: 'position' }]);
    // in the world copy east of the primary one: the target is canonical
    clickOn(cmp, [wptFeature()], [280, 25.76]);
    expect(cmp.mapInteract.endPick).toHaveBeenCalledWith('p1', {
      target: { kind: 'position', position: [-80, 25.76] }
    });
    expect(cmp.processMapClick).not.toHaveBeenCalled();
    expect(cmp.pinCursorAtTap).not.toHaveBeenCalled();
  });

  it('yields the feature the pick accepts, as an action target', () => {
    const cmp = bareComponent([{ kind: 'waypoint' }]);
    clickOn(cmp, [wptFeature()]);
    expect(cmp.mapInteract.endPick).toHaveBeenCalledWith('p1', {
      target: {
        kind: 'waypoint',
        position: [-80.11, 25.76],
        id: 'w1',
        href: '/resources/waypoints/w1',
        name: 'Fuel dock',
        featurePosition: [-80.12, 25.77]
      }
    });
  });

  it('ignores a select on nothing the pick accepts, and stays in the pick', () => {
    const cmp = bareComponent([{ kind: 'note' }]);
    clickOn(cmp, [wptFeature()]);
    clickOn(cmp, []);
    expect(cmp.mapInteract.endPick).not.toHaveBeenCalled();
    expect(cmp.processMapClick).not.toHaveBeenCalled();
    expect(cmp.mapInteract.pick()?.pickId).toBe('p1');
  });

  it('opens no context menu, Freeboard’s or an extension’s, during a pick', () => {
    const cmp = bareComponent([{ kind: 'position' }]);
    cmp.onMapRightClick({ features: [], lonlat: [-80.11, 25.76] });
    const e = {
      clientX: 1,
      clientY: 1,
      preventDefault: vi.fn()
    } as unknown as MouseEvent;
    cmp.onContextMenu(e);
    expect(cmp.contextMenu.openMenu).not.toHaveBeenCalled();
  });

  it('yields its own overlay feature, the topmost thing it accepts', () => {
    const cmp = bareComponent([
      { kind: 'overlayFeature' },
      { kind: 'waypoint' }
    ]);
    clickOn(cmp, [wptFeature()], undefined, [
      overlayHit('auto-route/marks', 7)
    ]);
    expect(cmp.mapInteract.endPick).toHaveBeenCalledWith('p1', {
      target: expect.objectContaining({
        kind: 'overlayFeature',
        overlayId: 'marks',
        source: 'marks',
        featureId: 7,
        name: 'Mark 7'
      })
    });
  });

  it('never yields another extension’s overlay feature', () => {
    const cmp = bareComponent([{ kind: 'overlayFeature' }]);
    clickOn(cmp, [], undefined, [overlayHit('buoys/stations', 'b1')]);
    expect(cmp.mapInteract.endPick).not.toHaveBeenCalled();
    // with position among the targets, the select yields the point instead
    cmp.mapInteract.pick.update((p: MapPick) => ({
      ...p,
      rules: [{ kind: 'overlayFeature' }, { kind: 'position' }]
    }));
    clickOn(cmp, [], undefined, [overlayHit('buoys/stations', 'b1')]);
    expect(cmp.mapInteract.endPick).toHaveBeenCalledWith('p1', {
      target: { kind: 'position', position: [-80.11, 25.76] }
    });
  });

  it('handles clicks as before once the pick is over', () => {
    const cmp = bareComponent([{ kind: 'position' }]);
    cmp.mapInteract.pick.set(null);
    clickOn(cmp, []);
    expect(cmp.mapInteract.endPick).not.toHaveBeenCalled();
    expect(cmp.processMapClick).toHaveBeenCalled();
  });
});
