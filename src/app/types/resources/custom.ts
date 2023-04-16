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
export type CustomResources = { [id: string]: CustomResource };

export interface CustomResource {
  id?: string;
  name?: string | null;
  description?: string | null;
  type: string;
  styles: CustomStyles;
  values: CustomValues;
}

export interface CustomValues {
  type: string;
  features: Array<any>;
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
