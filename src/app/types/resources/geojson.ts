export type Position = [number, number, number?]; // [lon,lat, alt]
export type LineString = Position[];
export type MultiLineString = LineString[];
export type Polygon = MultiLineString;
export type MultiPolygon = Polygon[];

interface Feature {
  type: 'Feature';
  properties?: { [key: string]: any };
  id?: string;
}

export interface PointFeature extends Feature {
  geometry: {
    type: 'Point';
    coordinates: Position;
  };
}

export interface LineStringFeature extends Feature {
  geometry: {
    type: 'LineString';
    coordinates: LineString;
  };
}

export interface MultiLineStringFeature extends Feature {
  geometry: {
    type: 'MultiLineString';
    coordinates: MultiLineString;
  };
}

export interface PolygonFeature extends Feature {
  geometry: {
    type: 'Polygon';
    coordinates: Polygon;
  };
}

export interface MultiPolygonFeature {
  geometry: {
    type: 'MultiPolygon';
    coordinates: MultiPolygon;
  };
}
