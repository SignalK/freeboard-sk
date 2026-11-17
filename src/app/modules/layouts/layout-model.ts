// Named widget layouts (#1346).
//
// A layout is the widgets on the map (`plotterExtensions.widgets`) plus their
// instance settings (`plotterExtensions.state[ext].instances`). Each screen
// keeps its own *working copy* in this browser. Named layouts are kept on the
// server, per boat, as the `freeboardLayouts` resource type served by
// Freeboard's server plugin; a working copy may be linked to one of them.

import type { IAppConfig, PlotterExtensionWidget } from 'src/app/types';

export const LAYOUTS_RESOURCE_TYPE = 'freeboardLayouts';

/** The layout a screen with no widgets of its own starts on. */
export const DEFAULT_LAYOUT_NAME = 'Default';

/** Instance settings, by extension, then by widget instance. */
export type InstanceStates = Record<
  string,
  Record<string, Record<string, unknown>>
>;

export interface LayoutContent {
  widgets: PlotterExtensionWidget[];
  instances: InstanceStates;
}

/** A named layout as the server keeps it. */
export interface SavedLayout extends LayoutContent {
  name: string;
  revision: number;
  updated?: string;
}

/** The named layout a working copy was loaded from or last saved to. */
export interface LayoutLink {
  id: string;
  name: string;
  revision: number;
  /** The layout's content at that revision: the copy is modified when it differs. */
  base: LayoutContent;
}

export interface WorkingCopy {
  content: LayoutContent;
  link: LayoutLink | null;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A widget's column or row: a non-negative integer. */
const isCell = (v: unknown): v is number =>
  Number.isInteger(v) && Number(v) >= 0;

const isWidget = (v: unknown): v is PlotterExtensionWidget =>
  isObject(v) &&
  typeof v.instanceId === 'string' &&
  typeof v.extension === 'string' &&
  typeof v.widget === 'string' &&
  typeof v.anchor === 'string' &&
  isCell(v.col) &&
  isCell(v.row);

/** Keys that would reach an object's prototype when assigned. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Instance settings, keeping only well-formed entries. */
function parseInstances(value: unknown): InstanceStates {
  const result: InstanceStates = {};
  if (!isObject(value)) return result;
  for (const [extension, byInstance] of Object.entries(value)) {
    if (!isObject(byInstance) || UNSAFE_KEYS.has(extension)) continue;
    for (const [instanceId, values] of Object.entries(byInstance)) {
      if (!isObject(values) || UNSAFE_KEYS.has(instanceId)) continue;
      (result[extension] = result[extension] ?? {})[instanceId] = values;
    }
  }
  return result;
}

/** Layout content from storage or the server, or null if it isn't one. */
export function parseContent(value: unknown): LayoutContent | null {
  if (!isObject(value) || !Array.isArray(value.widgets)) return null;
  return {
    widgets: value.widgets.filter(isWidget),
    instances: parseInstances(value.instances)
  };
}

/** A named layout from the server, or null if it isn't one. */
export function parseSavedLayout(value: unknown): SavedLayout | null {
  const content = parseContent(value);
  if (!content || !isObject(value)) return null;
  if (typeof value.name !== 'string' || typeof value.revision !== 'number') {
    return null;
  }
  return {
    ...content,
    name: value.name,
    revision: value.revision,
    updated: typeof value.updated === 'string' ? value.updated : undefined
  };
}

/** A working copy read back from this browser, or null if it isn't one. */
export function parseWorkingCopy(value: unknown): WorkingCopy | null {
  if (!isObject(value)) return null;
  const content = parseContent(value.content);
  if (!content) return null;
  let link: LayoutLink | null = null;
  const l = value.link;
  if (
    isObject(l) &&
    typeof l.id === 'string' &&
    typeof l.name === 'string' &&
    typeof l.revision === 'number'
  ) {
    const base = parseContent(l.base);
    if (base) {
      link = { id: l.id, name: l.name, revision: l.revision, base };
    }
  }
  return { content, link };
}

/** The layout the config holds: its widgets and their instance settings. */
export function contentOf(config: IAppConfig): LayoutContent {
  const ext = config.plotterExtensions;
  const placed = new Set(ext.widgets.map((w) => w.instanceId));
  const instances: InstanceStates = {};
  for (const [extension, store] of Object.entries(ext.state ?? {})) {
    for (const [instanceId, values] of Object.entries(store.instances ?? {})) {
      // settings of a widget no longer placed are not part of the layout
      if (placed.has(instanceId) && Object.keys(values).length) {
        (instances[extension] = instances[extension] ?? {})[instanceId] =
          values;
      }
    }
  }
  return structuredClone({ widgets: ext.widgets, instances });
}

/**
 * Put a layout into the config: its widgets replace the config's, and its
 * instance settings replace every extension's. Extension-wide settings belong
 * to the user, not the layout, and stay.
 */
export function applyContent(config: IAppConfig, content: LayoutContent) {
  const copy = structuredClone(content);
  const ext = config.plotterExtensions;
  ext.widgets = copy.widgets;
  const state = (ext.state = ext.state ?? {});
  for (const extension of new Set([
    ...Object.keys(state),
    ...Object.keys(copy.instances)
  ])) {
    const kept = state[extension] ?? {};
    const instances = copy.instances[extension];
    state[extension] = {
      ...(kept.extension && { extension: kept.extension }),
      ...(instances && { instances })
    };
    if (!state[extension].extension && !state[extension].instances) {
      delete state[extension];
    }
  }
}

/**
 * The same widgets and settings under new instance ids, so a layout saved as
 * new shares nothing an extension keeps by instance id with the original.
 */
export function withNewIds(
  content: LayoutContent,
  newId: (instanceId: string) => string
): LayoutContent {
  const ids = new Map(
    content.widgets.map((w) => [w.instanceId, newId(w.instanceId)])
  );
  const instances: InstanceStates = {};
  for (const [extension, states] of Object.entries(content.instances)) {
    instances[extension] = Object.fromEntries(
      Object.entries(states)
        .filter(([id]) => ids.has(id))
        .map(([id, state]) => [ids.get(id)!, structuredClone(state)])
    );
  }
  return {
    widgets: content.widgets.map((w) => ({
      ...structuredClone(w),
      instanceId: ids.get(w.instanceId)!
    })),
    instances
  };
}

/** JSON with object keys sorted, so equal content compares equal. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    isObject(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]])
        )
      : v
  );
}

/** Same widgets, in any order, with the same settings. */
export function sameContent(a: LayoutContent, b: LayoutContent): boolean {
  const byId = (c: LayoutContent) =>
    [...c.widgets].sort((x, y) => x.instanceId.localeCompare(y.instanceId));
  return (
    canonical(byId(a)) === canonical(byId(b)) &&
    canonical(a.instances) === canonical(b.instances)
  );
}

/** A linked copy that no longer matches the layout it came from. */
export function isModified(copy: WorkingCopy | null): boolean {
  return !!copy?.link && !sameContent(copy.content, copy.link.base);
}

/** The layout named "Default" (any case), the latest saved if several are. */
export function findDefault(
  layouts: Record<string, SavedLayout>
): [string, SavedLayout] | undefined {
  return Object.entries(layouts)
    .filter(
      ([, l]) =>
        l.name.trim().toLowerCase() === DEFAULT_LAYOUT_NAME.toLowerCase()
    )
    .sort(([, a], [, b]) => (b.updated ?? '').localeCompare(a.updated ?? ''))
    .at(0);
}

/** A layout with this name (any case), if there is one. */
export function findByName(
  layouts: Record<string, SavedLayout>,
  name: string
): [string, SavedLayout] | undefined {
  const wanted = name.trim().toLowerCase();
  return Object.entries(layouts).find(
    ([, l]) => l.name.trim().toLowerCase() === wanted
  );
}
