import { type MethodHandler } from 'signalk-plotterext-bus/host';

export interface DisplayState {
  /** null: the user chose none, and each panel keeps its own look. */
  panelOpacity: number | null;
}

export interface DisplayMethodsDeps {
  getState: () => DisplayState;
}

export function createDisplayMethods(
  deps: DisplayMethodsDeps
): Record<string, MethodHandler> {
  return {
    'display.get': async () => deps.getState()
  };
}
