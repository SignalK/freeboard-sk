import {
  PointFeature,
  LineStringFeature,
  MultiLineStringFeature,
  PolygonFeature,
  MultiPolygonFeature
} from './geojson';
import type { TimeDef } from 'src/app/modules/skresources/components/charts/maplib';

// *** Freeboard defined RESOURCE types

export type Tracks = { [id: string]: TrackResource };

export interface TrackResource {
  feature: MultiLineStringFeature;
}

export type ResourceSets = { [id: string]: ResourceSet };

export interface ResourceSet extends CustomResource {
  type: 'ResourceSet';
  styles?: CustomStyles;
  values: {
    type: 'FeatureCollection';
    features: Array<
      | PointFeature
      | LineStringFeature
      | MultiLineStringFeature
      | PolygonFeature
      | MultiPolygonFeature
    >;
  };
}

/**
 * Legacy Overlays (`infolayers` collection, Freeboard 2.19 – 3.1). Overlays
 * were folded into charts (#784): entries are read only, to be adopted as
 * charts and migrated to chart resources -- see `lib/overlay-charts.ts`.
 * Nothing creates or updates one any more.
 */
export type InfoLayers = { [id: string]: InfoLayerResource };

export interface InfoLayerResource extends CustomResource {
  name: string;
  description: string;
  type: 'InfoLayer';
  values: {
    url: string;
    sourceType: 'WMTS' | 'WMS';
    layers: string[];
    opacity: number;
    minZoom: number;
    maxZoom: number;
    refreshInterval?: number;
    // time dimension parsed from the source's capabilities
    time?: TimeDef;
  };
}

export type CustomResources = { [id: string]: CustomResource };

export interface CustomResource {
  id?: string;
  name?: string | null;
  description?: string | null;
  type: string;
  values: { [key: string]: unknown };
}

export interface CustomStyles {
  default?: CustomStyle;
  [key: string]: CustomStyle;
}

export interface CustomStyle {
  stroke: string;
  fill: string;
  width: number;
  lineDash?: Array<number>;
}
