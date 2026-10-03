import {
  RPC_ERRORS,
  RpcError,
  type MethodHandler
} from 'signalk-plotterext-bus/host';

export interface WindowSize {
  width: number;
  height: number;
}

/** What to show: one of the caller's own iframe panels, or a page by URL. */
export type WindowTarget = { panel: string } | { url: string };

/**
 * Host method handlers for the `x-freeboard-sk.windows` capability: let an
 * extension show one of its own iframe panels, or another page on the Signal
 * K server, in a PiP App window floating over the chart, and close windows
 * it opened.
 *
 * A pure factory over injected accessors, matching {@link createChartMethods};
 * the service spreads the result into each extension context's method table.
 */
export interface WindowMethodsDeps {
  /** PiP App is switched on (it is an experimental feature). */
  enabled: () => boolean;
  /** True when the caller's manifest has an iframe panel with this id. */
  hasPanel: (panel: string) => boolean;
  /**
   * Open (or reveal) the target as a window. Returns the window id, or null
   * when the target's URL is not on the Signal K server.
   */
  open: (
    target: WindowTarget,
    title?: string,
    size?: WindowSize
  ) => string | null;
  /** True when this caller opened the window and it is still open. */
  owns: (windowId: string) => boolean;
  close: (windowId: string) => void;
}

export function createWindowMethods(
  deps: WindowMethodsDeps
): Record<string, MethodHandler> {
  const fail = (message: string, reason: string) =>
    new RpcError(message, { code: RPC_ERRORS.INVALID_PARAMS, reason });
  const positive = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0;
  const nonEmpty = (v: unknown): v is string => typeof v === 'string' && !!v;

  return {
    'ui.openWindow': async (params) => {
      const p = (params ?? {}) as {
        panel?: unknown;
        url?: unknown;
        title?: unknown;
        width?: unknown;
        height?: unknown;
      };
      if (!deps.enabled()) {
        throw new RpcError('PiP App windows are switched off', {
          code: RPC_ERRORS.HOST_ERROR,
          reason: 'windows.disabled'
        });
      }
      const hasPanel = p.panel !== undefined;
      const hasUrl = p.url !== undefined;
      if (hasPanel === hasUrl) {
        throw fail('give exactly one of panel or url', 'windows.badRequest');
      }
      if (hasPanel && (!nonEmpty(p.panel) || !deps.hasPanel(p.panel))) {
        throw fail(`No such panel: ${String(p.panel)}`, 'UNKNOWN_PANEL');
      }
      if (hasUrl && !nonEmpty(p.url)) {
        throw fail('url must be a non-empty string', 'windows.badRequest');
      }
      if (p.title !== undefined && typeof p.title !== 'string') {
        throw fail('title must be a string', 'windows.badRequest');
      }
      const hasW = p.width !== undefined;
      const hasH = p.height !== undefined;
      if (
        hasW !== hasH ||
        (hasW && !(positive(p.width) && positive(p.height)))
      ) {
        throw fail(
          'width and height must be given together as positive pixel sizes',
          'windows.badRequest'
        );
      }
      const size = hasW
        ? { width: p.width as number, height: p.height as number }
        : undefined;
      const target: WindowTarget = hasPanel
        ? { panel: p.panel as string }
        : { url: p.url as string };
      const windowId = deps.open(target, p.title as string | undefined, size);
      if (!windowId) {
        throw hasPanel
          ? fail(`Panel ${String(p.panel)} cannot be shown`, 'UNKNOWN_PANEL')
          : fail('url must be on the Signal K server', 'windows.badRequest');
      }
      return { windowId };
    },

    'ui.closeWindow': async (params) => {
      const id = (params as { windowId?: unknown } | undefined)?.windowId;
      if (typeof id !== 'string' || !deps.owns(id)) {
        throw fail('No such window', 'UNKNOWN_WINDOW');
      }
      deps.close(id);
      return {};
    }
  };
}
