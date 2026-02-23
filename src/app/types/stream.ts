/** Signal K Types */

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

export interface ResourceDeltaSignal {
  path: string;
  value: any;
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

export class TrailMessage extends UpdateMessage {
  constructor() {
    super();
    this.action = 'trail';
  }
}
