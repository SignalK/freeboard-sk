import {
  RPC_ERRORS,
  RpcError,
  type MethodHandler,
  type NightModeState
} from 'signalk-plotterext-bus/host';

/**
 * Host method handlers for the `nightMode` capability — read and control
 * Freeboard's night-vision display mode (the dimmed low-light appearance the
 * user toggles from the display settings, or that tracks the server's
 * `environment.mode`).
 *
 * A pure factory over injected accessors so the handlers are unit-testable
 * without the Angular host service, matching the {@link createChartMethods}
 * pattern; the service spreads the result into each extension context's method
 * table.
 */
export interface NightModeMethodsDeps {
  /** Current resolved state: whether night mode is applied and whether it follows the server. */
  getState: () => NightModeState;
  /**
   * Apply a change. `auto` follows the server's `environment.mode`; `enabled`
   * forces the resolved state and is a manual override (implies `auto: false`).
   * At least one field is always present (validated before this is called).
   */
  setState: (next: Partial<NightModeState>) => void | Promise<void>;
}

export function createNightModeMethods(
  deps: NightModeMethodsDeps
): Record<string, MethodHandler> {
  const badRequest = (message: string) =>
    new RpcError(message, {
      code: RPC_ERRORS.INVALID_PARAMS,
      reason: 'nightMode.badRequest'
    });

  return {
    'nightMode.get': async () => deps.getState(),

    'nightMode.set': async (params) => {
      const p = (params ?? {}) as { enabled?: unknown; auto?: unknown };
      const hasEnabled = p.enabled !== undefined;
      const hasAuto = p.auto !== undefined;
      if (!hasEnabled && !hasAuto) {
        throw badRequest('nightMode.set requires enabled and/or auto');
      }
      if (hasEnabled && typeof p.enabled !== 'boolean') {
        throw badRequest('enabled must be a boolean');
      }
      if (hasAuto && typeof p.auto !== 'boolean') {
        throw badRequest('auto must be a boolean');
      }
      const next: Partial<NightModeState> = {};
      if (hasAuto) next.auto = p.auto as boolean;
      if (hasEnabled) next.enabled = p.enabled as boolean;
      await deps.setState(next);
      return {};
    }
  };
}
