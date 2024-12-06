// **** Experiment: PyPilot integration ****

import { Request, Response } from 'express';
import { FreeboardHelperApp } from '..';
import { Path, SKVersion } from '@signalk/server-api';

import { io, Socket } from 'socket.io-client';

export interface PYPILOT_CONFIG {
  enable: boolean;
  host: string;
  port: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apData: any = {
  options: {
    states: ['enabled', 'disabled'],
    modes: []
  },
  state: null,
  mode: null,
  target: null,
  engaged: false
};

let server: FreeboardHelperApp;
let pluginId: string;
let socket: Socket;

const AUTOPILOT_API_PATH = '/signalk/v2/api/vessels/self/steering/autopilot';
const DEAFULT_AP = `${AUTOPILOT_API_PATH}/default`;

// initialise connection to autopilot, register socket listeners and SK AP path PUT handlers
export const initPyPilot = (
  app: FreeboardHelperApp,
  id: string,
  config: PYPILOT_CONFIG
) => {
  server = app;
  pluginId = id;

  server.debug(`** Connecting to PyPilot **`);
  socket = io(`http://${config.host}:${config.port}`);

  if (!socket) {
    console.log(
      `PyPilot NOT connected @ ${config.host}:${config.port}... ensure 'pypilot_web' is running.`
    );
  }

  // API endpoints
  initApiRoutes();
  emitAPDelta('defaultPilot' as Path, pluginId);

  initPyPilotListeners();
};

export const closePyPilot = () => {
  if (socket) {
    socket.close();
  }
};

const initApiRoutes = () => {
  server.debug(`** Registering API endpoint(s): ${AUTOPILOT_API_PATH} **`);

  server.get(`${DEAFULT_AP}`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}`);
    res.status(200);
    res.json(apData);
  });

  server.get(`${AUTOPILOT_API_PATH}`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${AUTOPILOT_API_PATH}`);
    res.status(200).json({
      'freeboard-sk': { provider: 'freeboard-sk', isDefault: true }
    });
  });

  server.get(
    `${AUTOPILOT_API_PATH}/defaultPilot`,
    (req: Request, res: Response) => {
      server.debug(`${req.method} ${AUTOPILOT_API_PATH}/defaultPilot`);
      res.status(200).json({ id: pluginId });
    }
  );

  server.get(`${DEAFULT_AP}/state`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/state`);
    res.status(200).json({ value: apData.state });
  });

  server.put(`${DEAFULT_AP}/state`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/state`);

    if (typeof req.body.value === 'undefined') {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    if (!apData.options.states.includes(req.body.value)) {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    const r = sendToPyPilot('state', req.body.value);
    res.status(r.statusCode).json(r);
  });

  server.get(`${DEAFULT_AP}/mode`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/mode`);
    res.status(200).json({ value: apData.mode });
  });

  server.put(`${DEAFULT_AP}/mode`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/mode`);

    if (typeof req.body.value === 'undefined') {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    if (!apData.options.modes.includes(req.body.value)) {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    const r = sendToPyPilot('mode', req.body.value);
    res.status(r.statusCode).json(r);
  });

  server.put(`${DEAFULT_AP}/target`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/target`);

    if (typeof req.body.value !== 'number') {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    let deg = req.body.value;
    if (deg > 359) {
      deg = 359;
    } else if (deg < -179) {
      deg = -179;
    }

    const r = sendToPyPilot('target', deg);
    res.status(r.statusCode).json(r);
  });

  server.put(`${DEAFULT_AP}/target/adjust`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/target/adjust`);

    if (typeof req.body.value !== 'number') {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    let deg = apData.target + req.body.value;
    if (deg > 360) {
      deg = 360;
    } else if (deg < -180) {
      deg = -180;
    }

    const r = sendToPyPilot('target', deg);
    res.status(r.statusCode).json(r);
  });

  server.post(`${DEAFULT_AP}/engage`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/engage`);

    const r = sendToPyPilot('state', 'enabled');
    res.status(r.statusCode).json(r);
  });

  server.post(`${DEAFULT_AP}/disengage`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/disengage`);

    const r = sendToPyPilot('state', 'disabled');
    res.status(r.statusCode).json(r);
  });

  server.post(`${DEAFULT_AP}/tack/port`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/tack/port`);

    const r = sendToPyPilot('tack', 'port');
    res.status(r.statusCode).json(r);
  });

  server.post(`${DEAFULT_AP}/tack/starboard`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/tack/starboard`);

    const r = sendToPyPilot('tack', 'starboard');
    res.status(r.statusCode).json(r);
  });

  server.post(`${DEAFULT_AP}/gybe/port`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/gybe/port`);

    res.status(501).json({
      state: 'COMPLETED',
      statusCode: 501,
      message: 'Not implemented!'
    });
  });

  server.post(`${DEAFULT_AP}/gybe/starboard`, (req: Request, res: Response) => {
    server.debug(`${req.method} ${DEAFULT_AP}/gybe/starboard`);

    res.status(501).json({
      state: 'COMPLETED',
      statusCode: 501,
      message: 'Not implemented!'
    });
  });
};

// PyPilot socket event listeners
const initPyPilotListeners = () => {
  socket.on('connect', () => {
    server.debug('socket connected...');
    const msg = `Started: Connected to PyPilot.`;
    server.setPluginStatus(msg);

    setTimeout(() => {
      const period = 1;
      socket.emit('pypilot', `watch={"ap.heading": ${JSON.stringify(period)}}`);
      socket.emit(
        'pypilot',
        `watch={"ap.heading_command": ${JSON.stringify(period)}}`
      );
      socket.emit('pypilot', `watch={"ap.enabled": ${JSON.stringify(period)}}`);
      socket.emit('pypilot', `watch={"ap.mode": ${JSON.stringify(period)}}`);
    }, 1000);
  });

  socket.on('connect_error', () => {
    server.debug('socket connect_error!');
    server.setPluginStatus(`Unable to connect to PyPilot!`);
  });

  // pypilot updates listener
  socket.on('pypilot', (msg) => {
    handlePyPilotUpdateMsg(JSON.parse(msg));
  });

  // pypilot_values listener
  socket.on('pypilot_values', (msg) => {
    handlePyPilotValuesMsg(JSON.parse(msg));
  });
};

// Send values to pypilot
const sendToPyPilot = (command: string, value: string | number | boolean) => {
  server.debug(`sendToPyPilot: ${command} = ${value}`);
  let mode = '';

  if (command === 'mode') {
    if (typeof value === 'string') {
      mode = 'ap.mode';
    }
  } else if (command === 'state') {
    if (typeof value === 'string') {
      value = value === 'enabled' ? true : false;
      mode = 'ap.enabled';
    }
  } else if (command === 'target') {
    server.debug(`command: ${command}, value: ${value}, ${typeof value}`);
    if (typeof value === 'number') {
      mode = 'ap.heading_command';
    }
  } else {
    server.debug('Error: Invalid command!');
    return {
      state: 'FAILED',
      statusCode: 404,
      message: `Invalid command!`
    };
  }

  try {
    server.debug(`out -> ${mode}=${JSON.stringify(value)}`);
    socket.emit('pypilot', mode + '=' + JSON.stringify(value));
    return {
      state: 'COMPLETED',
      statusCode: 200
    };
  } catch (error) {
    return {
      state: 'FAILED',
      statusCode: 404,
      message: `Invalid command!`
    };
  }
};

// process received pypilot update messages and send SK delta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlePyPilotUpdateMsg = (data: any) => {
  //server.debug(`-> pilot data = ${JSON.stringify(data)}`);

  if (typeof data['ap.heading_command'] !== 'undefined') {
    server.debug(`ap.heading_command -> ${data['ap.heading_command']}`);
    const h =
      data['ap.heading_command'] === false ? null : data['ap.heading_command'];
    apData.target = h;
    const h_rad = (Math.PI / 180) * apData.target;
    server.debug(`ap.heading_command -> deg: ${apData.target}, rad: ${h_rad}`);
    emitAPDelta('target' as Path, h_rad);
  }

  if (typeof data['ap.mode'] !== 'undefined') {
    apData.mode = data['ap.mode'];
    server.debug(`ap.mode -> ${data['ap.mode']}`);
    emitAPDelta('mode' as Path, apData.mode);
  }

  if (typeof data['ap.enabled'] !== 'undefined') {
    apData.state = data['ap.enabled'] ? 'enabled' : 'disabled';
    apData.engaged = apData.state === 'enabled' ? true : false;
    server.debug(`ap.enabled -> ${data['ap.enabled']}`);
    emitAPDelta('state' as Path, apData.state);
    emitAPDelta('engaged' as Path, apData.engaged);
  }
};

// process received pypilot_values message and send SK delta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlePyPilotValuesMsg = (data: any) => {
  // available modes
  if (typeof data['ap.mode'] !== undefined && data['ap.mode'].choices) {
    apData.options.modes = Array.isArray(data['ap.mode'].choices)
      ? data['ap.mode'].choices
      : [];
  }
};

// emit SK delta steering.autopilot.xxx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emitAPDelta = (path: Path, value: any) => {
  const pathRoot: Path = 'steering.autopilot' as Path;
  const msg = {
    path: `${pathRoot}.${path}`,
    value: value
  };
  server.debug(`delta ${path} -> ${JSON.stringify(msg)}`);
  server.handleMessage(
    pluginId,
    {
      updates: [
        {
          values: [msg]
        }
      ]
    },
    SKVersion.v2
  );
};
