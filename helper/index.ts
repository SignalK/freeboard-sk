import {
  Context,
  Meta,
  Path,
  Plugin,
  ServerAPI,
  SKVersion
} from '@signalk/server-api';
import { IRouter, Application, Request, Response } from 'express';
import { initAlarms, shutdownAlarms } from './alarms/alarms.js';

import openapi from './openApi.json' with { type: 'json' };

//const defaultPollInterval = 60;

const CONFIG_SCHEMA = {
  properties: {}
};

const CONFIG_UISCHEMA = {};

interface SETTINGS {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alarms: { [key: string]: any };
}

export interface FreeboardHelperApp extends Application, ServerAPI {}

export default (server: FreeboardHelperApp): Plugin => {
  // ** default configuration settings
  let settings: SETTINGS = {
    alarms: {
      enable: true
    }
  };

  // ******** REQUIRED PLUGIN DEFINITION *******
  const plugin: Plugin = {
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

      /**
       * emit metas for environment paths
       * @todo remove after merge of https://github.com/SignalK/specification/pull/662
       */
      emitMeteoMetas();

      settings.alarms = options.alarms ?? {
        enable: true
      };
      // const f = await server.getFeatures();
      settings.alarms.enable = true; //!f.apis.includes('notifications' as any);

      server.debug(`Applied config: ${JSON.stringify(settings)}`);

      if (settings.alarms.enable) {
        initAlarms(server, plugin.id);
      }
      server.setPluginStatus('Started');
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
    server.debug('** Un-subscribing from events **');
    shutdownAlarms();
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

  /**
   * Ensure meta delta are emitted for environment paths
   * @todo remove after merge of https://github.com/SignalK/specification/pull/662
   */
  const emitMeteoMetas = () => {
    const pathRoot = 'environment';
    const metas: Meta[] = [];
    server.debug('**** Building METEO metas *****');
    metas.push({
      path: `${pathRoot}.date` as Path,
      value: {
        description: 'Time of measurement.'
      }
    });
    metas.push({
      path: `${pathRoot}.sun.sunrise` as Path,
      value: {
        description: 'Time of sunrise at the related position.'
      }
    });
    metas.push({
      path: `${pathRoot}.sun.sunset` as Path,
      value: {
        description: 'Time of sunset at the related position.'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.uvIndex` as Path,
      value: {
        description: 'Level of UV radiation. 1 UVI = 25mW/sqm',
        units: 'UVI'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.cloudCover` as Path,
      value: {
        description: 'Cloud clover.',
        units: 'ratio'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.temperature` as Path,
      value: {
        description: 'Outside air temperature.',
        units: 'K'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.dewPointTemperature` as Path,
      value: {
        description: 'Dew point.',
        units: 'K'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.feelsLikeTemperature` as Path,
      value: {
        description: 'Feels like temperature.',
        units: 'K'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.horizontalVisibility` as Path,
      value: {
        description: 'Horizontal visibility.',
        units: 'm'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.horizontalVisibilityOverRange` as Path,
      value: {
        description:
          'Visibilty distance is greater than the range of the measuring equipment.'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.pressure` as Path,
      value: {
        description: 'Barometric pressure.',
        units: 'Pa'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.pressureTendency` as Path,
      value: {
        description:
          'Integer value indicating barometric pressure value tendency e.g. 0 = steady, etc.'
      }
    });

    metas.push({
      path: `${pathRoot}.outside.pressureTendencyType` as Path,
      value: {
        description:
          'Description for the value of pressureTendency e.g. steady, increasing, decreasing.'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.relativeHumidity` as Path,
      value: {
        description: 'Relative humidity.',
        units: 'ratio'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.absoluteHumidity` as Path,
      value: {
        description: 'Absolute humidity.',
        units: 'ratio'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.precipitationVolume` as Path,
      value: {
        description: 'Precipitation Volume.',
        units: 'm'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.averageSpeed` as Path,
      value: {
        description: 'Average wind speed.',
        units: 'm/s'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.speedTrue` as Path,
      value: {
        description: 'True wind speed.',
        units: 'm/s'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.directionTrue` as Path,
      value: {
        description: 'The wind direction relative to true north.',
        units: 'rad'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.gust` as Path,
      value: {
        description: 'Maximum wind gust.',
        units: 'm/s'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.gustDirectionTrue` as Path,
      value: {
        description: 'Maximum wind gust direction.',
        units: 'rad'
      }
    });

    metas.push({
      path: `${pathRoot}.wind.gust` as Path,
      value: {
        description: 'Maximum wind gust.',
        units: 'm/s'
      }
    });

    metas.push({
      path: `${pathRoot}.water.level` as Path,
      value: {
        description: 'Water level.',
        units: 'm'
      }
    });

    metas.push({
      path: `${pathRoot}.water.temperature` as Path,
      value: {
        description: 'Water temperature.',
        units: 'K'
      }
    });

    metas.push({
      path: `${pathRoot}.water.salinity` as Path,
      value: {
        description: 'Water salinity.',
        units: 'ratio'
      }
    });

    metas.push({
      path: `${pathRoot}.water.levelTendency` as Path,
      value: {
        description:
          'Integer value indicating water level tendency e.g. 0 = steady, etc.'
      }
    });

    metas.push({
      path: `${pathRoot}.water.levelTendencyType` as Path,
      value: {
        description:
          'Description for the value of levelTendency e.g. steady, increasing, decreasing.'
      }
    });

    metas.push({
      path: `${pathRoot}.water.current.set` as Path,
      value: {
        description: 'Water current direction.',
        units: 'rad'
      }
    });

    metas.push({
      path: `${pathRoot}.water.current.drift` as Path,
      value: {
        description: 'Water current speed.',
        units: 'm/s'
      }
    });

    metas.push({
      path: `${pathRoot}.water.waves.significantHeight` as Path,
      value: {
        description: 'Significant wave height.',
        units: 'm'
      }
    });

    metas.push({
      path: `${pathRoot}.water.waves.period` as Path,
      value: {
        description: 'Wave period.',
        units: 'ms'
      }
    });

    metas.push({
      path: `${pathRoot}.water.waves.direction` as Path,
      value: {
        description: 'Wave direction.',
        units: 'rad'
      }
    });

    metas.push({
      path: `${pathRoot}.water.swell.significantHeight` as Path,
      value: {
        description: 'Significant swell height.',
        units: 'm'
      }
    });

    metas.push({
      path: `${pathRoot}.water.swell.period` as Path,
      value: {
        description: 'Swell period.',
        units: 'ms'
      }
    });

    metas.push({
      path: `${pathRoot}.water.swell.directionTrue` as Path,
      value: {
        description: 'Swell direction.',
        units: 'rad'
      }
    });

    server.debug('****  Sending METEO metas *****');
    server.handleMessage(
      plugin.id,
      {
        context: `meteo` as Context,
        updates: [
          {
            meta: metas
          }
        ]
      },
      SKVersion.v1
    );
  };

  return plugin;
};
