/*******************************
    GeoUtils Class Module       
*******************************/
import { Convert } from './convert';
import {
  getDistance,
  getPathLength,
  getCenter,
  computeDestinationPoint,
  isPointInPolygon
} from 'geolib';
import { SKPosition, Position } from '../types';

export type Extent = [number, number, number, number]; // coords [swlon,swlat,nelon,nelat] of a bounding box

export class GeoUtils {
  static destCoordinate(
    src: Position,
    bearing: number,
    distance: number
  ): Position {
    const pt = computeDestinationPoint(
      src,
      distance,
      Convert.radiansToDegrees(bearing)
    );
    return [pt.longitude, pt.latitude];
  }

  //** Calculate the great circle distance between two points in metres
  static distanceTo(srcpt: Position, destpt: Position) {
    return getDistance(srcpt, destpt);
  }

  //** Calculate the length of an array of points in metres
  static routeLength(points: Position[]) {
    return getPathLength(points);
  }

  //** Calculate the centre of polygon
  static centreOfPolygon(coords: Array<Position>): Position {
    const c = getCenter(coords) as SKPosition;
    return [c.longitude, c.latitude];
  }

  /** DateLine Crossing:
   * returns true if point is in the zone for dateline transition
   * zoneValue: lower end of 180 to xx range within which Longitude must fall for retun value to be true
   **/
  static inDLCrossingZone(coord: Position, zoneValue = 170) {
    return Math.abs(coord[0]) >= zoneValue ? true : false;
  }

  // returns true if point is inside the supplied extent
  static inBounds(point: Position, extent: Extent) {
    return isPointInPolygon(point, [
      [extent[0], extent[1]],
      [extent[0], extent[3]],
      [extent[2], extent[3]],
      [extent[2], extent[1]],
      [extent[0], extent[1]]
    ]);
  }

  // returns mapified extent centered at point with boundary radius meters from center
  static calcMapifiedExtent(point: Position, radius: number): Extent {
    const latScale = 111111; // 1 deg of lat in meters
    const lonScale = latScale * Math.cos(Convert.degreesToRadians(point[1]));
    const ext: Extent = [0, 0, 0, 0];

    // latitude bounds
    ext[1] = point[1] + (0 - Math.abs(radius)) / latScale;
    ext[3] = point[1] + Math.abs(radius) / latScale;
    // longitude bounds
    ext[0] = point[0] + (0 - Math.abs(radius)) / lonScale;
    ext[2] = point[0] + Math.abs(radius) / lonScale;
    return ext;
  }

  // ensure -180<coords<180
  static normaliseCoords(coords: Position); // Point
  static normaliseCoords(coords: Array<Position>); //LineString
  static normaliseCoords(coords: Array<Array<Position>>); // MultiLineString
  static normaliseCoords(coords) {
    if (!Array.isArray(coords)) {
      return [0, 0];
    }
    if (typeof coords[0] === 'number') {
      if (coords[0] > 180) {
        while (coords[0] > 180) {
          coords[0] = coords[0] - 360;
        }
      } else if (coords[0] < -180) {
        while (coords[0] < -180) {
          coords[0] = 360 + coords[0];
        }
      }
      return coords;
    } else if (Array.isArray(coords[0])) {
      coords.forEach((c) => (c = this.normaliseCoords(c)));
      return coords;
    }
  }
}

export class Angle {
  /** difference between two angles (in degrees)
   * @param h: angle 1 (in degrees)
   * @param b: angle 2 (in degrees)
   * @returns angle (-ive = port)
   */
  static difference(h: number, b: number): number {
    const d = 360 - b;
    const hd = h + d;
    const a = Angle.normalise(hd);
    return a < 180 ? 0 - a : 360 - a;
  }

  /** Add two angles (in degrees)
   * @param h: angle 1 (in degrees)
   * @param b: angle 2 (in degrees)
   * @returns sum angle
   */
  static add(h: number, b: number): number {
    return Angle.normalise(h + b);
  }

  /** Normalises angle to a value between 0 & 360 degrees
   * @param a: angle (in degrees)
   * @returns value between 0-360
   */
  static normalise(a: number): number {
    return a < 0 ? a + 360 : a >= 360 ? a - 360 : a;
  }
}
