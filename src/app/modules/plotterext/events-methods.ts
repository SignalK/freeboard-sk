import {
  parsePublishParams,
  type MethodHandler
} from 'signalk-plotterext-bus/host';

/**
 * Host method handlers for the `events.publish` capability — an extension
 * context publishing an event of its own onto the bus. Delivery reuses the
 * host's subscription-gated routing, so a published event reaches subscribers
 * exactly as a host event does (no sender identity, publisher included).
 *
 * A pure factory over injected delivery functions so the handlers are
 * unit-testable without the Angular host service, matching the
 * {@link createNightModeMethods} pattern; the service spreads the result into
 * each extension context's method table.
 */
export interface EventsMethodsDeps {
  /** Deliver to every live context, in any extension, that subscribed. */
  broadcast: (event: string, params: unknown) => void;
  /** Deliver to the subscribed live contexts of one extension. */
  publishToExtension: (
    extension: string,
    event: string,
    params: unknown
  ) => void;
}

/**
 * Validate a publish request and route it by scope on behalf of `extension`.
 * Throws an `events.badRequest` RpcError on invalid input. Shared by the
 * `events.publish` method and the `publish` / `sendMessage` button action.
 */
export function publishEvent(
  deps: EventsMethodsDeps,
  extension: string,
  request: { topic?: unknown; params?: unknown; scope?: unknown }
): void {
  const { topic, params, scope } = parsePublishParams(request);
  if (scope === 'extension') {
    deps.publishToExtension(extension, topic, params);
  } else {
    deps.broadcast(topic, params);
  }
}

export function createEventsMethods(
  deps: EventsMethodsDeps,
  extension: string
): Record<string, MethodHandler> {
  return {
    'events.publish': async (params) => {
      publishEvent(deps, extension, (params ?? {}) as object);
      return {};
    }
  };
}
