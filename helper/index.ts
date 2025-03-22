import { Plugin, ServerAPI } from '@signalk/server-api';
import { IRouter, Application, Request, Response } from 'express';
import { initAlarms } from './alarms/alarms';

import {
  WEATHER_POLL_INTERVAL,
  WEATHER_CONFIG,
  initWeather,
  stopWeather
} from './weather/weather-service';

import * as openapi from './openApi.json';

const defaultPollInterval = 60;

const CONFIG_SCHEMA = {
  properties: {
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
        apiVersion: {
          type: 'number',
          title: 'API Version',
          default: 3,
          enum: [3, 2],
          description: 'Note: v2 API not supported after April 2024!'
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
    apiVersion: {
      'ui:widget': 'select',
      'ui-help': ' '
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
      apiVersion: 3,
      apiKey: '',
      pollInterval: defaultPollInterval
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
        apiVersion: 3,
        apiKey: '',
        pollInterval: defaultPollInterval
      };
      settings.weather.enable = options.weather.enable ?? false;
      settings.weather.apiVersion = options.weather.apiVersion ?? 3;
      settings.weather.apiKey = options.weather.apiKey ?? '';
      settings.weather.pollInterval =
        options.weather.pollInterval ?? defaultPollInterval;

      settings.alarms = options.alarms ?? {
        enable: true
      };
      settings.alarms.enable = true;

      server.debug(`Applied config: ${JSON.stringify(settings)}`);

      if (settings.alarms.enable) {
        initAlarms(server, plugin.id);
      }

      let msg = '';
      if (settings.weather.enable) {
        msg = `Started - Providing: weather`;
        initWeather(server, plugin.id, settings.weather);
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
