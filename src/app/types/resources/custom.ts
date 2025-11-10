import {
  PointFeature,
  LineStringFeature,
  MultiLineStringFeature,
  PolygonFeature,
  MultiPolygonFeature
} from './geojson';

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
    time?: {
      values: string[];
      timeOffset?: number; // Hours back from most recent (0 = current, -6 = 6 hours ago)
    };
  };
}

export type CustomResources = { [id: string]: CustomResource };

export interface CustomResource {
  id?: string;
  name?: string | null;
  description?: string | null;
  type: string;
  values: { [key: string]: any };
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
