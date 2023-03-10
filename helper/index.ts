import {
  Plugin,
  PluginServerApp,
  ResourceProviderRegistry
} from '@signalk/server-api';
import { IRouter, Application, Request, Response } from 'express';
import { initAlarms } from './alarms/alarms';
import { ActionResult } from './lib/types';
import * as pkg from '../package.json';

import {
  WEATHER_SERVICES,
  WEATHER_CONFIG,
  initWeather,
  stopWeather,
  getWeather,
  listWeather
} from './weather';

import { initPyPilot, PYPILOT_CONFIG, closePyPilot } from './pypilot';

import * as openapi from './openApi.json';

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
      description: 'Weather service settings.',
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
        service: {
          type: 'string',
          title: 'Weather service',
          default: 'openweather',
          enum: WEATHER_SERVICES,
          description: 'Select the weather service'
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
      'ui:disabled': false
    },
    service: {
      'ui:disabled': false
    }
  }
};

interface SETTINGS {
  alarms: { [key: string]: any };
  weather: WEATHER_CONFIG;
  pypilot: PYPILOT_CONFIG;
}

interface OpenApiPlugin extends Plugin {
  getOpenApi: () => any;
}

export interface FreeboardHelperApp
  extends Application,
    PluginServerApp,
    ResourceProviderRegistry {
  statusMessage?: () => string;
  error: (msg: string) => void;
  debug: (msg: string) => void;
  setPluginStatus: (pluginId: string, status?: string) => void;
  setPluginError: (pluginId: string, status?: string) => void;
  setProviderStatus: (providerId: string, status?: string) => void;
  setProviderError: (providerId: string, status?: string) => void;
  getSelfPath: (path: string) => void;
  savePluginOptions: (options: any, callback: () => void) => void;
  config: { configPath: string };

  handleMessage: (id: string | null, msg: any, version?: string) => void;
  streambundle: {
    getSelfBus: (path: string | void) => any;
  };
  registerPutHandler: (
    context: string,
    path: string,
    callback: (
      context: string,
      path: string,
      value: any,
      actionResultCallback: (actionResult: ActionResult) => void
    ) => ActionResult
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
      service: 'openweather'
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
        service: 'openweather'
      };
      settings.weather.enable = options.weather.enable ?? false;
      settings.weather.apiKey = options.weather.apiKey ?? '';
      settings.weather.service = options.weather.service ?? 'openweather';

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

      const result = registerProvider('weather');
      const msg = `Started - ${
        result.length !== 0 ? `${result} not registered!` : 'Providing: weather'
      }`;

      if (settings.weather.enable) {
        initWeather(server, plugin.id, settings.weather);
      }
      if (settings.pypilot.enable) {
        initPyPilot(server, plugin.id, settings.pypilot);
      }

      server.setPluginStatus(msg);
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

  const registerProvider = (resType: string): string => {
    let failed = '';
    try {
      server.registerResourceProvider({
        type: resType,
        methods: {
          listResources: (params: object): any => {
            return listWeather(params);
          },
          getResource: (path: string, property?: string) => {
            return getWeather(path, property);
          },
          setResource: (id: string, value: any) => {
            throw 'Not implemented!';
          },
          deleteResource: (id: string) => {
            throw 'Not implemented!';
          }
        }
      });
    } catch (error) {
      failed = resType;
    }
    return failed;
  };

  const initApiEndpoints = (router: IRouter) => {
    server.debug(`Initialising Freeboard-SK plugin endpoints.......`);

    router.get('/settings', (req: Request, res: Response) => {
      res.status(200).json({
        id: plugin.id,
        name: plugin.name,
        version: pkg.version,
        settings: settings
      });
    });
  };

  return plugin;
};
