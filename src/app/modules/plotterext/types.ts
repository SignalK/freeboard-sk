// Types for the plotter extension host (plotterExtensions resource type).
// Mirrors the plotter extension provider specification. Declared locally so
// the branch does not depend on a server-api release.

export const PLOTTER_EXTENSIONS_RESOURCE = 'plotterExtensions';

/** Host API major version implemented by this Freeboard build. */
export const HOST_API_VERSION = '1';

/** Capabilities advertised by this host build. */
export const HOST_CAPABILITIES = [
  'widgets',
  'panels.iframe',
  'buttons',
  'signalk.stream',
  'signalk.put',
  'units',
  'map',
  'resources',
  'resources.filter',
  'routes',
  'background.iframe',
  'ui'
];

export type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2';

/**
 * Widget anchor areas. The upper-left corner is deliberately not offered —
 * Freeboard's own controls live there.
 */
export type AnchorId = 'tr' | 'ct' | 'cb' | 'bl' | 'br';

export const ANCHORS: AnchorId[] = ['tr', 'ct', 'cb', 'bl', 'br'];

export const ANCHOR_LABELS: Record<AnchorId, string> = {
  tr: 'Top right',
  ct: 'Top center',
  cb: 'Bottom center',
  bl: 'Bottom left',
  br: 'Bottom right'
};

/**
 * Vertical packing direction: widgets build from the screen edge of their
 * anchor inward ("bottom up" for bottom anchors, top down for top anchors).
 * The gravity row must fill before a widget may sit in the other row.
 */
export const ANCHOR_GRAVITY: Record<AnchorId, 'top' | 'bottom'> = {
  tr: 'top',
  ct: 'top',
  cb: 'bottom',
  bl: 'bottom',
  br: 'bottom'
};

/**
 * Per-anchor grid dimensions (cols x rows). Corners are 4 wide so up to eight
 * 1x1 (or four 2x1) widgets can stack there; the center anchors stay 2 wide.
 * Rows are 2 everywhere — widgets are never taller than the gravity stack.
 */
export const ANCHOR_GRID: Record<AnchorId, { cols: number; rows: number }> = {
  tr: { cols: 4, rows: 2 },
  ct: { cols: 2, rows: 2 },
  cb: { cols: 2, rows: 2 },
  bl: { cols: 4, rows: 2 },
  br: { cols: 4, rows: 2 }
};

/** Horizontal packing direction per anchor (toward the screen corner first). */
const ANCHOR_COL_FILL: Record<AnchorId, 'left' | 'right'> = {
  tr: 'right',
  ct: 'left',
  cb: 'left',
  bl: 'left',
  br: 'right'
};

/**
 * Preferred column fill order per anchor (toward the screen corner first),
 * derived from the anchor's width and packing direction.
 */
export const ANCHOR_COL_ORDER: Record<AnchorId, number[]> = ANCHORS.reduce(
  (acc, anchor) => {
    const cols = Array.from({ length: ANCHOR_GRID[anchor].cols }, (_, i) => i);
    acc[anchor] = ANCHOR_COL_FILL[anchor] === 'right' ? cols.reverse() : cols;
    return acc;
  },
  {} as Record<AnchorId, number[]>
);

export interface WidgetContribution {
  id: string;
  title: string;
  type: 'iframe';
  url: string;
  size: WidgetSize;
  configPanel?: string;
  lifecycle?: string;
  apiVersion?: string;
}

export interface ButtonContribution {
  id: string;
  title: string;
  slot?: string;
  /** Material icon name rendered by this host (generic `symbol` refs TBD). */
  icon?: string;
  symbol?: string;
  /**
   * Button action. `openPanel`/`togglePanel` target a `panel` from the same
   * manifest. `sendMessage` publishes `topic` (with optional `params`) onto
   * the host message bus, delivered to every live extension context
   * subscribed to that topic (typically the extension's own background
   * runtime).
   */
  action?: { type: string; panel?: string; topic?: string; params?: unknown };
  apiVersion?: string;
}

export interface ResourceFilterCondition {
  path: string;
  op:
    | 'eq'
    | 'ne'
    | 'lt'
    | 'lte'
    | 'gt'
    | 'gte'
    | 'in'
    | 'contains'
    | 'regex'
    | 'exists';
  value?: unknown;
  /**
   * For eq/ne/in: when true, compare strictly and skip the namespace-tolerant
   * symbol-reference matching (so `anchorage` will NOT match `default:anchorage`).
   * Absent/false keeps the tolerant default. Ignored by other ops.
   */
  exact?: boolean;
}

export interface ResourceFilterSpec {
  mode: 'include' | 'exclude';
  ids?: string[];
  match?: ResourceFilterCondition[];
  label?: string;
}

/**
 * A headless background runtime: a hidden iframe loaded while the extension is
 * present, with no UI. It runs the same bus client as widgets/panels and may
 * call the host API (state, signalk, resources, filters, map), letting a panel
 * close itself while a client-side service keeps state and work alive.
 */
export interface BackgroundContribution {
  id: string;
  title?: string;
  type: 'iframe';
  url: string;
  lifecycle?: string;
  apiVersion?: string;
}

export interface PanelContribution {
  id: string;
  title: string;
  type: 'iframe' | 'customElement';
  url?: string;
  moduleUrl?: string;
  tagName?: string;
  lifecycle?: string;
  apiVersion?: string;
}

export interface PlotterExtensionManifest {
  name: string;
  description?: string;
  version?: string;
  apiVersion: string;
  requires?: string[];
  optional?: string[];
  widgets?: WidgetContribution[];
  panels?: PanelContribution[];
  buttons?: ButtonContribution[];
  background?: BackgroundContribution[];
  // Future contribution sections (buttons, background, resourceFilters) are
  // tolerated but not consumed by this build.
  [key: string]: unknown;
}

/** A widget placement persisted in app config (see IAppConfig). */
export interface PlacedWidget {
  instanceId: string;
  extension: string;
  widget: string;
  anchor: AnchorId;
  col: number;
  row: number;
}

/** A widget that could be added at a pressed anchor cell. */
export interface WidgetCandidate {
  extension: string;
  extensionName: string;
  widget: WidgetContribution;
  origin: { col: number; row: number };
}

/** Grid gap in px. Keep in sync with --pe-gap in the overlay component. */
export const WIDGET_CELL_GAP = 6;

/**
 * Widget cell height in px for the current viewport. Keep in sync with
 * --pe-cell-h (clamp(84px, 9.5vw, 124px)) in the overlay component.
 */
export function cellHeightPx(): number {
  return Math.min(124, Math.max(84, 0.095 * window.innerWidth));
}

export function parseSize(size: WidgetSize | string): {
  cols: number;
  rows: number;
} {
  const m = /^([12])x([12])$/.exec(size ?? '');
  if (!m) return { cols: 1, rows: 1 };
  return { cols: Number(m[1]), rows: Number(m[2]) };
}
