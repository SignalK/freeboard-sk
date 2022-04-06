import { Map } from 'ol';
import { MapService } from './map.service';

/* enum types */

export enum LayerType {
  IMAGE,
  TILE,
  VECTOR_TILE,
  VECTOR,
}

export enum SourceType {
  BINGMAPS,
  CARTODB,
  CLUSTER,
  IMAGE,
  IMAGEARCGISREST,
  IMAGECANVAS,
  IMAGEMAPGUIDE,
  IMAGESTATIC,
  IMAGEVECTOR,
  IMAGEWMS,
  OSM,
  RASTER,
  STAMEN,
  TILEARCGISREST,
  TILEDEBUG,
  TILEIMAGE,
  TILEJSON,
  TILEUTFGRID,
  TILEWMS,
  URLTILE,
  VECTOR,
  VECTORTILE,
  WMTS,
  XYZ,
  ZOOMIFY,
}

/* interface types */
export type Coordinate = [number, number, number?];

export type Extent = [number, number, number, number];

export interface MapReadyEvent {
  map: Map;
  mapService: MapService;
}
