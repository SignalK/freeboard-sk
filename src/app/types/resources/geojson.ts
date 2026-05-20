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

export type PointFeature = Feature & {
  geometry: {
    type: 'Point';
    coordinates: Position;
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
