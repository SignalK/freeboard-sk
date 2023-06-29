// **** Signal K Standard ALARMS notifier ****
import { NextFunction, Request, Response } from 'express';
import {
  Notification,
  DeltaMessage,
  ActionResult,
  ALARM_METHOD,
  ALARM_STATE
} from '../lib/types';
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
  server.put(
    '/signalk/v2/api/notifications/:alarmType',
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(
        `** PUT /signalk/v2/api/notifications/${req.params.alarmType}`
      );
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
          `notifications.${req.params.alarmType}`,
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
  server.delete(
    '/signalk/v2/api/notifications/:alarmType',
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(
        `** DELETE /signalk/v2/api/notifications/${req.params.alarmType}`
      );
      if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
        next();
        return;
      }
      try {
        const r = handlePutAlarmState(
          'vessels.self',
          `notifications.${req.params.alarmType}`,
          null
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
  path: string,
  value: {
    message: string;
    state: ALARM_STATE;
    method: ALARM_METHOD[];
  }
): ActionResult => {
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
  let noti: Notification | DeltaMessage;
  if (value) {
    noti = new Notification(
      alarmType,
      buildAlarmMessage(value.message, alarmType),
      value.state ?? null,
      value.method ?? null
    );
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

const buildAlarmMessage = (message: string, alarmType?: string): string => {
  let msgAttrib = '';
  if (['mob', 'sinking'].includes(alarmType)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos: any = server.getSelfPath('navigation.position');
    msgAttrib = pos ? JSON.stringify(pos?.value) : '';
  }
  return `${message}\n\r${msgAttrib}`;
};

// ** send notification delta message **
const emitNotification = (n: Notification | DeltaMessage) => {
  const msg = n instanceof Notification ? n.message : n;
  const delta = {
    updates: [{ values: [msg] }]
  };
  server.handleMessage(pluginId, delta);
};
