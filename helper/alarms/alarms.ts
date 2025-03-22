// **** Signal K Standard ALARMS notifier ****
import { NextFunction, Request, Response } from 'express';
import {
  ALARM_METHOD,
  ALARM_STATE,
  Path,
  PathValue,
  Position,
  SKVersion
} from '@signalk/server-api';
import { FreeboardHelperApp } from '../index';
import * as uuid from 'uuid'

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

let server: FreeboardHelperApp;
let pluginId: string;
const ALARM_API_PATH = '/signalk/v2/api/alarms';

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
        handleV1PutRequest
      );
    });
  }

  initAlarmEndpoints();
};

const initAlarmEndpoints = () => {
  server.debug(`** Registering Alarm Action API endpoint(s) **`);

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
        res.status(r.statusCode).json(Object.assign(r, {id: id}));
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
        const al = server.getSelfPath(`notifications.${req.params.alarmType}.${req.params.id}`);
        if (al && al.value) {
          server.debug('Alarm value....');
          if (al.value.method && al.value.method.includes('sound')) {
            server.debug('Alarm has sound... silence!!!');
            al.value.method = al.value.method.filter(i => i !== 'sound');
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
    r.position = pos.value
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

// ** send notification delta message **
const emitNotification = (msg: PathValue) => {
  const delta = {
    updates: [{ values: [msg] }]
  };
  server.handleMessage(pluginId, delta, SKVersion.v2);
};
