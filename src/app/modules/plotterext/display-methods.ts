import {
  type DisplayState,
  type MethodHandler
} from 'signalk-plotterext-bus/host';

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
