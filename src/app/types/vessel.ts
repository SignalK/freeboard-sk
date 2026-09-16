// ** Signal K vessel data shapes (full model + delta-derived maps) **

import { SKPosition } from './resources/signalk';

/**
 * A vessel registration entry (`registrations.national.*` etc.) per the
 * Signal K specification.
 */
export interface SKRegistration {
  registration: string;
  description?: string;
}

/** `registrations` per the Signal K specification (vessel identity). */
export interface SKRegistrations {
  imo?: string;
  national?: Record<string, SKRegistration>;
  local?: Record<string, SKRegistration>;
  other?: Record<string, SKRegistration>;
}

/**
 * `navigation.course.calcValues.*` as received from the server, keyed by the
 * path remainder (e.g. `distance`, `route.distance`). Times are ISO strings;
 * everything else is an SI number. Paths not listed here are retained as-is.
 */
export interface SKCourseCalcs {
  crossTrackError?: number;
  bearingTrue?: number;
  bearingMagnetic?: number;
  velocityMadeGood?: number;
  distance?: number;
  timeToGo?: number;
  estimatedTimeOfArrival?: string | null;
  'route.distance'?: number;
  'route.timeToGo'?: number;
  'route.estimatedTimeOfArrival'?: string | null;
  [path: string]: number | string | null;
}

/** `design.*` values Freeboard reads (SI units), null until received. */
export interface SKVesselDesign {
  airHeight: number | null;
  beam: number | null;
  draft: {
    current?: number | null;
    maximum?: number | null;
    minimum?: number;
    canoe?: number;
  } | null;
  length: {
    overall?: number;
    hull?: number;
    waterline?: number;
  } | null;
}

/** A leaf of the full Signal K model: the value plus its provenance. */
export interface SKValueNode<T> {
  value: T;
  timestamp?: string;
  $source?: string;
}

/**
 * The full-model vessel returned by the REST API (`/vessels/<id>`), limited
 * to the branches Freeboard reads.
 */
export interface SKVesselResponse {
  mmsi?: string;
  name?: string;
  flag?: SKValueNode<string>;
  port?: SKValueNode<string>;
  registrations?: SKRegistrations;
  communication?: {
    callsignVhf?: string;
    callsignHf?: string;
  };
  design?: {
    aisShipType?: SKValueNode<{ id: number; name: string }>;
    length?: SKValueNode<SKVesselDesign['length']>;
    beam?: SKValueNode<SKVesselDesign['beam']>;
    draft?: SKValueNode<SKVesselDesign['draft']>;
    airHeight?: SKValueNode<SKVesselDesign['airHeight']>;
  };
  navigation?: {
    position?: SKValueNode<SKPosition>;
    state?: SKValueNode<string>;
    destination?: {
      commonName?: SKValueNode<string>;
      eta?: SKValueNode<string>;
    };
  };
}
