// Map actions (capability `actions`): manifest actions offered on targets the
// user selects on the chart. This module holds the parts that need no Angular:
// which manifest actions are usable, and which apply to a target. See the
// Plotter Extensions API spec, "Actions".

import type {
  ActionInvocation,
  MapTarget,
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
 * chart feature. The match data is the host's own and is never delivered.
 */
export interface SelectedTarget {
  target: MapTarget;
  match?: unknown;
}

/**
 * The kinds this host offers actions on. `overlayFeature` needs capability
 * `actions.overlay`, which this host does not have yet.
 */
export const OFFERED_TARGET_KINDS: ReadonlySet<string> = new Set<TargetKind>([
  'position',
  'waypoint',
  'note',
  'route',
  'track',
  'region',
  'vessel',
  'aton',
  'chartFeature'
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

/** The `action` types an action may take (a button's). */
const ACTION_TYPES = new Set([
  'openPanel',
  'togglePanel',
  'openWindow',
  'toggleWindow',
  'publish',
  'sendMessage'
]);

/** A target entry this host can use. */
export interface TargetRule {
  kind: TargetKind;
  match?: ResourceFilterCondition[];
  self?: boolean;
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
  if (e.overlays !== undefined) return null;
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
 * action that lacks a required field, has an action type the host does not
 * know, targets a newer host API, or has no target entry the host can use is
 * left out. A repeated id keeps its first action.
 */
export function usableActions(
  extension: string,
  extensionName: string,
  actions: unknown,
  hostApiVersion: string
): UsableAction[] {
  if (!Array.isArray(actions)) return [];
  const result: UsableAction[] = [];
  const seen = new Set<string>();
  for (const a of actions as ActionContribution[]) {
    if (!a || typeof a !== 'object') continue;
    if (typeof a.id !== 'string' || !a.id || seen.has(a.id)) continue;
    if (typeof a.title !== 'string' || !a.title.trim()) continue;
    if (!Array.isArray(a.targets)) continue;
    if (!a.action || !ACTION_TYPES.has(a.action.type)) continue;
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

/** Whether one target entry applies to the selected target. */
export function ruleApplies(rule: TargetRule, sel: SelectedTarget): boolean {
  const { target } = sel;
  if (rule.kind !== target.kind) return false;
  if (rule.self !== undefined && rule.self !== (target as VesselTarget).self) {
    return false;
  }
  return (rule.match ?? []).every((c) => evalCondition(c, sel.match));
}

/** Whether an action applies to the selected target. */
export function actionApplies(a: UsableAction, sel: SelectedTarget): boolean {
  return a.rules.some((r) => ruleApplies(r, sel));
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
