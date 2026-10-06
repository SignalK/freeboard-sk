import {
  RPC_ERRORS,
  RpcError,
  type MethodHandler,
  type WindowGeometry,
  type WindowState
} from 'signalk-plotterext-bus/host';
import { PanelContribution } from './types';
import { cleanGeometry, isValidGeometry } from './windows/geometry';
import type { OpenFailure, WindowRequest } from './windows/window.service';

/** What the window handlers need from the host, scoped to one caller. */
export interface WindowMethodsDeps {
  /** The caller's own window id when it is a `window` context, else null. */
  self: string | null;
  /** The caller's iframe panel `id`, if its manifest has one this host can show. */
  panel: (id: string) => PanelContribution | undefined;
  open: (
    panel: PanelContribution,
    req: WindowRequest
  ) => WindowState | OpenFailure;
  /** The state of a window the caller's extension owns, if it is open. */
  owned: (windowId: string) => WindowState | undefined;
  /** An open window of `panel` the caller's extension owns (for `single`). */
  openOf: (panel: string) => string | undefined;
  update: (
    windowId: string,
    change: { title?: string; geometry?: WindowGeometry; visible?: boolean }
  ) => WindowState;
  focus: (windowId: string) => void;
  close: (windowId: string) => void;
  /** Every open window the caller's extension owns. */
  list: () => WindowState[];
}

const OPEN_KEYS = new Set([
  'panel',
  'params',
  'title',
  'geometry',
  'modal',
  'resizable',
  'movable',
  'titleBar',
  'userClose',
  'visible',
  'single',
  'restoreKey'
]);

const bad = (message: string) =>
  new RpcError(message, {
    code: RPC_ERRORS.INVALID_PARAMS,
    reason: 'windows.badRequest'
  });

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const optionalBoolean = (p: Record<string, unknown>, key: string) => {
  if (p[key] !== undefined && typeof p[key] !== 'boolean') {
    throw bad(`${key} must be a boolean`);
  }
};

const optionalEnum = (
  p: Record<string, unknown>,
  key: string,
  values: string[]
) => {
  if (p[key] !== undefined && !values.includes(p[key] as string)) {
    throw bad(`${key} must be one of ${values.join(', ')}`);
  }
};

/**
 * Validate `ui.openWindow` params (also a button's `openWindow` /
 * `toggleWindow` action) into a window request. Throws `windows.badRequest`.
 */
export function parseOpenWindow(params: unknown): {
  panel: string;
  single: boolean;
  req: WindowRequest;
} {
  if (!isPlainObject(params)) throw bad('params must be an object');
  const p = params;
  if (typeof p.panel !== 'string' || !p.panel) {
    throw new RpcError('panel must be a non-empty string', {
      code: RPC_ERRORS.INVALID_PARAMS,
      reason: 'UNKNOWN_PANEL'
    });
  }
  if (p.params !== undefined && !isPlainObject(p.params)) {
    throw bad('params.params must be a plain object');
  }
  if (p.title !== undefined && typeof p.title !== 'string') {
    throw bad('title must be a string');
  }
  if (p.geometry !== undefined && !isValidGeometry(p.geometry)) {
    throw bad('geometry is malformed');
  }
  if (
    p.restoreKey !== undefined &&
    (typeof p.restoreKey !== 'string' || !p.restoreKey)
  ) {
    throw bad('restoreKey must be a non-empty string');
  }
  ['modal', 'resizable', 'movable', 'visible', 'single'].forEach((k) =>
    optionalBoolean(p, k)
  );
  optionalEnum(p, 'titleBar', ['fixed', 'autoHide']);
  optionalEnum(p, 'userClose', ['close', 'hide']);
  if (p.modal === true && (p.visible === false || p.userClose === 'hide')) {
    throw bad('a modal window cannot be hidden');
  }
  const req: WindowRequest = {};
  for (const k of Object.keys(p)) {
    if (OPEN_KEYS.has(k) && k !== 'panel' && k !== 'single') {
      (req as Record<string, unknown>)[k] = p[k];
    }
  }
  if (req.geometry) req.geometry = cleanGeometry(req.geometry);
  return { panel: p.panel, single: p.single === true, req };
}

/**
 * Host method handlers for the `windows` capability: an extension's iframe
 * panels shown as floating windows (`ui.openWindow`, `ui.updateWindow`,
 * `ui.focusWindow`, `ui.closeWindow`, `ui.listWindows`). They validate params
 * and map failures to the spec's reasons; everything that touches Freeboard
 * state goes through `deps`, which already scope it to the caller's extension.
 * A pure factory, like `createChartMethods`.
 */
export function createWindowMethods(
  deps: WindowMethodsDeps
): Record<string, MethodHandler> {
  /** The window a call addresses: `windowId`, or the calling window itself. */
  const target = (params: unknown): string => {
    const id = isPlainObject(params) ? params.windowId : undefined;
    if (id !== undefined && typeof id !== 'string') {
      throw bad('windowId must be a string');
    }
    const resolved = (id as string | undefined) ?? deps.self;
    if (!resolved) throw bad('windowId is required outside a window context');
    if (!deps.owned(resolved)) {
      throw new RpcError('No such window', {
        code: RPC_ERRORS.INVALID_PARAMS,
        reason: 'windows.unknownId'
      });
    }
    return resolved;
  };

  return {
    'ui.openWindow': async (params) => {
      const { panel: panelId, single, req } = parseOpenWindow(params);
      const panel = deps.panel(panelId);
      if (!panel) {
        throw new RpcError(`No such panel: ${panelId}`, {
          code: RPC_ERRORS.INVALID_PARAMS,
          reason: 'UNKNOWN_PANEL'
        });
      }
      if (single) {
        const existing = deps.openOf(panelId);
        if (existing) {
          deps.update(existing, { visible: true });
          deps.focus(existing);
          return deps.owned(existing);
        }
      }
      const result = deps.open(panel, req);
      if (result === 'limit') {
        throw new RpcError('Too many windows are open', {
          reason: 'windows.limit'
        });
      }
      if (result === 'modalOpen') {
        throw new RpcError('Another modal window is open', {
          reason: 'windows.modalOpen'
        });
      }
      return result;
    },

    'ui.updateWindow': async (params) => {
      const id = target(params);
      const p = isPlainObject(params) ? params : {};
      if (p.title !== undefined && typeof p.title !== 'string') {
        throw bad('title must be a string');
      }
      if (p.geometry !== undefined && !isValidGeometry(p.geometry)) {
        throw bad('geometry is malformed');
      }
      optionalBoolean(p, 'visible');
      if (p.visible === false && deps.owned(id)?.modal) {
        throw bad('a modal window cannot be hidden');
      }
      return deps.update(id, {
        ...(p.title !== undefined ? { title: p.title as string } : {}),
        ...(p.geometry !== undefined
          ? { geometry: cleanGeometry(p.geometry as WindowGeometry) }
          : {}),
        ...(p.visible !== undefined ? { visible: p.visible as boolean } : {})
      });
    },

    'ui.focusWindow': async (params) => {
      deps.focus(target(params));
      return {};
    },

    'ui.closeWindow': async (params) => {
      deps.close(target(params));
      return {};
    },

    'ui.listWindows': async () => ({ windows: deps.list() })
  };
}
