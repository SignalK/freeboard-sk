// **** Signal K Standard ALARMS notifier ****
import { NextFunction, Request, Response } from 'express';
import {
  ALARM_METHOD,
  ALARM_STATE,
  Context,
  Delta,
  hasValues,
  Path,
  PathValue,
  Position,
  SKVersion,
  SubscribeMessage,
  Update
} from '@signalk/server-api';
import { FreeboardHelperApp } from '../index';
import * as uuid from 'uuid';
import { isPointWithinRadius, isPointInPolygon } from 'geolib';
import { Point } from 'geojson';

type AlarmTrigger = 'entry' | 'exit';
type AlarmGeometry = 'polygon' | 'circle' | 'region';

interface AreaAlarmDef {
  geometry: AlarmGeometry;
  trigger: AlarmTrigger;
  coords?: Array<Position>;
  center?: Position;
  radius?: number;
  name?: string;
}

const AREA_TRIGGERS: Array<AlarmTrigger> = ['entry', 'exit'];
const AREA_GEOMETRIES: Array<AlarmGeometry> = ['polygon', 'circle', 'region'];

const STANDARD_ALARMS = [
  'mob',
  'fire',
  'sinking',
  'flooding',
  'collision',
  'grounding',
  'listing',
  'adrift',
  'piracy',
  'abandon',
  'aground'
];

const ALARM_API_PATH = '/signalk/v2/api/alarms';

interface AreaAlarmStatus {
  alarmId: string;
  active: boolean;
  lastUpdate: number;
}

type AlarmCondition = 'inside' | 'outside';

class AreaAlarmManager {
  private alarms: Map<string, AreaAlarmStatus>;
  constructor() {
    this.alarms = new Map();
  }

  /**
   * Remove area from alarm manager
   * @param id Area identifier
   */
  delete(id: string) {
    // clean up notification
    this.alarms.delete(id);
    emitNotification({
      path: `notifications.area.${id}` as Path,
      value: null
    });
  }

  /**
   * Trigger alarm status update assessment
   * @param id Area identifier
   * @param condition current condition
   * @returns void
   */
  update(id: string, condition: AlarmCondition) {
    if (!alarmAreas.has(id)) {
      return;
    }
    if (!this.alarms.has(id)) {
      this.alarms.set(id, {
        alarmId: id,
        active: false,
        lastUpdate: Date.now() - 1000
      });
    }
    this.assessStatus(id, condition);
  }

  /**
   * Silence alarm with the supplied identifier
   * @param id Area identifier
   */
  silence(id: string) {
    // clean up notification
    const n = server.getSelfPath(`notifications.area.${id}`);
    if (n.value && Array.isArray(n.value.method)) {
      const m = n.value.method.filter((i) => i !== 'sound');
      n.value.method = m;
    }
    emitNotification({
      path: `notifications.area.${id}` as Path,
      value: n.value
    });
  }

  /**
   * Assess and emit alarm based on supplied condition
   * @param id alarm id
   * @param condition current condition
   */
  private assessStatus(id: string, condition: AlarmCondition) {
    if (!alarmAreas.has(id)) {
      return;
    }
    const area = alarmAreas.get(id);
    const alarm = this.alarms.get(id);
    let notify = false;

    if (area.trigger === 'entry') {
      if (condition === 'inside' && !alarm.active) {
        // transition to active
        alarm.active = true;
        notify = true;
        server.debug(`*** inactive -> to active (${id})`);
      }
      if (condition === 'outside' && alarm.active) {
        // transition to inactive
        alarm.active = false;
        notify = true;
        server.debug(`*** active -> to inactive (${id})`);
      }
      alarm.lastUpdate == Date.now();
    } else {
      if (condition === 'outside' && !alarm.active) {
        // transition to active
        alarm.active = true;
        notify = true;
        server.debug(`*** inactive -> to active (${id})`);
      }
      if (condition === 'inside' && alarm.active) {
        // transition to inactive
        alarm.active = false;
        notify = true;
        server.debug(`*** active -> to inactive (${id})`);
      }
    }

    if (notify) {
      const msg =
        area.trigger === 'entry'
          ? alarm.active
            ? `Monitored area ${
                area.name ? area.name + ' ' : ''
              }has been entered.`
            : ''
          : alarm.active
            ? `Vessel has left the monitored area ${area.name ?? ''}`
            : '';

      const state = alarm.active ? ALARM_STATE.alarm : ALARM_STATE.normal;

      emitNotification({
        path: `notifications.area.${id}` as Path,
        value: {
          message: msg,
          method: [ALARM_METHOD.sound, ALARM_METHOD.visual],
          state: state
        }
      });
    }
  }
}

// ******************************************************************

let server: FreeboardHelperApp;
let pluginId: string;
let unsubscribes = [];

const alarmAreas: Map<string, AreaAlarmDef> = new Map();
const alarmManager: AreaAlarmManager = new AreaAlarmManager();

export const initAlarms = (app: FreeboardHelperApp, id: string) => {
  server = app;
  pluginId = id;

  server.debug(`** initAlarms() **`);

  if (server.registerActionHandler) {
    server.debug(`** Registering Alarm Action Handler(s) **`);
    STANDARD_ALARMS.forEach((i) => {
      server.debug(`** Registering ${i} Handler **`);
      server.registerPutHandler(
        'vessels.self',
        `notifications.${i}`,
        handleV1PutRequest as any,
        pluginId
      );
    });
  }

  initAlarmEndpoints();

  setTimeout(() => parseRegionList(), 5000);

  // subscribe to deltas
  const subCommand: SubscribeMessage = {
    context: 'vessels.self' as Context,
    subscribe: [
      {
        path: 'resources.*' as Path,
        policy: 'instant'
      },
      {
        path: 'navigation.position' as Path,
        policy: 'instant'
      }
    ]
  };

  server.subscriptionmanager.subscribe(
    subCommand,
    unsubscribes,
    (err) => {
      console.log(`error: ${err}`);
    },
    handleDeltaMessage
  );
};

export const shutdownAlarms = () => {
  unsubscribes.forEach((s) => s());
  unsubscribes = [];
};

const handleDeltaMessage = (delta: Delta) => {
  if (!delta.updates) {
    return;
  }
  delta.updates.forEach((u: Update) => {
    if (!hasValues(u)) {
      return;
    }
    u.values.forEach((v: PathValue) => {
      const t = v.path.split('.');
      if (t[0] === 'resources' && t[1] === 'regions') {
        processRegionUpdate(t[2], v.value);
      }
      if (t[0] === 'navigation' && t[1] === 'position') {
        processVesselPositionUpdate(v.value as Position);
      }
    });
  });
};

const initAlarmEndpoints = () => {
  server.debug(`** Registering Alarm Action API endpoint(s) **`);

  // list area alarms
  server.get(
    `${ALARM_API_PATH}/area`,
    async (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** ${req.method} ${req.path}`);
      const ar = Array.from(alarmAreas);
      res.status(200).json(ar);
    }
  );
  // new area alarm
  server.post(
    `${ALARM_API_PATH}/area`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        validateAreaBody(req.body);
      } catch (err) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (err as Error).message
        });
        return;
      }

      if (req.body.geometry === 'region') {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: `Invalid geometry value 'region'. Use PUT request specifying a region identifier.`
        });
        return;
      }

      const id = uuid.v4();
      alarmAreas.set(id, req.body);
      res.status(200).json({
        state: 'COMPLETE',
        statusCode: 200,
        message: `Alarm Area created: ${id}`
      });
    }
  );
  server.put(
    `${ALARM_API_PATH}/area/:id`,
    async (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** ${req.method} ${req.path}`);

      try {
        validateAreaBody(req.body);
      } catch (err) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (err as Error).message
        });
        return;
      }

      if (req.body.geometry === 'region') {
        // use region resource as alarm area
        try {
          const reg: any = await fetchRegion(req.params.id);
          const coords = parseRegionCoords(reg);
          if (Array.isArray(coords)) {
            alarmAreas.set(req.params.id, {
              geometry: req.body.geometry,
              trigger: req.body.trigger,
              coords: coords,
              name: reg.name
            });
            res.status(200).json({
              state: 'COMPLETE',
              statusCode: 200,
              message: `Alarm set for region: ${req.params.id}`
            });
          } else {
            res.status(400).json({
              state: 'FAILED',
              statusCode: 400,
              message: `Region not found!`
            });
          }
        } catch (e) {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: (e as Error).message
          });
        }
      } else {
        //updateArea(req.params.id)
        // use supplied coords as alarm area
        const msg = alarmAreas.has(req.params.id)
          ? `Alarm Area updated: ${req.params.id}`
          : `Alarm Area created: ${req.params.id}`;
        alarmAreas.set(req.params.id, req.body);
        res.status(200).json({
          state: 'COMPLETE',
          statusCode: 200,
          message: msg
        });
      }
    }
  );
  server.delete(
    `${ALARM_API_PATH}/area/:id`,
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** ${req.method} ${req.path}`);
      try {
        if (alarmAreas.has(req.params.id)) {
          deleteArea(req.params.id);
          res.status(200).json({
            state: 'COMPLETE',
            statusCode: 200,
            message: `Alarm Area Cleared: ${req.params.id}`
          });
        } else {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: `Area not found!`
          });
        }
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );
  server.post(
    `${ALARM_API_PATH}/area/:id/silence`,
    (req: Request, res: Response) => {
      server.debug(`** ${req.method} ${req.path}`);

      try {
        if (alarmAreas.has(req.params.id)) {
          alarmManager.silence(req.params.id);
          res.status(200).json({
            state: 'COMPLETE',
            statusCode: 200,
            message: `Alarm silenced: ${req.params.id}`
          });
        } else {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: `Area not found!`
          });
        }
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );

  // standard alarms
  server.post(
    `${ALARM_API_PATH}/:alarmType`,
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(
        `** ${req.method} ${ALARM_API_PATH}/${req.params.alarmType}`
      );
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        next();
        return;
      }
      try {
        const id = uuid.v4();
        const msg = req.body.message
          ? req.body.message
          : (req.params.alarmType as string);

        const r = handleAlarm(
          'vessels.self',
          `notifications.${req.params.alarmType}.${id}` as Path,
          Object.assign(
            {
              message: msg,
              method: [ALARM_METHOD.sound, ALARM_METHOD.visual],
              state: ALARM_STATE.emergency
            },
            buildAlarmData()
          )
        );
        res.status(r.statusCode).json(Object.assign(r, { id: id }));
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );
  server.post(
    `${ALARM_API_PATH}/:alarmType/:id/silence`,
    (req: Request, res: Response) => {
      server.debug(`** ${req.method} ${req.path}`);
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        res.status(200).json({
          state: 'COMPLETED',
          statusCode: 200,
          message: `Unsupported Alarm (${req.params.alarmType}).`
        });
        return;
      }
      try {
        const al = server.getSelfPath(
          `notifications.${req.params.alarmType}.${req.params.id}`
        );
        if (al && al.value) {
          server.debug('Alarm value....');
          if (al.value.method && al.value.method.includes('sound')) {
            server.debug('Alarm has sound... silence!!!');
            al.value.method = al.value.method.filter((i) => i !== 'sound');
            const r = handleAlarm(
              'vessels.self',
              `notifications.${req.params.alarmType}.${req.params.id}` as Path,
              al.value
            );
            res.status(r.statusCode).json(r);
          } else {
            server.debug('Alarm has no sound... no action required.');
            res.status(200).json({
              state: 'COMPLETED',
              statusCode: 200,
              message: `Alarm (${req.params.alarmType}) is already silent.`
            });
          }
        } else {
          throw new Error(
            `Alarm (${req.params.alarmType}.${req.params.id}) has no value or was not found!`
          );
        }
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );
  server.delete(
    `${ALARM_API_PATH}/:alarmType/:id`,
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(
        `** ${req.method} ${ALARM_API_PATH}/${req.params.alarmType}`
      );
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        next();
        return;
      }
      try {
        const r = handleAlarm(
          'vessels.self',
          `notifications.${req.params.alarmType}.${req.params.id}` as Path,
          {
            message: '',
            method: [],
            state: ALARM_STATE.normal
          }
        );
        res.status(r.statusCode).json(r);
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );
};

const handleV1PutRequest = (
  context: string,
  path: Path,
  value: any,
  cb: (actionResult: any) => void
) => {
  cb(handleAlarm(context, path, value));
};

const buildAlarmData = () => {
  const pos: { value: Position } = server.getSelfPath('navigation.position');
  const r: any = {
    createdAt: new Date().toISOString()
  };
  if (pos) {
    r.position = pos.value;
  }
  return r;
};

const handleAlarm = (
  context: string,
  path: Path,
  value: {
    message: string;
    state: ALARM_STATE;
    method: ALARM_METHOD[];
    data?: {
      position: Position;
      timestamp: string;
    };
  }
) => {
  server.debug(`context: ${context}`);
  server.debug(`path: ${path}`);
  server.debug(`value: ${JSON.stringify(value)}`);
  if (!path) {
    server.debug('Error: no path provided!');
    return {
      state: 'COMPLETED',
      resultStatus: 400,
      statusCode: 400,
      message: `Invalid reference!`
    };
  }

  const pa = path.split('.');
  const alarmType = pa[1];
  server.debug(`alarmType: ${JSON.stringify(alarmType)}`);
  if (STANDARD_ALARMS.includes(alarmType)) {
    server.debug(`****** Sending Delta (Std Alarm Notification): ******`);
    emitNotification({
      path: path,
      value: value ?? null
    });
    return { state: 'COMPLETED', resultStatus: 200, statusCode: 200 };
  } else {
    return {
      state: 'COMPLETED',
      resultStatus: 400,
      statusCode: 400,
      message: `Invalid reference!`
    };
  }
};

// emit notification delta message **
const emitNotification = (msg: PathValue) => {
  const delta = {
    updates: [{ values: [msg] }]
  };
  server.handleMessage(pluginId, delta, SKVersion.v2);
};

// ********** Area Alarm methods ***************

/**
 * Remove Area from management
 * @param id Area identifier
 */
const deleteArea = (id: string) => {
  alarmAreas.delete(id);
  alarmManager.delete(id);
};

/**
 * Validate Area Alarm request parameters
 * @param body request body
 */
const validateAreaBody = (body: any) => {
  if (!body.trigger) {
    body.trigger = 'entry';
  } else if (!AREA_TRIGGERS.includes(body.trigger)) {
    throw new Error(`Area alarm trigger is invalid!`);
  }
  if (!body.geometry) {
    body.geometry = 'polygon';
  } else if (!AREA_GEOMETRIES.includes(body.geometry)) {
    throw new Error(`Area alarm geometry is invalid!`);
  }

  if (body.geometry === 'polygon') {
    if (!Array.isArray(body.coords)) {
      throw new Error(`Area coordinates not provided or are invalid!`);
    }
    if (body.coords.length === 0) {
      throw new Error(`Area coordinates not provided!`);
    } else if (!isValidPosition(body.coords[0])) {
      throw new Error(`Area coordinates are invalid!`);
    }
    delete body.center;
    delete body.radius;
  }
  if (body.geometry === 'circle') {
    if (!body.center || !isValidPosition(body.center)) {
      throw new Error(`Center coordinate not provided or is invalid!`);
    }
    if (typeof body.radius !== 'number') {
      throw new Error(`Radius not provided or invalid!`);
    }
    delete body.coords;
  }

  if (body.geometry === 'region') {
    delete body.coords;
    delete body.center;
    delete body.radius;
  }
};

/**
 * Determines if supplied position is valid
 * @param position
 * @returns true if valid
 */
const isValidPosition = (position: Position): boolean => {
  return 'latitude' in position &&
    'longitude' in position &&
    typeof position.latitude === 'number' &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    typeof position.longitude === 'number' &&
    position.longitude >= -180 &&
    position.longitude <= 180
    ? true
    : false;
};

/**
 * Fetch region resource details
 * @param id Region identifier
 * @returns coordinates array
 */
const fetchRegion = async (id: string) => {
  const reg = await server.resourcesApi.getResource('regions', id);
  return reg;
};

/**
 * Fetch list of region resources and parse them to assign alarm area
 * @returns void
 */
const parseRegionList = async () => {
  const regList = await server.resourcesApi.listResources('regions', undefined);
  Object.entries(regList).forEach((r) => processRegionUpdate(r[0], r[1]));
};

/**
 * Extract and format region coordinates
 * @param region Region data
 * @returns coordinates array
 */
const parseRegionCoords = (region: any): Position[] => {
  let c: Point[];
  if (region.feature.geometry?.type === 'MultiPolygon') {
    c = region.feature.geometry?.coordinates[0][0];
  } else {
    c = region.feature.geometry?.coordinates[0];
  }
  return c.map((i) => {
    return { latitude: i[1], longitude: i[0] };
  });
};

/**
 * CrUD area alarm from Region delta
 * @param id Region identifier
 * @param region Region data
 */
const processRegionUpdate = (id: string, region: any) => {
  if (alarmAreas.has(id)) {
    if (!region) {
      deleteArea(id);
    } else if (region.feature.properties.skIcon !== 'hazard') {
      deleteArea(id);
    } else {
      const r = alarmAreas.get(id);
      r.coords = parseRegionCoords(region);
      r.name = region.name;
      alarmAreas.set(id, r);
    }
  } else {
    if (region.feature.properties.skIcon === 'hazard') {
      alarmAreas.set(id, {
        trigger: 'entry',
        geometry: 'region',
        coords: parseRegionCoords(region),
        name: region.name
      });
    }
  }
};

/**
 * Process received vessel.position update delta and
 * determine the current each managed area's trigger condition
 * @param position Vessel position
 */
const processVesselPositionUpdate = (position: Position) => {
  if (!isValidPosition(position)) {
    return;
  }

  alarmAreas.forEach((v, k) => {
    let condition: AlarmCondition;

    if (v.geometry === 'circle') {
      if (isPointWithinRadius(position, v.center, v.radius)) {
        condition = 'inside';
        server.debug(`Vessel inside alarm radius ${k}`);
      } else {
        condition = 'outside';
        server.debug(`Vessel outside alarm radius ${k}`);
      }
    } else {
      if (isPointInPolygon(position, v.coords)) {
        condition = 'inside';
        server.debug(`Vessel inside alarm area ${k}`);
      } else {
        condition = 'outside';
        server.debug(`Vessel outside alarm area ${k}`);
      }
    }
    alarmManager.update(k, condition);
  });
};
