import {
  type MethodHandler,
  type NightModeState
} from 'signalk-plotterext-bus/host';
import { parseParams } from './method-params';

// The schema loads with the validator on the first call, keeping TypeBox out
// of the initial bundle.
const schemas = () => import('./nightmode-params');

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
  return {
    'nightMode.get': async () => deps.getState(),

    'nightMode.set': async (params) => {
      const { enabled, auto } = await parseParams(
        (await schemas()).SetParams,
        params ?? {},
        'nightMode.badRequest'
      );
      const next: Partial<NightModeState> = {};
      if (auto !== undefined) next.auto = auto;
      if (enabled !== undefined) next.enabled = enabled;
      await deps.setState(next);
      return {};
    }
  };
}
