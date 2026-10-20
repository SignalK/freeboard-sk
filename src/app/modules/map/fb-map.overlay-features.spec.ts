import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Collection, Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import type { FeatureLike } from 'ol/Feature';

import { FBMapComponent } from './fb-map.component';
import { SKWaypoint } from '../skresources/resource-classes';
import { RouteBufferRegistry } from '../plotterext/route-buffer.registry';
import {
  actionApplies,
  usableActions,
  type SelectedTarget
} from '../plotterext/actions';
import type { OverlayHit } from './ol/lib/data-overlay/overlay-hits';

// Selecting the features of interactive data overlays (capability
// `actions.overlay`), on a bare prototype instance as in
// fb-map.ext-actions.spec.ts. The actions are real manifest actions run
// through the real applicability rules, so ownership is exercised too.

const waypoint = new SKWaypoint({
  name: 'Fuel dock',
  feature: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-80.12, 25.77] },
    properties: {}
  }
} as never);

const publish = { type: 'publish', topic: 'probe.go' };

const manifests: Record<string, unknown[]> = {
  buoys: [
    {
      id: 'details',
      title: 'Buoy details',
      targets: [{ kind: 'overlayFeature', overlays: ['stations'] }],
      action: publish
    },
    {
      id: 'go',
      title: 'Go',
      targets: ['position'],
      action: publish
    }
  ],
  other: [
    {
      id: 'steal',
      title: 'Not yours',
      targets: ['overlayFeature'],
      action: publish
    }
  ]
};

const entries: Record<string, object> = {
  'buoys/stations': {
    extension: 'buoys',
    id: 'stations',
    title: 'Weather buoys',
    interactive: true,
    titleProperty: 'station'
  },
  'other/stations': {
    extension: 'other',
    id: 'stations',
    title: 'Other stations',
    interactive: true,
    titleProperty: 'station'
  },
  'buoys/quiet': {
    extension: 'buoys',
    id: 'quiet',
    title: 'Quiet',
    interactive: true,
    titleProperty: 'name'
  }
};

const bareComponent = (extra: Record<string, unknown[]> = {}) => {
  const actions = Object.entries({ ...manifests, ...extra }).flatMap(
    ([ext, list]) =>
      usableActions(ext, ext.toUpperCase(), list, '1', () => true)
  );
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: { map: {}, atons: new Map() },
    config: { map: { popoverMulti: false }, display: { statusBar: {} } },
    uiCtrl: signal({ suppressContextMenu: false }),
    debug: (): void => undefined
  };
  cmp.mapInteract = {
    pick: (): null => null,
    isMeasuring: () => false,
    isDrawing: () => false,
    isModifying: () => false,
    isBoxSelecting: () => false,
    draw: { features: new Collection(), forSave: {} }
  };
  cmp.zoneEdit = { edit: (): null => null };
  cmp.overlay = signal({ show: false });
  cmp.popoverMap = signal(undefined);
  cmp.menuZoom = signal(0);
  cmp.mapZoomLevel = signal(10);
  cmp.modifyMode = false;
  cmp.clickWorldOffset = 0;
  cmp.mouse = signal({ pixel: [10, 10], coords: [-80.11, 25.76], xy: [1, 1] });
  cmp.contextMenu = { openMenu: vi.fn(), closeMenu: vi.fn(), menuData: null };
  cmp.contextMenuPosition = { x: '0px', y: '0px' };
  cmp.infoPanel = { opened: () => false };
  cmp.skres = {
    fromCache: (type: string, id: string) =>
      type === 'waypoints' && id === 'w1' ? ['w1', waypoint] : undefined
  };
  cmp.routeBuffers = new RouteBufferRegistry();
  cmp.dfeat = { self: { name: 'Self', position: [0, 0] }, ais: new Map() };
  cmp.modifyFeature = vi.fn();
  cmp.plotterExt = {
    addableCellAt: (): null => null,
    actionsFor: (sel: SelectedTarget) =>
      actions.filter((a) => actionApplies(a, sel)),
    invokeAction: vi.fn(),
    overlays: { entry: (key: string) => entries[key] }
  };
  const backdrop = document.createElement('div');
  backdrop.className = 'cdk-overlay-backdrop';
  document.body.appendChild(backdrop);
  return cmp;
};

const at: [number, number] = [-80.11, 25.76];

const hit = (
  featureId: string | number,
  over: Partial<OverlayHit> = {}
): OverlayHit => ({
  overlayKey: 'buoys/stations',
  source: 'stations',
  featureId,
  properties: { station: 'Fowey Rocks' },
  feature: new Feature(new Point(fromLonLat([-80.1, 25.75]))),
  above: 0,
  ...over
});

const wptFeature = () => {
  const f = new Feature(new Point(fromLonLat([-80.12, 25.77])));
  f.setId('waypoint.w1');
  return f;
};

const click = (
  cmp: ReturnType<typeof bareComponent>,
  overlayHits: OverlayHit[],
  features: FeatureLike[] = []
) => cmp.processMapClick({ features, overlayHits, lonlat: at, worldOffset: 0 });

describe('FBMapComponent: selecting an interactive overlay feature', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens a popover titled by titleProperty, with the extension’s actions', () => {
    const cmp = bareComponent();
    click(cmp, [hit(17)]);
    const po = cmp.overlay();
    expect(po.show).toBe(true);
    expect(po.type).toBe('overlayFeature');
    expect(po.title).toBe('Fowey Rocks');
    expect(po.target.target).toMatchObject({
      kind: 'overlayFeature',
      overlayId: 'stations',
      source: 'stations',
      featureId: 17,
      properties: { station: 'Fowey Rocks' },
      name: 'Fowey Rocks'
    });
    expect(
      cmp.plotterExt
        .actionsFor(po.target)
        .map((a: { action: { id: string } }) => a.action.id)
    ).toEqual(['details']);
    expect(cmp.plotterExt.invokeAction).not.toHaveBeenCalled();
  });

  it('runs the default action at once instead, the first that applies', () => {
    const cmp = bareComponent({
      buoys: [
        ...manifests['buoys'],
        {
          id: 'open',
          title: 'Open',
          default: true,
          targets: ['overlayFeature'],
          action: publish
        },
        {
          id: 'later',
          title: 'Later',
          default: true,
          targets: ['overlayFeature'],
          action: publish
        }
      ]
    });
    click(cmp, [hit('b17')]);
    expect(cmp.plotterExt.invokeAction).toHaveBeenCalledTimes(1);
    const [ext, actionId, sel] = cmp.plotterExt.invokeAction.mock.calls[0];
    expect([ext, actionId]).toEqual(['buoys', 'open']);
    expect(sel.target).toMatchObject({
      kind: 'overlayFeature',
      featureId: 'b17'
    });
    expect(cmp.overlay().show).toBe(false);
  });

  it('falls through to what lies beneath when no action applies', () => {
    const cmp = bareComponent();
    // 'quiet' is not among the overlays the action is limited to
    click(cmp, [hit(1, { overlayKey: 'buoys/quiet' })], [wptFeature()]);
    expect(cmp.overlay().type).toBe('waypoint');
    expect(cmp.plotterExt.invokeAction).not.toHaveBeenCalled();
  });

  it('never offers another extension’s actions on the feature', () => {
    const cmp = bareComponent({ buoys: [] });
    click(cmp, [hit(17)]);
    // only `other` declares overlayFeature actions, and the overlay is not its
    expect(cmp.overlay().show).toBe(false);
  });

  it('lists it with the map’s features under the pointer, in hit order', () => {
    const cmp = bareComponent();
    click(cmp, [hit(17, { above: 1 })], [wptFeature()]);
    const po = cmp.overlay();
    expect(po.type).toBe('list');
    expect(po.content.map((f: { text: string }) => f.text)).toEqual([
      'Fuel dock',
      'Fowey Rocks'
    ]);
    // choosing it from the list opens its own popover
    cmp.featureListSelection(po.content[1]);
    expect(cmp.overlay().type).toBe('overlayFeature');
    expect(cmp.overlay().target.target.featureId).toBe(17);
  });

  it('lists same-id features of two extensions’ same-named overlays apart', () => {
    const cmp = bareComponent();
    click(cmp, [
      hit(17),
      hit(17, {
        overlayKey: 'other/stations',
        properties: { station: 'Other 17' }
      })
    ]);
    const po = cmp.overlay();
    expect(po.type).toBe('list');
    expect(po.content.map((f: { text: string }) => f.text)).toEqual([
      'Fowey Rocks',
      'Other 17'
    ]);
    cmp.featureListSelection(po.content[1]);
    expect(cmp.overlay().target.owner).toBe('other');
  });

  it('never resolves a list left open to a feature of a later click', () => {
    const cmp = bareComponent({
      buoys: [
        ...manifests['buoys'],
        {
          id: 'open',
          title: 'Open',
          default: true,
          targets: [
            {
              kind: 'overlayFeature',
              match: [{ path: 'properties.kind', op: 'eq', value: 'buoy' }]
            }
          ],
          action: publish
        }
      ]
    });
    click(cmp, [hit(17, { above: 1 })], [wptFeature()]);
    const stale = cmp.overlay().content[1];
    // a later click on another feature, whose default action runs
    click(cmp, [hit(99, { properties: { kind: 'buoy' } })]);
    expect(cmp.plotterExt.invokeAction).toHaveBeenCalledTimes(1);
    // the first list's entry names feature 17, which that click did not hit
    cmp.featureListSelection(stale);
    expect(cmp.plotterExt.invokeAction).toHaveBeenCalledTimes(1);
  });

  it('never mistakes an overlay feature for one of the map’s, whatever its id', () => {
    for (const id of ['waypoint.w1', 'anchor', 'dest.x', 'atons.urn:x']) {
      const cmp = bareComponent({ buoys: [] });
      click(cmp, [hit(id)]);
      expect(cmp.overlay().show).toBe(false);
      expect(cmp.modifyFeature).not.toHaveBeenCalled();

      const offered = bareComponent();
      click(offered, [hit(id)]);
      expect(offered.overlay().type).toBe('overlayFeature');
      expect(offered.overlay().target.target.featureId).toBe(id);
    }
  });
});

describe('FBMapComponent: right-clicking an interactive overlay feature', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const rightClick = (
    cmp: ReturnType<typeof bareComponent>,
    overlayHits: OverlayHit[]
  ) => {
    cmp.onMapRightClick({
      features: [],
      overlayHits,
      lonlat: at,
      worldOffset: 0
    });
    cmp.onContextMenu({
      clientX: 300,
      clientY: 200,
      preventDefault: vi.fn()
    } as unknown as MouseEvent);
  };

  it('offers its actions in the chart menu, headed by its name, before the position’s', () => {
    const cmp = bareComponent();
    rightClick(cmp, [hit(17)]);
    const groups = cmp.contextMenu.menuData.ext;
    expect(
      groups.map((g: { target: SelectedTarget }) => g.target.target.kind)
    ).toEqual(['overlayFeature', 'position']);
    expect(groups[0].target.label).toBe('Fowey Rocks');
    expect(
      groups[0].actions.map((a: { action: { id: string } }) => a.action.id)
    ).toEqual(['details']);
  });

  it('offers no other extension’s actions on it', () => {
    const cmp = bareComponent({ buoys: [] });
    rightClick(cmp, [hit(17)]);
    expect(cmp.contextMenu.menuData.ext).toEqual([]);
  });
});
