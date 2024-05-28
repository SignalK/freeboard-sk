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
  'abandon'
];

let server: FreeboardHelperApp;
let pluginId: string;
const ALARM_API_PATH = '/signalk/v2/api/alarms';

export const initAlarms = (app: FreeboardHelperApp, id: string) => {
  server = app;
  pluginId = id;

  server.debug(`** initAlarms() **`);

  if (server.registerPutHandler) {
    server.debug(`** Registering Alarm Action Handler(s) **`);
    STANDARD_ALARMS.forEach((i) => {
      server.debug(`** Registering ${i} Handler **`);
      server.registerPutHandler(
        'vessels.self',
        `notifications.${i}`,
        handlePutAlarmState
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
      server.debug(`** POST ${ALARM_API_PATH}/${req.params.alarmType}`);
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        next();
        return;
      }
      try {
        const msg = req.body.message
          ? req.body.message
          : (req.params.alarmType as string);

        const r = handlePutAlarmState(
          'vessels.self',
          `notifications.${req.params.alarmType}` as Path,
          {
            message: msg,
            method: [ALARM_METHOD.sound, ALARM_METHOD.visual],
            state: ALARM_STATE.emergency
          }
        );
        res.status(200).json(r);
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
    `${ALARM_API_PATH}/:alarmType/silence`,
    (req: Request, res: Response) => {
      server.debug(`** POST ${req.path}`);
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        res.status(200).json({
          state: 'COMPLETED',
          statusCode: 200,
          message: `Unsupported Alarm (${req.params.alarmType}).`
        });
        return;
      }
      try {
        const al = server.getSelfPath(`notifications.${req.params.alarmType}`);
        if (al && al.value) {
          server.debug('Alarm value....');
          if (al.value.method && al.value.method.includes('sound')) {
            server.debug('Alarm has sound... silence!!!');
            al.value.method = al.value.method.filter((i) => i !== 'sound');
            const r = handlePutAlarmState(
              'vessels.self',
              `notifications.${req.params.alarmType}` as Path,
              al.value
            );
            res.status(200).json(r);
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
            `Alarm (${req.params.alarmType}) has no value or was not found!`
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
    `${ALARM_API_PATH}/:alarmType`,
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** DELETE ${ALARM_API_PATH}/${req.params.alarmType}`);
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        next();
        return;
      }
      try {
        const r = handlePutAlarmState(
          'vessels.self',
          `notifications.${req.params.alarmType}` as Path,
          {
            message: '',
            method: [],
            state: ALARM_STATE.normal
          }
        );
        res.status(200).json(r);
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

const handlePutAlarmState = (
  context: string,
  path: Path,
  value: {
    message: string;
    state: ALARM_STATE;
    method: ALARM_METHOD[];
  }
) => {
  server.debug(context);
  server.debug(path);
  server.debug(JSON.stringify(value));
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
  const alarmType = pa[pa.length - 1];
  server.debug(JSON.stringify(alarmType));
  let noti: PathValue;
  if (value) {
    const alm = value.state === ALARM_STATE.normal ? null : buildAlarmData();
    noti = {
      path: `notifications.${alarmType}` as Path,
      value: {
        state: value.state ?? null,
        method: value.method ?? null,
        message: value.message
      }
    };
    if (alm && alm.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (noti.value as any).data = alm.data;
    }
  } else {
    noti = {
      path,
      value: null
    };
  }
  if (STANDARD_ALARMS.includes(alarmType)) {
    // ** send delta **
    server.debug(`****** Sending Delta (Std Alarm Notification): ******`);
    emitNotification(noti);
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

const buildAlarmData = () => {
  const pos: { value: Position } = server.getSelfPath('navigation.position');
  return {
    data: {
      position: pos ? pos.value : null
    }
  };
};

// ** send notification delta message **
const emitNotification = (msg: PathValue) => {
  const delta = {
    updates: [{ values: [msg] }]
  };
  server.handleMessage(pluginId, delta, SKVersion.v2);
};
