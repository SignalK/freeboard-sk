import { Plugin, ServerAPI } from '@signalk/server-api';
import { IRouter, Application, Request, Response } from 'express';
import { initAlarms } from './alarms/alarms';

import {
  WEATHER_POLL_INTERVAL,
  WEATHER_CONFIG,
  initWeather,
  stopWeather
} from './weather';

import { initPyPilot, PYPILOT_CONFIG, closePyPilot } from './pypilot';

import * as openapi from './openApi.json';

const defaultPollInterval = 60;

const CONFIG_SCHEMA = {
  properties: {
    alarms: {
      type: 'object',
      title: 'Standard Alarms.',
      description: 'Standard Alarms request handler (MOB, etc.)',
      properties: {
        enable: {
          type: 'boolean',
          default: true,
          title: 'Enable Standard Alarms',
          description: ' '
        }
      }
    },
    weather: {
      type: 'object',
      title: 'Weather API.',
      description: 'OpenWeather service settings.',
      properties: {
        enable: {
          type: 'boolean',
          default: false,
          title: 'Enable Weather',
          description: ' '
        },
        apiKey: {
          type: 'string',
          title: 'API Key',
          default: '',
          description:
            'Get your API key at https://openweathermap.org/home/sign_up'
        },
        pollInterval: {
          type: 'number',
          title: 'Polling Interval',
          default: 60,
          enum: WEATHER_POLL_INTERVAL,
          description:
            'Select the interval at which the weather service is polled.'
        }
      }
    },
    pypilot: {
      type: 'object',
      title: 'PyPilot.',
      description: 'PyPilot host connection settings.',
      properties: {
        enable: {
          type: 'boolean',
          default: false,
          title: 'Enable PyPilot',
          description: ' '
        },
        host: {
          type: 'string',
          title: 'Host name / address',
          default: 'localhost'
        },
        port: {
          type: 'number',
          title: 'Port number',
          default: 8000
        }
      }
    }
  }
};

const CONFIG_UISCHEMA = {
  weather: {
    enable: {
      'ui:widget': 'checkbox',
      'ui:title': ' ',
      'ui:help': ' '
    },
    apiKey: {
      'ui:disabled': false,
      'ui-help': ''
    },
    pollInterval: {
      'ui:widget': 'select',
      'ui:title': 'Polling Interval (mins)',
      'ui:help': ' '
    }
  }
};

interface SETTINGS {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alarms: { [key: string]: any };
  weather: WEATHER_CONFIG;
  pypilot: PYPILOT_CONFIG;
}

interface OpenApiPlugin extends Plugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOpenApi: () => any;
}

export interface FreeboardHelperApp
  extends Application,
    Omit<ServerAPI, 'registerPutHandler'> {
  config: {
    ssl: boolean;
    configPath: string;
    version: string;
    getExternalPort: () => number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //handleMessage: (id: string | null, msg: any, version?: string) => void;
  streambundle: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSelfBus: (path: string | void) => any;
  };
  registerPutHandler: (
    context: string,
    path: string,
    callback: (
      context: string,
      path: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionResultCallback: (actionResult: any) => void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => any
  ) => void;
}

module.exports = (server: FreeboardHelperApp): OpenApiPlugin => {
  // ** default configuration settings
  let settings: SETTINGS = {
    alarms: {
      enable: true
    },
    weather: {
      enable: false,
      apiKey: '',
      pollInterval: defaultPollInterval
    },
    pypilot: {
      enable: false,
      host: 'localhost',
      port: 8000
    }
  };

  // ******** REQUIRED PLUGIN DEFINITION *******
  const plugin: OpenApiPlugin = {
    id: 'freeboard-sk',
    name: 'Freeboard-SK',
    schema: () => CONFIG_SCHEMA,
    uiSchema: () => CONFIG_UISCHEMA,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    start: (settings: any) => {
      doStartup(settings);
    },
    stop: () => {
      doShutdown();
    },
    registerWithRouter: (router) => {
      return initApiEndpoints(router);
    },
    getOpenApi: () => openapi
  };
  // ************************************

  const doStartup = (options: SETTINGS) => {
    try {
      server.debug(`${plugin.name} starting.......`);

      if (typeof options !== 'undefined') {
        settings = options;
      }

      settings.weather = options.weather ?? {
        enable: false,
        apiKey: '',
        pollInterval: defaultPollInterval
      };
      settings.weather.enable = options.weather.enable ?? false;
      settings.weather.apiKey = options.weather.apiKey ?? '';
      settings.weather.pollInterval =
        options.weather.pollInterval ?? defaultPollInterval;

      settings.alarms = options.alarms ?? {
        enable: true
      };
      settings.alarms.enable = options.alarms.enable ?? true;

      settings.pypilot = options.pypilot ?? {
        enable: false,
        host: 'localhost',
        port: 8000
      };
      settings.pypilot.enable = options.pypilot.enable ?? false;
      settings.pypilot.host = options.pypilot.host ?? 'localhost';
      settings.pypilot.port = options.pypilot.port ?? 8000;

      server.debug(`Applied config: ${JSON.stringify(settings)}`);

      if (settings.alarms.enable) {
        initAlarms(server, plugin.id);
      }

      let msg = '';
      if (settings.weather.enable) {
        msg = `Started - Providing: weather`;
        initWeather(server, plugin.id, settings.weather);
      }
      if (settings.pypilot.enable) {
        initPyPilot(server, plugin.id, settings.pypilot);
      }

      server.setPluginStatus(msg);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const msg = 'Started with errors!';
      server.setPluginError(msg);
      server.error('** EXCEPTION: **');
      server.error(error.stack);
      return error;
    }
  };

  const doShutdown = () => {
    server.debug('** shutting down **');
    stopWeather();
    closePyPilot();
    server.debug('** Un-subscribing from events **');
    const msg = 'Stopped';
    server.setPluginStatus(msg);
  };

  const initApiEndpoints = (router: IRouter) => {
    server.debug(`Initialising Freeboard-SK plugin endpoints.......`);

    router.get('/settings', (req: Request, res: Response) => {
      res.status(200).json({
        settings: settings
      });
    });
  };

  return plugin;
};
