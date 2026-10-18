// Thrown values reach the plugin from the MCP SDK, the WebSocket layer and the
// host API, so they are read defensively: an Error, or anything else.

// The thrown value's `message`, when it has one.
export function messageOf(err: unknown): unknown {
  return typeof err === 'object' && err !== null && 'message' in err
    ? err.message
    : undefined;
}

// The host API's stable error reason (set by BridgeHub), when there is one.
export function reasonOf(err: unknown): unknown {
  return typeof err === 'object' && err !== null && 'reason' in err
    ? err.reason
    : undefined;
}
