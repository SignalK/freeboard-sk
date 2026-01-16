/** Map interactions Service
 * ************************************/
import { Injectable, signal } from '@angular/core';
import { Feature } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { toLonLat } from 'ol/proj';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';

import { LineString, Position } from 'src/app/types';
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

export interface IPopover {
  id: string;
  type: string;
  icon?: string;
  position: Position;
  show: boolean;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[];
  featureCount: number;
  resource?:
    | [string, SKRoute | SKWaypoint | SKNote | SKRegion]
    | GeoJSONFeature;
  vessel?: SKVessel;
  isSelf?: boolean;
  aton?: SKAtoN;
  meteo?: SKMeteo;
  aircraft?: SKAircraft;
  alarm?: AlertData;
  readOnly: boolean;
}

export interface MeasurementDef {
  coords?: Array<Position>;
  index?: number;
  center?: Position;
  radius?: number;
}

export type SelectionModeDef = 'seedChart';

export interface SelectionResultDef {
  mode: SelectionModeDef;
  bbox?: [Position?, Position?];
  data?: any;
}

export type DrawFeatureType = 'waypoint' | 'route' | 'region' | 'note'; // feature type to draw

export interface DrawFeatureInfo {
  resourceType: DrawFeatureType;
  featureType: 'Point' | 'LineString' | 'Polygon';
  coordinates: any[];
  features: any;
  forSave: any;
  properties: { [key: string]: any };
  style?: any; // feature draw style
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
    index: -1,
    center: null,
    radius: 0
  });

  readonly selection = signal<SelectionResultDef>({
    mode: null
  });

  private selectionResult: SelectionResultDef;
  public measureGeometryType: 'LineString' | 'Circle' = 'LineString';

  /** draw interaction data */
  public draw: DrawFeatureInfo = {
    resourceType: null,
    featureType: 'Point',
    coordinates: null,
    features: null,
    forSave: null,
    properties: {}
  };

  constructor(private app: AppFacade) {}

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

  /** set center position in measurment data */
  set measurementCenter(value: Position) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { center: value });
    });
  }

  /** set radius in measurment data */
  set measurementRadius(value: number) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { radius: value });
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

  /**
   * Returns distance to measurment.center
   * @param pt measure cursor location
   * @returns distance in meters
   */
  distanceFromCenter(pt: Position): number {
    if (!pt || !this.measurement().center) {
      return 0;
    }
    return GeoUtils.distanceTo(this.measurement().center, pt);
  }

  /**
   * Start measuring mode
   * @param fromVessel true = distance is measured from vessel to cursor, false = line measure
   */
  startMeasuring(geometryType?: 'LineString' | 'Circle', fromVessel?: boolean) {
    this.measureGeometryType = geometryType ?? 'LineString';
    this.app.debug(`startMeasuring()...`);
    this.isMeasuring.set(true);
    this.interactionStarted();
  }

  /** Exit measuring mode */
  stopMeasuring() {
    this.app.debug(`stopMeasuring()...`);
    this.isMeasuring.set(false);
    this.interactionEnded();
  }

  /** Start drawing mode */
  startDrawing(resType: DrawFeatureType) {
    this.app.debug(`startDrawing()...`);
    this.isDrawing.set(true);
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
            (feature.getGeometry() as any).getCoordinates()
          );
          break;
        case 'LineString': // route
          const rc = (feature.getGeometry() as any).getCoordinates();
          this.draw.coordinates = rc.map((i: Coordinate) => {
            return toLonLat(i);
          });
          break;
        case 'Polygon': // region
          const p = (feature.getGeometry() as any).getCoordinates();
          if (p.length === 0) {
            this.draw.coordinates = [];
          }
          this.draw.coordinates = p[0].map((i: Coordinate) => {
            return toLonLat(i);
          });
          break;
      }
    }
    this.interactionEnded();
  }

  /** Start modifying mode */
  startModifying(overlay: IPopover) {
    this.app.debug(`startModifying()...`);
    if (this.draw.features.getLength() === 0) {
      return;
    }
    this.isModifying.set(true);
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
  startBoxSelection(mode: SelectionModeDef, data: any) {
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
    this.measurement.set({
      coords: [],
      index: -1,
      center: null,
      radius: 0
    });
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: true });
    });
  }

  /** Interaction cleanup tasks */
  private interactionEnded() {
    this.app.debug(`interactionEnded()...`);
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: false });
    });
    this.measurement.set({
      coords: [],
      index: -1,
      center: null,
      radius: 0
    });
  }
}
