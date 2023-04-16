// **** Experiment: PyPilot integration ****

//import { ServerAPI, ActionResult } from '@panaaj/sk-types'
import { Plugin, PluginServerApp } from '@signalk/server-api';
import { Request, Response } from 'express';
import { FreeboardHelperApp } from '.';

import { io, Socket } from 'socket.io-client';

export interface PYPILOT_CONFIG {
  enable: boolean;
  host: string;
  port: number;
}

const apData: any = {
  options: {
    state: ['enabled', 'disabled'],
    mode: []
  },
  state: null,
  mode: null,
  target: null
};

let server: FreeboardHelperApp;
let pluginId: string;
let socket: Socket;

const AUTOPILOT_API_PATH = '/signalk/v2/api/vessels/self/steering/autopilot';

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

  initPyPilotListeners();
};

export const closePyPilot = () => {
  if (socket) {
    socket.close();
  }
  if (server) {
    server.handleMessage(
      pluginId,
      {
        updates: [
          {
            values: [
              {
                path: 'steering.autopilot.href',
                value: null
              }
            ]
          }
        ]
      },
      'v2'
    );
  }
};

const initApiRoutes = () => {
  server.debug(`** Registering API endpoint(s): ${AUTOPILOT_API_PATH} **`);
  server.get(`${AUTOPILOT_API_PATH}/config`, (req: Request, res: Response) => {
    server.debug(`GET ${AUTOPILOT_API_PATH}/config`);
    res.status(200);
    res.json(apData);
  });

  server.get(`${AUTOPILOT_API_PATH}/state`, (req: Request, res: Response) => {
    server.debug(`GET ${AUTOPILOT_API_PATH}/state`);
    res.status(200);
    res.json(apData.state);
  });

  server.put(`${AUTOPILOT_API_PATH}/state`, (req: Request, res: Response) => {
    server.debug(`PUT ${AUTOPILOT_API_PATH}/state`);

    if (typeof req.body.value === 'undefined') {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    if (!apData.options.state.includes(req.body.value)) {
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

  server.get(`${AUTOPILOT_API_PATH}/mode`, (req: Request, res: Response) => {
    server.debug(`GET ${AUTOPILOT_API_PATH}/mode`);
    res.status(200);
    res.json(apData.mode);
  });

  server.put(`${AUTOPILOT_API_PATH}/mode`, (req: Request, res: Response) => {
    server.debug(`PUT ${AUTOPILOT_API_PATH}/mode`);

    if (typeof req.body.value === 'undefined') {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Error: Invalid value supplied!`
      });
      return;
    }

    if (!apData.options.mode.includes(req.body.value)) {
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

    // flag pypilot as active pilot
    server.handleMessage(
      pluginId,
      {
        updates: [
          {
            values: [
              {
                path: 'steering.autopilot.href',
                value: `./pypilot`
              }
            ]
          }
        ]
      },
      'v2'
    );
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
const sendToPyPilot = (command: string, value: any) => {
  server.debug(`command: ${command} = ${value}`);
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
    if (typeof value === 'string') {
      value = (180 / Math.PI) * parseFloat(value); // rad to deg
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
const handlePyPilotUpdateMsg = (data: any) => {
  // compare and send delta

  /*if (typeof data['ap.heading'] !== 'undefined') {
    let heading = data['ap.heading'] === false ? null : data['ap.heading']
    if (heading !== apData.heading) {
      apData.heading = heading
      emitAPDelta('target', (Math.PI /180) * apData.heading)
    }
  }*/

  if (typeof data['ap.heading_command'] !== 'undefined') {
    const heading =
      data['ap.heading_command'] === false ? null : data['ap.heading_command'];
    if (heading !== apData.heading_command) {
      apData.target = heading;
      emitAPDelta('target', (Math.PI / 180) * apData.heading_command);
    }
  }

  if (typeof data['ap.mode'] !== 'undefined') {
    server.debug(`ap.mode -> data = ${JSON.stringify(data)}`);
    if (data['ap.mode'] !== apData.mode) {
      apData.mode = data['ap.mode'];
      emitAPDelta('mode', apData.mode);
    }
  }

  if (typeof data['ap.enabled'] !== 'undefined') {
    if (data['ap.enabled'] !== apData.state) {
      apData.state = data['ap.enabled'] ? 'enabled' : 'disabled';
      emitAPDelta('state', apData.state);
    }
  }
};

// process received pypilot_values message and send SK delta
const handlePyPilotValuesMsg = (data: any) => {
  // available modes
  if (typeof data['ap.mode'] !== undefined && data['ap.mode'].choices) {
    apData.options.mode = Array.isArray(data['ap.mode'].choices)
      ? data['ap.mode'].choices
      : [];
    //emitAPDelta('availableModes', apData.availableModes)
  }
  // available states
  //emitAPDelta('availableStates', ['enabled', 'disabled'])
};

// emit SK delta steering.autopilot.xxx
const emitAPDelta = (path: string, value: any) => {
  const pathRoot = 'steering.autopilot';
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
    'v2'
  );
};
