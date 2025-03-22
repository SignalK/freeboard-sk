import { PathValue } from '@signalk/server-api';
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

  constructor() {
    this.action = 'update';
  }
}

export class TrailMessage extends UpdateMessage {
  constructor() {
    super();
    this.action = 'trail';
  }
}
