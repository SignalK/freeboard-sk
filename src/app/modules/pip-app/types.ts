/** Where a PiP App window gets its content. */
export type PipAppSource =
  | { kind: 'webapp'; path: string } // server-relative, e.g. '/signalk-wifish/'
  | { kind: 'url'; url: string }; // absolute http(s) URL

/** Position and size as fractions (0..1) of the viewport. */
export interface PipRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A persisted PiP App window. */
export interface PipAppDef {
  id: string;
  title: string;
  source: PipAppSource;
  rect: PipRect;
  /** Shaded to its title bar; the embedded app keeps running. */
  collapsed: boolean;
  /** Window opacity, PIP_APP_MIN_OPACITY..1. */
  opacity: number;
  /**
   * Out in a `noopener` popup, which cannot be watched for closing; the
   * in-app copy stays unmounted until the user brings it back.
   */
  popout?: 'popup';
}

export const PIP_APP_MIN_OPACITY = 0.3;

/**
 * Same baseline as the instrument panel and plotter-extension iframes: fault
 * containment, not a security boundary. Navigation of the top window, popups
 * and modal dialogs are deliberately withheld.
 */
export const PIP_APP_SANDBOX = 'allow-scripts allow-same-origin allow-forms';
