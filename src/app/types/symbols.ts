export const SYMBOL_RESOURCE_TYPE = 'symbols' as const;

export type SymbolRole =
  | 'note'
  | 'waypoint'
  | 'region'
  | 'button'
  | 'alert'
  | 'logbook'
  | 'map-marker'
  | 'vector-style-icon'
  | string;

export interface SymbolDefinition {
  /** Immutable symbol identifier. */
  uuid: string;
  /** One or more canonical "namespace:id" references. */
  alias: string[];
  name: string;
  description?: string;
  mediaType: 'image/svg+xml';
  url: string;
  roles?: SymbolRole[];
  tags?: string[];
  scale?: number;
  anchor?: [number, number];
  /** Mapping to a GPX waypoint `<type>` value (GPX import/export). */
  gpxType?: string;
  /** Mapping to a GPX waypoint `<sym>` value (GPX import/export). */
  gpxSym?: string;
}

export interface SymbolResource extends SymbolDefinition {
  $source?: string;
  timestamp?: string;
}

export type SymbolReference = string; // "namespace:id"
