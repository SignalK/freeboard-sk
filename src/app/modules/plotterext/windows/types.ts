import type { WindowGeometry, WindowState } from 'signalk-plotterext-bus/host';
import { PanelContribution } from '../types';

/**
 * An extension window: one of an extension's iframe panels shown floating over
 * the chart (the `windows` capability). Windows live only as long as the page;
 * they are never stored in the config.
 */
export interface ExtWindow {
  /** The window's id (`windowId` on the bus). */
  id: string;
  /** The extension that owns the window. */
  extension: string;
  /** The manifest panel the window shows. */
  panel: PanelContribution;
  /** Handed to the window context in its handshake as `context.params`. */
  params: Record<string, unknown>;
  title: string;
  /**
   * The requested geometry, resolved against the window area whenever either
   * changes, so an anchored window stays where it belongs when the area
   * resizes. A user move or resize replaces it (see `anchoredGeometry`).
   */
  geometry: WindowGeometry;
  modal: boolean;
  /** Whether the user may resize / move it; the extension always may. */
  resizable: boolean;
  movable: boolean;
  titleBar: 'fixed' | 'autoHide';
  /** What the title-bar close control does. */
  userClose: 'close' | 'hide';
  visible: boolean;
  /** Shaded to its title bar; the page keeps running. */
  collapsed: boolean;
  /** Window opacity, WINDOW_MIN_OPACITY..1. */
  opacity: number;
  /** Remember the window's geometry under this key (per extension, per device). */
  restoreKey?: string;
}

/** Why a window closed (`window.closed` reason). */
export type WindowCloseReason = 'user' | 'extension' | 'host';

/** A change the host reports to the window's extension. */
export type WindowChange =
  | {
      extension: string;
      event: 'window.bounds';
      payload: Pick<WindowState, 'windowId' | 'bounds' | 'area'>;
    }
  | { extension: string; event: 'window.state'; payload: WindowState }
  | {
      extension: string;
      event: 'window.closed';
      payload: { windowId: string; reason: WindowCloseReason };
    };

export const WINDOW_MIN_OPACITY = 0.3;

/**
 * Same baseline as the drawer panels and widgets: fault containment, not a
 * security boundary. Navigation of the top window, popups and modal dialogs
 * are deliberately withheld.
 */
export const WINDOW_SANDBOX = 'allow-scripts allow-same-origin allow-forms';
