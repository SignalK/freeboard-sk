import { Context, Plugin, ServerAPI, SKVersion } from '@signalk/server-api';
import { IRouter, Application, Request, Response } from 'express';
import { initAlarms, shutdownAlarms } from './alarms/alarms';

import * as openapi from './openApi.json';

const defaultPollInterval = 60;

const CONFIG_SCHEMA = {
  properties: {}
};

const CONFIG_UISCHEMA = {};

interface SETTINGS {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alarms: { [key: string]: any };
}

export interface FreeboardHelperApp extends Application, ServerAPI {}

module.exports = (server: FreeboardHelperApp): Plugin => {
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
    const metas = [];
    server.debug('**** Building METEO metas *****');
    metas.push({
      path: `${pathRoot}.date`,
      value: {
        description: 'Time of measurement.'
      }
    });
    metas.push({
      path: `${pathRoot}.sun.sunrise`,
      value: {
        description: 'Time of sunrise at the related position.'
      }
    });
    metas.push({
      path: `${pathRoot}.sun.sunset`,
      value: {
        description: 'Time of sunset at the related position.'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.uvIndex`,
      value: {
        description: 'Level of UV radiation. 1 UVI = 25mW/sqm',
        units: 'UVI'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.cloudCover`,
      value: {
        description: 'Cloud clover.',
        units: 'ratio'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.temperature`,
      value: {
        description: 'Outside air temperature.',
        units: 'K'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.dewPointTemperature`,
      value: {
        description: 'Dew point.',
        units: 'K'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.feelsLikeTemperature`,
      value: {
        description: 'Feels like temperature.',
        units: 'K'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.horizontalVisibility`,
      value: {
        description: 'Horizontal visibility.',
        units: 'm'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.horizontalVisibilityOverRange`,
      value: {
        description:
          'Visibilty distance is greater than the range of the measuring equipment.'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.pressure`,
      value: {
        description: 'Barometric pressure.',
        units: 'Pa'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.pressureTendency`,
      value: {
        description:
          'Integer value indicating barometric pressure value tendency e.g. 0 = steady, etc.'
      }
    });

    metas.push({
      path: `${pathRoot}.outside.pressureTendencyType`,
      value: {
        description:
          'Description for the value of pressureTendency e.g. steady, increasing, decreasing.'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.relativeHumidity`,
      value: {
        description: 'Relative humidity.',
        units: 'ratio'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.absoluteHumidity`,
      value: {
        description: 'Absolute humidity.',
        units: 'ratio'
      }
    });
    metas.push({
      path: `${pathRoot}.outside.precipitationVolume`,
      value: {
        description: 'Precipitation Volume.',
        units: 'm'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.averageSpeed`,
      value: {
        description: 'Average wind speed.',
        units: 'm/s'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.speedTrue`,
      value: {
        description: 'True wind speed.',
        units: 'm/s'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.directionTrue`,
      value: {
        description: 'The wind direction relative to true north.',
        units: 'rad'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.gust`,
      value: {
        description: 'Maximum wind gust.',
        units: 'm/s'
      }
    });
    metas.push({
      path: `${pathRoot}.wind.gustDirectionTrue`,
      value: {
        description: 'Maximum wind gust direction.',
        units: 'rad'
      }
    });

    metas.push({
      path: `${pathRoot}.wind.gust`,
      value: {
        description: 'Maximum wind gust.',
        units: 'm/s'
      }
    });

    metas.push({
      path: `${pathRoot}.water.level`,
      value: {
        description: 'Water level.',
        units: 'm'
      }
    });

    metas.push({
      path: `${pathRoot}.water.temperature`,
      value: {
        description: 'Water temperature.',
        units: 'K'
      }
    });

    metas.push({
      path: `${pathRoot}.water.salinity`,
      value: {
        description: 'Water salinity.',
        units: 'ratio'
      }
    });

    metas.push({
      path: `${pathRoot}.water.levelTendency`,
      value: {
        description:
          'Integer value indicating water level tendency e.g. 0 = steady, etc.'
      }
    });

    metas.push({
      path: `${pathRoot}.water.levelTendencyType`,
      value: {
        description:
          'Description for the value of levelTendency e.g. steady, increasing, decreasing.'
      }
    });

    metas.push({
      path: `${pathRoot}.water.current.set`,
      value: {
        description: 'Water current direction.',
        units: 'rad'
      }
    });

    metas.push({
      path: `${pathRoot}.water.current.drift`,
      value: {
        description: 'Water current speed.',
        units: 'm/s'
      }
    });

    metas.push({
      path: `${pathRoot}.water.waves.significantHeight`,
      value: {
        description: 'Significant wave height.',
        units: 'm'
      }
    });

    metas.push({
      path: `${pathRoot}.water.waves.period`,
      value: {
        description: 'Wave period.',
        units: 'ms'
      }
    });

    metas.push({
      path: `${pathRoot}.water.waves.direction`,
      value: {
        description: 'Wave direction.',
        units: 'rad'
      }
    });

    metas.push({
      path: `${pathRoot}.water.swell.significantHeight`,
      value: {
        description: 'Significant swell height.',
        units: 'm'
      }
    });

    metas.push({
      path: `${pathRoot}.water.swell.period`,
      value: {
        description: 'Swell period.',
        units: 'ms'
      }
    });

    metas.push({
      path: `${pathRoot}.water.swell.directionTrue`,
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
