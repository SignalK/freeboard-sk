/** Signal K Types */

import type {
  Context,
  Delta,
  SubscribeMessage,
  Update
} from '@signalk/server-api';
import type { Position } from './resources/geojson';

// Notification types
export enum ALARM_STATE {
  nominal = 'nominal',
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency'
}

export enum ALARM_METHOD {
  visual = 'visual',
  sound = 'sound'
}

export interface SKNotification {
  state: ALARM_STATE;
  method: ALARM_METHOD[];
  message: string;
  status?: {
    silenced: boolean;
    acknowledged: boolean;
    canSilence: boolean;
    canAcknowledge: boolean;
    canClear: boolean;
  };
  position?: SKPosition;
  createdAt?: string;
  id?: string;
}

// Update Deltas
export interface PathValue {
  path: string;
  value: object | number | string | null | Notification | boolean;
}

export interface ActionResult {
  state: 'COMPLETED' | 'PENDING' | 'FAILED';
  statusCode?: number;
  message?: string;
  timestamp?: string;
}

export interface SKPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
}

// ** Stream (WebSocket) messages **

/** Hello message sent by the server when a stream connection is opened. */
export interface SKHelloMessage {
  version: string;
  self: string;
  name?: string;
  roles?: string[];
  timestamp?: string;
  /** Present when the stream is a playback stream. */
  startTime?: string;
  playbackRate?: number;
}

/** Response to a request (login, put, ...) sent over the stream. */
export interface SKRequestResponse extends ActionResult {
  requestId: string;
  href?: string;
  login?: {
    token?: string;
    timeToLive?: number;
  };
}

/** Any message received over the stream. */
export type SKStreamMessage = Delta | SKHelloMessage | SKRequestResponse;

/** Request sent over the stream (login, put, ...). */
export interface SKStreamRequest {
  requestId: string;
  token?: string;
  [key: string]: unknown;
}

/** Updates message sent over the stream. */
export interface SKStreamUpdates {
  context: Context | null;
  updates: Update[];
  token?: string;
}

/** Subscription criteria for one path.
 * The spec (1.7) shape: `@signalk/server-api`'s `SubscriptionOptions` omits the
 * `ideal` policy and the `full` format, so it is declared here. */
export interface SKSubscriptionOptions {
  path: string;
  period?: number;
  minPeriod?: number;
  format?: 'delta' | 'full';
  policy?: 'instant' | 'ideal' | 'fixed';
}

/** Subscribe message sent over the stream. */
export interface SKStreamSubscribe extends Omit<
  SubscribeMessage,
  'context' | 'subscribe'
> {
  context: Context | null;
  subscribe: SKSubscriptionOptions[];
  token?: string;
}

/** Unsubscribe message sent over the stream. */
export interface SKStreamUnsubscribe {
  context: Context | null;
  unsubscribe: Array<{ path: string }>;
  token?: string;
}

/***************** */

import {
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo
} from 'src/app/modules/skresources/resource-classes';

type AisIds = Array<string>;

interface WorkerMessageBase {
  action: string;
  playback: boolean;
  result: ResultPayload | PathValue;
  self: string;
  timestamp: string;
}

/** A single path update surfaced as a signal (resource / radar deltas). */
export interface DeltaSignal extends PathValue {
  sourceRef?: string;
}

export interface ResultPayload {
  self: SKVessel;
  aisTargets: Map<string, SKVessel>;
  aisStatus: {
    updated: AisIds;
    stale: AisIds;
    expired: AisIds;
  };
  paths: { [key: string]: string };
  atons: Map<string, SKAtoN>;
  aircraft: Map<string, SKAircraft>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
}

export class NotificationMessage implements WorkerMessageBase {
  action = 'notification';
  playback = false;
  result = null;
  self = null;
  timestamp = new Date().toISOString();
  sourceRef!: string;
}

export class UpdateMessage implements WorkerMessageBase {
  action: string;
  playback = false;
  result = null;
  timestamp: string;
  self = null;
  watchDogAlarm: boolean;

  constructor() {
    this.action = 'update';
  }
}

export class ResourceMessage extends UpdateMessage {
  constructor() {
    super();
    this.action = 'resource';
  }
}

export class RadarMessage extends UpdateMessage {
  constructor() {
    super();
    this.action = 'radar';
  }
}

export class TrailMessage extends UpdateMessage {
  /** The trail as recorded, with each point's time (`times[i][j]` is when
   * `lines[i][j]` was recorded), before the older bands are simplified for
   * drawing. v2 Track API only. */
  timed?: { lines: Position[][]; times: string[][] };

  constructor() {
    super();
    this.action = 'trail';
  }
}
