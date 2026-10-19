import type { GeoJsonProperties } from 'geojson';

export type Position = [number, number, number?]; // [lon,lat, alt]
export type LineString = Position[];
export type MultiLineString = LineString[];
export type Polygon = MultiLineString;
export type MultiPolygon = Polygon[];

interface Feature {
  type: 'Feature';
  properties?: GeoJsonProperties;
  id?: string;
}

export type PointFeature = Feature & {
  geometry: {
    type: 'Point';
    coordinates: Position;
  };
};

export type MultiPointFeature = Feature & {
  geometry: {
    type: 'MultiPoint';
    coordinates: Position[];
  };
};

export type LineStringFeature = Feature & {
  geometry: {
    type: 'LineString';
    coordinates: LineString;
  };
};

export type MultiLineStringFeature = Feature & {
  geometry: {
    type: 'MultiLineString';
    coordinates: MultiLineString;
  };
};

export type PolygonFeature = Feature & {
  geometry: {
    type: 'Polygon';
    coordinates: Polygon;
  };
};

export type MultiPolygonFeature = Feature & {
  geometry: {
    type: 'MultiPolygon';
    coordinates: MultiPolygon;
  };
};

/** A region's feature: one polygon, or several. */
export type PolygonalFeature = Feature & {
  geometry: PolygonFeature['geometry'] | MultiPolygonFeature['geometry'];
};
