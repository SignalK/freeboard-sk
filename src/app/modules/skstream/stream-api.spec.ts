import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import type { Context, Delta } from '@signalk/server-api';
import { Alarm, SKStreamAPI } from './stream-api';
import { SKStreamMessage } from 'src/app/types/stream';

// A minimal WebSocket stand-in: records what the API sends and exposes the
// event handlers the API installs so a test can push server messages through.
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: ((e: Event) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
}

const hello: SKStreamMessage = { version: '1.7.0', self: 'vessels.urn:me' };
const selfDelta: Delta = {
  context: 'vessels.urn:me' as Context,
  updates: [{ values: [{ path: 'navigation.speedOverGround', value: 3 }] }]
} as Delta;
const otherDelta: Delta = {
  ...selfDelta,
  context: 'vessels.urn:other' as Context
};

describe('SKStreamAPI message type guards', () => {
  const api = new SKStreamAPI();

  it('recognises a hello message', () => {
    expect(api.isHello(hello)).toBe(true);
    expect(api.isDelta(hello)).toBe(false);
    expect(api.isResponse(hello)).toBe(false);
  });

  it('recognises a delta message', () => {
    expect(api.isDelta(selfDelta)).toBe(true);
    expect(api.isHello(selfDelta)).toBe(false);
  });

  it('recognises a request response', () => {
    const response: SKStreamMessage = {
      requestId: 'abc',
      state: 'COMPLETED',
      statusCode: 200
    };
    expect(api.isResponse(response)).toBe(true);
    expect(api.isDelta(response)).toBe(false);
  });
});

describe('SKStreamAPI received messages', () => {
  let api: SKStreamAPI;
  let ws: FakeWebSocket;
  let received: SKStreamMessage[];

  beforeEach(() => {
    vi.useFakeTimers(); // open() starts a connection watchdog timer
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    api = new SKStreamAPI();
    received = [];
    api.onMessage.subscribe((m) => received.push(m));
    api.open('ws://localhost/signalk/v1/stream');
    ws = FakeWebSocket.instances[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const receive = (msg: SKStreamMessage) =>
    ws.onmessage({ data: JSON.stringify(msg) } as MessageEvent);

  it('records self and playback mode from the hello message', () => {
    receive(hello);
    expect(api.selfId).toBe('vessels.urn:me');
    expect(api.playbackMode).toBe(false);
    expect(received).toEqual([hello]);

    receive({ ...hello, startTime: '2026-01-01T00:00:00Z' });
    expect(api.playbackMode).toBe(true);
  });

  it('captures the token from a login response', () => {
    receive({ requestId: 'r1', state: 'COMPLETED', login: { token: 'tok' } });
    api.put('self', 'navigation.lights', true);
    expect(JSON.parse(ws.sent[0]).token).toBe('tok');
  });

  it('applies the vessel filter to delta messages only', () => {
    receive(hello);
    api.filter = 'self';
    receive(otherDelta);
    receive(selfDelta);
    expect(received.slice(1)).toEqual([selfDelta]);
  });

  it('ignores non-JSON frames', () => {
    ws.onmessage({ data: 'not json' } as MessageEvent);
    expect(received).toEqual([]);
  });
});

describe('SKStreamAPI sent messages', () => {
  let api: SKStreamAPI;
  let ws: FakeWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    api = new SKStreamAPI();
    api.open('ws://localhost/signalk/v1/stream');
    ws = FakeWebSocket.instances[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const lastSent = () => JSON.parse(ws.sent[ws.sent.length - 1]);

  it('builds a subscribe message from a path and options', () => {
    api.subscribe('self', 'navigation.*', { period: 1000, policy: 'fixed' });
    expect(lastSent()).toEqual({
      context: 'vessels.self',
      subscribe: [{ path: 'navigation.*', period: 1000, policy: 'fixed' }]
    });
  });

  it('sends a subscription list as-is', () => {
    const subs = [{ path: 'name' }, { path: 'mmsi', period: 5000 }];
    api.subscribe('vessels.*', subs);
    expect(lastSent()).toEqual({ context: 'vessels.*', subscribe: subs });
  });

  it('builds an unsubscribe message', () => {
    api.unsubscribe('*', '*');
    expect(lastSent()).toEqual({ context: '*', unsubscribe: [{ path: '*' }] });
  });

  it('builds a timestamped update carrying the source label', () => {
    api.source = 'freeboard-sk';
    api.sendUpdate('self', 'navigation.lights', true);
    const msg = lastSent();
    expect(msg.context).toBe('vessels.self');
    expect(msg.updates).toHaveLength(1);
    expect(msg.updates[0].values).toEqual([
      { path: 'navigation.lights', value: true }
    ]);
    expect(msg.updates[0].source).toEqual({ label: 'freeboard-sk' });
    expect(typeof msg.updates[0].timestamp).toBe('string');
  });

  it('raises and clears an alarm via put requests', () => {
    api.raiseAlarm('self', 'mob', new Alarm('Man overboard!', undefined, true));
    let msg = lastSent();
    expect(msg.context).toBe('vessels.self');
    expect(msg.put.path).toBe('notifications.mob');
    expect(msg.put.value).toEqual({
      message: 'Man overboard!',
      state: 'alarm',
      method: ['visual']
    });
    expect(typeof msg.requestId).toBe('string');

    api.clearAlarm('self', 'notifications.mob');
    msg = lastSent();
    expect(msg.put).toEqual({ path: 'notifications.mob', value: null });
  });
});
