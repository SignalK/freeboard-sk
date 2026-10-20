// Map picks (capability `map.pick`): the extension asks the user to pick a
// point or a feature on the chart. This module holds the parts that need no
// Angular: reading the request and deciding what a select yields. See the
// Plotter Extensions API spec, "Picking on the map".

import { RpcError, RPC_ERRORS } from 'signalk-plotterext-bus/host';
import type { MapTarget, SelectedTarget, TargetRule } from './actions';
import { parseTargetEntry, ruleApplies } from './actions';

export type {
  MapPickedEvent,
  PickCancelReason
} from 'signalk-plotterext-bus/host';

/** A `map.pick` request this host can run. */
export interface PickRequest {
  /** The extension's prompt; none when it gave none. */
  prompt?: string;
  /** The usable entries of `targets`, at least one. */
  rules: TargetRule[];
}

const badRequest = (message: string) =>
  new RpcError(message, {
    code: RPC_ERRORS.INVALID_PARAMS,
    reason: 'map.badRequest'
  });

/**
 * Read the params of `map.pick`. Entries of `targets` this host ignores (an
 * unknown kind, a narrowing a kind does not take) are
 * dropped, as for an action; a `targets` that is not a list, or keeps no
 * entry, is a bad request. Without `targets`, a point.
 */
export function parsePickParams(params: unknown): PickRequest {
  if (params === undefined || params === null) {
    return { rules: [{ kind: 'position' }] };
  }
  if (typeof params !== 'object' || Array.isArray(params)) {
    throw badRequest('map.pick params must be an object');
  }
  const { prompt, targets } = params as Record<string, unknown>;
  if (prompt !== undefined && typeof prompt !== 'string') {
    throw badRequest('map.pick prompt must be a string');
  }
  let rules: TargetRule[] = [{ kind: 'position' }];
  if (targets !== undefined) {
    if (!Array.isArray(targets)) {
      throw badRequest('map.pick targets must be a list');
    }
    rules = targets
      .map(parseTargetEntry)
      .filter((r): r is TargetRule => r !== null);
    if (!rules.length) {
      throw badRequest('map.pick targets has no kind this host supports');
    }
  }
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  return text ? { prompt: text, rules } : { rules };
}

/**
 * What a select yields: the first feature under the pointer, in hit order,
 * that an entry accepts, else the point when `position` is among them, else
 * nothing, and the pick stays on. `extension` asked for the pick: an overlay
 * feature is pickable only by the extension that owns its overlay.
 */
export function pickedTarget(
  rules: TargetRule[],
  features: SelectedTarget[],
  position: SelectedTarget,
  extension: string
): MapTarget | null {
  const hit = [...features, position].find((sel) =>
    rules.some((r) => ruleApplies(r, sel, extension))
  );
  return hit?.target ?? null;
}
