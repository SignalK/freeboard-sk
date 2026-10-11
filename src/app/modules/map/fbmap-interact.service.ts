/** Map interactions Service
 * ************************************/
import { computed, inject, Injectable, signal } from '@angular/core';
import { Collection, Feature } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { LineString as OLLineString, Point, Polygon } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import { StyleLike } from 'ol/style/Style';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';

import { FBChart, LineString, Position } from 'src/app/types';
import {
  SKAircraft,
  SKAtoN,
  SKMeteo,
  SKNote,
  SKRegion,
  SKRoute,
  SKVessel,
  SKWaypoint
} from '../skresources';
import { GeoJSONFeature } from 'ol/format/GeoJSON';
import { AlertData } from '../alarms';
import { ActiveRoutePoint } from './route-point-pick';

export interface IPopover {
  id: string;
  type: string;
  icon?: string;
  position: Position;
  /**
   * Render-space offset (EPSG:3857 metres) of the world copy the user clicked
   * in, relative to the primary world. `position` stays canonical (`[-180,180]`);
   * this only shifts where the overlay is *drawn*, so it never leaks into data.
   */
  worldOffset?: number;
  show: boolean;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[];
  featureCount: number;
  resource?: [string, SKRoute | SKWaypoint | SKNote | SKRegion];
  /** The feature a resource set popover shows. */
  resourceSet?: GeoJSONFeature;
  vessel?: SKVessel;
  isSelf?: boolean;
  aton?: SKAtoN;
  meteo?: SKMeteo;
  aircraft?: SKAircraft;
  alarm?: AlertData;
  routePoint?: ActiveRoutePoint;
  s57Feature?: Record<string, string | number>;
  tidal?: { speedLabel: string; directionLabel: string };
  trackHistory?: {
    name: string;
    start?: string;
    end?: string;
    duration?: string;
    at?: string;
    /** The tapped passage as a route (see trackSectionRoute). */
    route?: Position[];
  };
  readOnly: boolean;
}

export interface MeasurementDef {
  coords?: Array<Position>;
  index?: number;
}

/** A Bearing & Distance measurement (#905). */
export interface BearingDistanceDef {
  /** where it is measured from; null = the own vessel, tracked as it moves */
  origin: Position | null;
  /** null until the pointer first gives one */
  target: Position | null;
  /** the target is placed: the measurement stays on the map until dismissed */
  fixed: boolean;
  /**
   * Render-space offset of the world copy the target is in (#572), so its
   * popover is drawn where the user is looking. Never applied to `target`.
   */
  worldOffset: number;
}

export type MeasureType = 'LineString' | 'BearingDistance';

export type SelectionModeDef = 'seedChart';

export interface SelectionResultDef {
  mode: SelectionModeDef;
  bbox?: [Position?, Position?];
  /** The chart whose tile cache the selected area seeds (`seedChart`). */
  data?: FBChart;
}

export type DrawFeatureType = 'waypoint' | 'route' | 'region' | 'note'; // feature type to draw

/**
 * The pending result of a Modify session, consumed when the edit is saved.
 */
export interface DrawFeatureSaveInfo {
  /** Resource id being modified (`<type>.<id>`), or `anchor`. */
  id: string | null;
  /**
   * The edited geometry in lon/lat. Its nesting follows the resource type:
   * a `Position` for a waypoint / note, `Position[]` for a route and
   * `Position[][]` (rings) for a region.
   */
  coords: Position | Position[] | Position[][] | null;
  /** Per-point route metadata, kept aligned with `coords`. */
  coordsMetadata?: Array<{ name?: string; description?: string }>;
}

export interface DrawFeatureInfo {
  resourceType: DrawFeatureType;
  featureType: 'Point' | 'LineString' | 'Polygon';
  /**
   * The feature's geometry coordinates — lon/lat once a draw completes, raw
   * render-space geometry during a modify. Nesting follows `featureType`.
   */
  coordinates: Coordinate | Coordinate[] | Coordinate[][];
  /** Features under the last map click; the set a Modify session edits. */
  features: Collection<Feature> | null;
  forSave: DrawFeatureSaveInfo | null;
  /** Properties carried onto the new resource (e.g. the note group). */
  properties: { group?: string };
  style?: StyleLike; // feature draw style
  name?: string; // display name of the feature being modified (helper title)
}

/**
 * A pre-operation snapshot of a route being modified, used to undo the last
 * vertex operation (move / add / delete) within the current Modify session.
 * Coordinates are in render space (EPSG:3857) — the raw feature geometry — so
 * restoring is a straight `setCoordinates`, world-copy offset and all.
 */
export interface ModifyUndoSnapshot {
  coordinates: Position[];
  coordsMetadata?: Array<{ name?: string; description?: string }>;
}

@Injectable({ providedIn: 'root' })
export class FBMapInteractService {
  // signals
  readonly isMeasuring = signal<boolean>(false);
  readonly isDrawing = signal<boolean>(false);
  readonly isModifying = signal<boolean>(false);
  readonly isBoxSelecting = signal<boolean>(false);

  readonly measurement = signal<MeasurementDef>({
    coords: [],
    index: -1
  });

  readonly bearingDistance = signal<BearingDistanceDef | null>(null);

  readonly selection = signal<SelectionResultDef>({
    mode: null
  });

  private selectionResult: SelectionResultDef;
  public measureGeometryType: MeasureType = 'LineString';

  /** draw interaction data */
  public draw: DrawFeatureInfo = {
    resourceType: null,
    featureType: 'Point',
    coordinates: null,
    features: null,
    forSave: null,
    properties: {}
  };

  /**
   * Undo history for the current route Modify session: pre-operation geometry
   * snapshots, most-recent last. Session-scoped — reset when a draw or modify
   * starts or ends. Route draw uses OpenLayers' own sketch history
   * (`removeLastPoint`) instead, so it is not stacked here.
   */
  private modifyUndoStack: ModifyUndoSnapshot[] = [];
  private readonly undoDepth = signal<number>(0);

  /**
   * Whether an Undo is available in the current interaction: during a route
   * draw once at least one point is placed (OL sketch history), during a modify
   * once at least one vertex operation has been made.
   */
  readonly canUndo = computed<boolean>(() => {
    if (this.isDrawing()) {
      return this.measurement().coords.length >= 1;
    }
    if (this.isModifying()) {
      return this.undoDepth() > 0;
    }
    return false;
  });

  private app = inject(AppFacade);

  constructor() {}

  /** Push a pre-operation snapshot onto the modify undo stack. */
  pushModifyUndo(snapshot: ModifyUndoSnapshot) {
    this.modifyUndoStack.push(snapshot);
    this.undoDepth.set(this.modifyUndoStack.length);
  }

  /** Pop the most recent modify snapshot, or undefined when the stack is empty. */
  popModifyUndo(): ModifyUndoSnapshot | undefined {
    const snap = this.modifyUndoStack.pop();
    this.undoDepth.set(this.modifyUndoStack.length);
    return snap;
  }

  /** Discard all undo history (called when an interaction starts or ends). */
  private clearUndo() {
    this.modifyUndoStack = [];
    this.undoDepth.set(0);
  }

  /** add start coordinate to box select */
  initBoxCoord(coord: Position) {
    if (!this.selectionResult) {
      this.selectionResult = { mode: null };
    }
    this.selectionResult.bbox = [coord];
  }

  /** set coordinates array in measurment data */
  set measurementCoords(value: LineString) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { coords: value });
    });
  }

  /** -1 reports the last leg, otherwise the leg starting at that index */
  set measurementIndex(value: number) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { index: value });
    });
  }

  /**
   * add coordinate to measurment data
   * @param pt location to add
   * @returns added distance in meters
   */
  addMeasurementCoord(pt: Position): number {
    const d = GeoUtils.distanceTo(
      this.measurement().coords[this.measurement().coords.length - 1],
      pt
    );
    this.measurement.update((current) => {
      const c = [].concat(current.coords);
      c.push(pt);
      return Object.assign({}, current, { coords: c });
    });
    return d;
  }

  /**
   * Returns distance to last point in measurment coords array
   * @param pt measure cursor location
   * @returns distance in meters
   */
  distanceFromLastPoint(pt: Position): number {
    if (!pt) {
      return 0;
    }
    if (this.measurement().coords.length > 0) {
      // return distance between last point in array and pt
      return GeoUtils.distanceTo(
        this.measurement().coords[this.measurement().coords.length - 1],
        pt
      );
    } else {
      return 0;
    }
  }

  /** Start measuring mode */
  startMeasuring(geometryType?: MeasureType) {
    this.measureGeometryType = geometryType ?? 'LineString';
    this.app.debug(`startMeasuring()...`);
    if (this.measureGeometryType === 'BearingDistance') {
      this.bearingDistance.set(null);
    }
    this.isMeasuring.set(true);
    this.interactionStarted();
  }

  /** Exit measuring mode. A Bearing & Distance not yet placed is discarded. */
  stopMeasuring() {
    this.app.debug(`stopMeasuring()...`);
    if (this.bearingDistance() && !this.bearingDistance().fixed) {
      this.bearingDistance.set(null);
    }
    this.isMeasuring.set(false);
    this.interactionEnded();
  }

  /**
   * A click / tap while picking a Bearing & Distance: the first sets the
   * origin, the next places the target and ends the interaction, leaving the
   * measurement on the map.
   */
  placeBearingDistancePoint(pt: Position, worldOffset = 0) {
    const bd = this.bearingDistance();
    if (!bd?.origin) {
      this.bearingDistance.set({
        origin: pt,
        target: null,
        fixed: false,
        worldOffset
      });
      return;
    }
    if (pt[0] === bd.origin[0] && pt[1] === bd.origin[1]) {
      return;
    }
    this.bearingDistance.set({ ...bd, target: pt, fixed: true, worldOffset });
    this.stopMeasuring();
  }

  /** Move the target of a Bearing & Distance that is following the pointer. */
  followBearingDistance(pt: Position, worldOffset = 0) {
    const bd = this.bearingDistance();
    if (!bd?.origin || bd.fixed) {
      return;
    }
    this.bearingDistance.set({ ...bd, target: pt, worldOffset });
  }

  /** Move the target of a placed Bearing & Distance (dragged by the user). */
  moveBearingDistanceTarget(pt: Position, worldOffset = 0) {
    const bd = this.bearingDistance();
    if (!bd?.fixed) {
      return;
    }
    this.bearingDistance.set({ ...bd, target: pt, worldOffset });
  }

  /** Show a placed Bearing & Distance from the own vessel to `target`. */
  showBearingDistanceFromVessel(target: Position, worldOffset = 0) {
    this.bearingDistance.set({
      origin: null,
      target,
      fixed: true,
      worldOffset
    });
  }

  /** Remove the Bearing & Distance measurement from the map. */
  clearBearingDistance() {
    this.bearingDistance.set(null);
  }

  /** Start drawing mode */
  startDrawing(resType: DrawFeatureType) {
    this.app.debug(`startDrawing()...`);
    this.isDrawing.set(true);
    this.draw.name = undefined;
    this.draw.resourceType = resType;
    this.draw.featureType =
      resType === 'route'
        ? 'LineString'
        : resType === 'region'
          ? 'Polygon'
          : 'Point';
    this.interactionStarted();
  }

  /** Stop drawing mode */
  stopDrawing(feature?: Feature) {
    this.app.debug(`stopDrawing()...`);
    this.isDrawing.set(false);
    if (feature) {
      switch (this.draw.featureType) {
        case 'Point': // waypoint, note
          this.draw.coordinates = toLonLat(
            (feature.getGeometry() as Point).getCoordinates()
          );
          break;
        case 'LineString': {
          // route
          const rc = (feature.getGeometry() as OLLineString).getCoordinates();
          this.draw.coordinates = rc.map((i) => {
            return toLonLat(i);
          });
          break;
        }
        case 'Polygon': {
          // region
          const p = (feature.getGeometry() as Polygon).getCoordinates();
          if (p.length === 0) {
            this.draw.coordinates = [];
            break;
          }
          this.draw.coordinates = p[0].map((i) => {
            return toLonLat(i);
          });
          break;
        }
      }
    }
    this.interactionEnded();
  }

  /** Start modifying mode */
  startModifying(overlay: Pick<IPopover, 'type'>) {
    this.app.debug(`startModifying()...`);
    if (this.draw.features.getLength() === 0) {
      return;
    }
    this.isModifying.set(true);
    this.draw.name = undefined;
    this.draw.resourceType = overlay.type as DrawFeatureType;
    this.draw.featureType = null;
    this.draw.forSave = { id: null, coords: null };
    this.draw.coordinates = null;
    this.draw.properties = {};
    this.interactionStarted();
  }

  /** Stop modifying mode */
  stopModifying() {
    this.app.debug(`stopModifying()...`);
    this.isModifying.set(false);
    this.draw.features = null;
    this.interactionEnded();
  }

  /**
   * Start box selection mode
   */
  startBoxSelection(mode: SelectionModeDef, data: FBChart) {
    this.app.debug(`startBoxSelection()...`);
    this.selectionResult = {
      mode: mode,
      data: data,
      bbox: []
    };
    this.isBoxSelecting.set(true);
    this.interactionStarted();
  }

  /** Exit measuring mode */
  stopBoxSelection(coords?: Position) {
    this.app.debug(`stopBoxSelection()...`);
    if (coords) {
      this.selectionResult.bbox.push(coords);
      this.formatBbox();
      this.selection.update(() => {
        return this.selectionResult;
      });
    }
    this.isBoxSelecting.set(false);
    this.interactionEnded();
  }

  private formatBbox() {
    if (this.selectionResult.bbox.length !== 2) {
      return;
    }
    const coords = [].concat(this.selectionResult.bbox);
    this.selectionResult.bbox = [
      [
        coords[0][0] < coords[1][0] ? coords[0][0] : coords[1][0],
        coords[0][1] < coords[1][1] ? coords[0][1] : coords[1][1]
      ],
      [
        coords[0][0] > coords[1][0] ? coords[0][0] : coords[1][0],
        coords[0][1] > coords[1][1] ? coords[0][1] : coords[1][1]
      ]
    ];
  }

  /** Common interaction start tasks */
  private interactionStarted() {
    this.app.debug(`interactionStarted()...`);
    this.clearUndo();
    this.measurement.set({
      coords: [],
      index: -1
    });
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: true });
    });
  }

  /** Interaction cleanup tasks */
  private interactionEnded() {
    this.app.debug(`interactionEnded()...`);
    this.clearUndo();
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: false });
    });
    this.measurement.set({
      coords: [],
      index: -1
    });
  }
}
