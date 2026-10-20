// Map actions (capability `actions`): manifest actions offered on targets the
// user selects on the chart. This module holds the parts that need no Angular:
// which manifest actions are usable, and which apply to a target. See the
// Plotter Extensions API spec, "Actions".

import type {
  ActionInvocation,
  MapTarget,
  OverlayFeatureTarget,
  TargetKind,
  VesselTarget
} from 'signalk-plotterext-bus/host';
import type { ActionContribution, ResourceFilterCondition } from './types';
import { evalCondition, isValidFilterCondition } from './filter-condition';

export type {
  ActionInvocation,
  MapTarget,
  TargetKind
} from 'signalk-plotterext-bus/host';

/**
 * A target and the data its `match` conditions are evaluated against: the
 * stored resource for a waypoint, note, route or region; `{ name }` for a
 * draft route; `{ name, description }` for a track; the target itself for a
 * chart feature; `{ id, properties }` for an overlay feature. The match data
 * is the host's own and is never delivered.
 */
export interface SelectedTarget {
  target: MapTarget;
  match?: unknown;
  /**
   * The extension whose overlay an overlay feature belongs to: only that
   * extension's target entries apply to it.
   */
  owner?: string;
}

/** The kinds this host offers actions on. */
export const OFFERED_TARGET_KINDS: ReadonlySet<string> = new Set<TargetKind>([
  'position',
  'waypoint',
  'note',
  'route',
  'track',
  'region',
  'vessel',
  'aton',
  'chartFeature',
  'overlayFeature'
]);

/** The kinds a target entry may narrow with `match`. */
const MATCH_KINDS = new Set<string>([
  'waypoint',
  'note',
  'route',
  'track',
  'region',
  'chartFeature',
  'overlayFeature'
]);

/** The `action` types an action may take (a button's), by what they need. */
const PANEL_TYPES = new Set([
  'openPanel',
  'togglePanel',
  'openWindow',
  'toggleWindow'
]);
const PUBLISH_TYPES = new Set(['publish', 'sendMessage']);

/**
 * Whether choosing the action can do anything: a publish names its topic, a
 * panel or window type names a panel `hasPanel` can show.
 */
function performable(
  action: ActionContribution['action'],
  hasPanel: (panel: string) => boolean
): boolean {
  if (!action) return false;
  if (PUBLISH_TYPES.has(action.type)) {
    return typeof action.topic === 'string' && action.topic.length > 0;
  }
  return (
    PANEL_TYPES.has(action.type) &&
    typeof action.panel === 'string' &&
    hasPanel(action.panel)
  );
}

/** A target entry this host can use. */
export interface TargetRule {
  kind: TargetKind;
  match?: ResourceFilterCondition[];
  self?: boolean;
  /** `overlayFeature`: the declaring extension's overlay ids it is limited to. */
  overlays?: string[];
}

/**
 * Read one entry of `targets`, or null when this host ignores it: a kind it
 * does not offer, or one narrowed with a field that kind does not take or
 * with a malformed value.
 */
export function parseTargetEntry(entry: unknown): TargetRule | null {
  if (typeof entry === 'string') {
    return OFFERED_TARGET_KINDS.has(entry)
      ? { kind: entry as TargetKind }
      : null;
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }
  const e = entry as Record<string, unknown>;
  if (typeof e.kind !== 'string' || !OFFERED_TARGET_KINDS.has(e.kind)) {
    return null;
  }
  const rule: TargetRule = { kind: e.kind as TargetKind };
  if (e.match !== undefined) {
    if (
      !MATCH_KINDS.has(rule.kind) ||
      !Array.isArray(e.match) ||
      !e.match.every(isValidFilterCondition)
    ) {
      return null;
    }
    rule.match = e.match as ResourceFilterCondition[];
  }
  if (e.self !== undefined) {
    if (rule.kind !== 'vessel' || typeof e.self !== 'boolean') return null;
    rule.self = e.self;
  }
  if (e.overlays !== undefined) {
    if (
      rule.kind !== 'overlayFeature' ||
      !Array.isArray(e.overlays) ||
      !e.overlays.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    rule.overlays = e.overlays as string[];
  }
  return rule;
}

/** A manifest action this host can offer, with its usable target entries. */
export interface UsableAction {
  extension: string;
  extensionName: string;
  action: ActionContribution;
  rules: TargetRule[];
}

/**
 * The actions of one manifest this host can offer, in manifest order. An
 * action that lacks a required field, cannot be performed (an unknown action
 * type, a publish without a topic, a panel `hasPanel` does not know), targets
 * a newer host API, or has no target entry the host can use is left out. A
 * repeated id keeps its first action.
 */
export function usableActions(
  extension: string,
  extensionName: string,
  actions: unknown,
  hostApiVersion: string,
  hasPanel: (panel: string) => boolean
): UsableAction[] {
  if (!Array.isArray(actions)) return [];
  const result: UsableAction[] = [];
  const seen = new Set<string>();
  for (const a of actions as ActionContribution[]) {
    if (!a || typeof a !== 'object') continue;
    if (typeof a.id !== 'string' || !a.id || seen.has(a.id)) continue;
    if (typeof a.title !== 'string' || !a.title.trim()) continue;
    if (!Array.isArray(a.targets)) continue;
    if (!performable(a.action, hasPanel)) continue;
    if (a.apiVersion !== undefined && a.apiVersion !== hostApiVersion) continue;
    const rules = a.targets
      .map(parseTargetEntry)
      .filter((r): r is TargetRule => r !== null);
    if (!rules.length) continue;
    seen.add(a.id);
    result.push({ extension, extensionName, action: a, rules });
  }
  return result;
}

/**
 * Whether one target entry of `extension` (the manifest that declares it, or
 * the context that asked for a pick) applies to the selected target. An
 * overlay feature is a target only for the extension that owns its overlay.
 */
export function ruleApplies(
  rule: TargetRule,
  sel: SelectedTarget,
  extension: string
): boolean {
  const { target } = sel;
  if (rule.kind !== target.kind) return false;
  if (rule.self !== undefined && rule.self !== (target as VesselTarget).self) {
    return false;
  }
  if (target.kind === 'overlayFeature') {
    if (sel.owner === undefined || sel.owner !== extension) return false;
    const { overlayId } = target as OverlayFeatureTarget;
    if (rule.overlays && !rule.overlays.includes(overlayId)) return false;
  }
  return (rule.match ?? []).every((c) => evalCondition(c, sel.match));
}

/** Whether an action applies to the selected target. */
export function actionApplies(a: UsableAction, sel: SelectedTarget): boolean {
  return a.rules.some((r) => ruleApplies(r, sel, a.extension));
}

/** A shallow copy of `params` with the invocation added, for a `publish` action. */
export function invocationParams(
  params: unknown,
  invocation: ActionInvocation
): Record<string, unknown> {
  const base =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)
      : {};
  return { ...base, actionId: invocation.actionId, target: invocation.target };
}
