// **** Experiment: OpenWeather integration ****
import {
  Position,
  SKVersion,
  ALARM_METHOD,
  ALARM_STATE
} from '@signalk/server-api';
import { FreeboardHelperApp } from '..';
import { OpenWeather } from './openweather';
import { Request, Response } from 'express';

export interface WEATHER_CONFIG {
  enable: boolean;
  apiVersion: number;
  apiKey: string;
  pollInterval: number;
}

export interface SKMeteoWarning {
  startTime: string | null;
  endTime: string | null;
  details: string | null;
  source: string | null;
  type: string | null;
}

export type MeteoStatus =
  | 'steady'
  | 'decreasing'
  | 'increasing'
  | 'not available';

export type MeteoPrecipitationType =
  | 'reserved'
  | 'rain'
  | 'thunderstorm'
  | 'freezing rain'
  | 'mixed/ice'
  | 'snow'
  | 'reserved'
  | 'not available';

export type MeteoIce = 'no' | 'yes' | 'reserved' | 'not available';

export type MeteoBeaufort =
  | 'calm, 0–0.2 m/s'
  | 'light air, 0.3–1.5 m/s'
  | 'light breeze, 1.6–3.3 m/s'
  | 'gentle breeze, 3.4–5.4 m/s'
  | 'moderate breeze, 5.5–7.9 m/s'
  | 'fresh breeze, 8–10.7 m/s'
  | 'strong breeze, 10.8–13.8 m/s'
  | 'high wind, 13.9–17.1 m/s'
  | 'gale, 17.2–20.7 m/s'
  | 'strong gale, 20.8–24.4 m/s'
  | 'storm, 24.5–28.4 m/s'
  | 'violent storm, 28.5–32.6 m/s'
  | 'hurricane-force, ≥ 32.7 m/s'
  | 'not available'
  | 'reserved'
  | 'reserved';

interface SKMeteoWater {
  temperature?: number;
  level?: number;
  levelTendency?: MeteoStatus;
  surfaceCurrentSpeed?: number;
  surfaceCurrentDirection?: number;
  salinity?: number;
  waveSignificantHeight?: number;
  wavePeriod?: number;
  waveDirection?: number;
  swellHeight?: number;
  swellPeriod?: number;
  swellDirection?: number;
  seaState?: MeteoBeaufort;
  ice?: MeteoIce;
}

interface SKMeteoWind {
  speedTrue?: number;
  directionTrue?: number;
  gust?: number;
  gustDirection?: number;
}

export interface SKMeteoAir {
  minTemperature?: number;
  maxTemperature?: number;
  feelsLikeTemperature?: number;
  precipitationVolume?: number;
  absoluteHumidity?: number;
  horizontalVisibility?: number;
  uvIndex?: number;
  cloudCover?: number;
  temperature?: number;
  dewPointTemperature?: number;
  pressure?: number;
  pressureTendency?: MeteoStatus;
  relativeHumidity?: number;
  precipitationType?: MeteoPrecipitationType;
}

export interface SKMeteo {
  description: string;
  date?: string;
  outside?: SKMeteoAir;
  water?: SKMeteoWater;
  wind?: SKMeteoWind;
  sun?: {
    sunrise?: string;
    sunset?: string;
  };
}

export interface ParsedResponse {
  [key: string]: WeatherStationData;
}

interface WeatherStationData {
  id: string;
  name: string;
  position: {
    latitude: number;
    longitude: number;
  };
  observations?: SKMeteo[];
  forecasts?: SKMeteo[];
  warnings?: SKMeteoWarning[];
}

export interface IWeatherService {
  fetchData(position: Position): Promise<ParsedResponse>;
}

// default weather station context
export const defaultStationId = `freeboard-sk`;

let server: FreeboardHelperApp;
let pluginId: string;

const wakeInterval = 60000;
let lastWake: number; // last wake time
let lastFetch: number; // last successful fetch
let fetchInterval = 3600000; // 1hr
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let timer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let retryTimer: any;
const retryInterval = 10000; // time to wait after a failed api request
const retryCountMax = 3; // max number of retries on failed api connection
let retryCount = 0; // number of retries on failed api connection
let noPosRetryCount = 0; // number of retries on no position detected

let weatherData: ParsedResponse;
let weatherService: OpenWeather;
let weatherServiceName: string;

let metaSent = false;

export const WEATHER_POLL_INTERVAL = [60, 30, 15];

export const initWeather = (
  app: FreeboardHelperApp,
  id: string,
  config: WEATHER_CONFIG
) => {
  server = app;
  pluginId = id;
  fetchInterval = (config.pollInterval ?? 60) * 60000;
  if (isNaN(fetchInterval)) {
    fetchInterval = 60 * 60000;
  }

  server.debug(`*** Weather: settings: ${JSON.stringify(config)}`);
  server.debug(`*** fetchInterval: ${fetchInterval}`);

  weatherService = new OpenWeather(config);
  weatherServiceName = 'openweather';

  initMeteoEndpoints();

  fetchWeatherData();
};

const initMeteoEndpoints = () => {
  const meteoPath = '/signalk/v2/api/meteo';
  server.get(`${meteoPath}`, async (req: Request, res: Response) => {
    server.debug(`${req.method} ${meteoPath}`);
    const r = await listWeather({});
    res.status(200);
    res.json(r);
  });
  server.get(`${meteoPath}/:id`, async (req: Request, res: Response) => {
    server.debug(`${req.method} ${meteoPath}/:id`);
    const r =
      weatherData && weatherData[req.params.id]
        ? weatherData[req.params.id]
        : {};
    res.status(200);
    res.json(r);
  });
  server.get(
    `${meteoPath}/:id/observations`,
    async (req: Request, res: Response) => {
      server.debug(`${req.method} ${meteoPath}/:id/observations`);
      const r =
        weatherData &&
        weatherData[req.params.id] &&
        weatherData[req.params.id].observations
          ? weatherData[req.params.id].observations
          : {};
      res.status(200);
      res.json(r);
    }
  );
  server.get(
    `${meteoPath}/:id/observations/:index`,
    async (req: Request, res: Response) => {
      server.debug(`${req.method} ${meteoPath}/:id/observations/:index`);
      const r =
        weatherData &&
        weatherData[req.params.id] &&
        weatherData[req.params.id].observations &&
        weatherData[req.params.id].observations[req.params.index]
          ? weatherData[req.params.id].observations[req.params.index]
          : {};
      res.status(200);
      res.json(r);
    }
  );
  server.get(
    `${meteoPath}/:id/forecasts`,
    async (req: Request, res: Response) => {
      server.debug(`${req.method} ${meteoPath}/:id/forecasts`);
      const r =
        weatherData &&
        weatherData[req.params.id] &&
        weatherData[req.params.id].forecasts
          ? weatherData[req.params.id].forecasts
          : {};
      res.status(200);
      res.json(r);
    }
  );
  server.get(
    `${meteoPath}/:id/forecasts/:index`,
    async (req: Request, res: Response) => {
      server.debug(`${req.method} ${meteoPath}/:id/forecasts/:index`);
      const r =
        weatherData &&
        weatherData[req.params.id] &&
        weatherData[req.params.id].forecasts &&
        weatherData[req.params.id].forecasts[req.params.index]
          ? weatherData[req.params.id].forecasts[req.params.index]
          : {};
      res.status(200);
      res.json(r);
    }
  );
  server.get(
    `${meteoPath}/:id/warnings`,
    async (req: Request, res: Response) => {
      server.debug(`${req.method} ${meteoPath}/:id/warnings`);
      const r =
        weatherData &&
        weatherData[req.params.id] &&
        weatherData[req.params.id].warnings
          ? weatherData[req.params.id].warnings
          : {};
      res.status(200);
      res.json(r);
    }
  );
  server.get(
    `${meteoPath}/:id/warnings/:index`,
    async (req: Request, res: Response) => {
      server.debug(`${req.method} ${meteoPath}/:id/warnings/:index`);
      const r =
        weatherData &&
        weatherData[req.params.id] &&
        weatherData[req.params.id].warnings &&
        weatherData[req.params.id].warnings[req.params.index]
          ? weatherData[req.params.id].warnings[req.params.index]
          : {};
      res.status(200);
      res.json(r);
    }
  );
};

export const stopWeather = () => {
  if (timer) {
    clearInterval(timer);
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
  lastFetch = fetchInterval - 1;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listWeather = async (params: any): Promise<any> => {
  server.debug(`getWeather ${JSON.stringify(params)}`);
  const res = {};
  if (weatherData) {
    for (const o in weatherData) {
      const { id, name, position } = weatherData[o];
      res[o] = { id, name, position };
    }
  }
  return res;
};

export const getWeather = async (
  path: string,
  property: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  server.debug(`getWeather ${path}, ${property}`);

  if (!weatherData) {
    return {};
  }

  const station = weatherData[path];
  if (!station) {
    throw `Weather station ${path} not found!`;
  }

  if (property) {
    const value = property.split('.').reduce((acc, val) => {
      return acc[val];
    }, station);
    return value ?? {};
  } else {
    return station;
  }
};

const fetchWeatherData = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pos: any = server.getSelfPath('navigation.position');
  if (!pos) {
    // try <noPosRetryCount> of times to detect vessel position
    server.debug(`*** Weather: No vessel position detected!`);
    if (noPosRetryCount >= 3) {
      server.debug(
        `*** Weather: Maximum number of retries to detect vessel position!... sleeping.`
      );
      return;
    }
    noPosRetryCount++;
    retryTimer = setTimeout(() => {
      server.debug(
        `*** Weather: RETRY = ${noPosRetryCount} after no vessel position detected!`
      );
      fetchWeatherData();
    }, 5000);
    return;
  }
  server.debug(`*** Vessel position: ${JSON.stringify(pos.value)}.`);
  noPosRetryCount = 0;
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
  if (lastFetch) {
    const e = Date.now() - lastFetch;
    if (e < fetchInterval) {
      server.debug(
        `*** Weather: Next poll due in ${Math.round(
          (fetchInterval - e) / 60000
        )} min(s)... sleep for ${wakeInterval / 1000} secs...`
      );
      return;
    }
  }
  if (retryCount < retryCountMax) {
    retryCount++;
    server.debug(
      `*** Weather: Calling service API.....(attempt: ${retryCount})`
    );
    server.debug(`Position: ${JSON.stringify(pos.value)}`);
    server.debug(`*** Weather: polling weather provider.`);
    weatherService
      .fetchData(pos.value)
      .then((data) => {
        server.debug(`*** Weather: data received....`);
        server.debug(JSON.stringify(data));
        retryCount = 0;
        lastFetch = Date.now();
        lastWake = Date.now();
        weatherData = data;
        timer = setInterval(() => {
          server.debug(`*** Weather: wake from sleep....poll provider.`);
          const dt = Date.now() - lastWake;
          // check for runaway timer
          if (dt >= 50000) {
            server.debug('Wake timer watchdog -> OK');
            server.debug(`*** Weather: Polling provider.`);
          } else {
            server.debug(
              'Wake timer watchdog -> NOT OK... Stopping wake timer!'
            );
            server.debug(`Watch interval < 50 secs. (${dt / 1000} secs)`);
            clearInterval(timer);
            server.setPluginError('Weather watch timer error!');
          }
          lastWake = Date.now();
          fetchWeatherData();
        }, wakeInterval);
        emitMeteoDeltas();
        checkForWarnings();
      })
      .catch((err) => {
        server.debug(
          `*** Weather: ERROR polling weather provider! (retry in ${
            retryInterval / 1000
          } sec)`
        );
        console.log(err.message);
        server.setPluginError(err.message);
        // sleep and retry
        retryTimer = setTimeout(() => fetchWeatherData(), retryInterval);
      });
  } else {
    // max retries. sleep and retry?
    retryCount = 0;
    console.log(
      `*** Weather: Failed to fetch data after ${retryCountMax} attempts.\nRestart ${pluginId} plugin to retry.`
    );
  }
};

// check  for weather warnings in returned data
const checkForWarnings = () => {
  if ('defaultStationId' in weatherData) {
    if (
      weatherData[defaultStationId].warnings &&
      Array.isArray(weatherData[defaultStationId].warnings)
    ) {
      server.debug(
        `*** No. Warnings ${weatherData[defaultStationId].warnings.length}`
      );
      if (weatherData[defaultStationId].warnings.length !== 0) {
        emitWarningNotification(weatherData[defaultStationId].warnings[0]);
      } else {
        emitWarningNotification();
      }
    } else {
      emitWarningNotification();
    }
  }
};

// emit weather warning notification
const emitWarningNotification = (warning?: SKMeteoWarning) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let delta: any;
  if (warning) {
    server.debug(`** Setting Notification **`);
    server.debug(JSON.stringify(warning));
    delta = {
      path: 'notifications.meteo.warning',
      value: {
        state: ALARM_STATE.warn,
        method: [ALARM_METHOD.visual],
        message: warning.details
          ? warning.details
          : warning.type ?? warning.source
      }
    };
  } else {
    server.debug(`** Clearing Notification **`);
    delta = {
      path: 'notifications.meteo.warning',
      value: {
        state: ALARM_STATE.normal,
        method: [],
        message: ''
      }
    };
  }

  server.handleMessage(
    pluginId,
    {
      context: `meteo.${defaultStationId}`,
      updates: [{ values: [delta] }]
    },
    SKVersion.v2
  );
};

// Meteo methods
const emitMeteoDeltas = () => {
  const pathRoot = 'environment';
  const deltaValues = [];

  server.debug('**** METEO - emit deltas*****');

  if (weatherData) {
    deltaValues.push({
      path: 'navigation.position',
      value: weatherData[defaultStationId].position
    });

    const obs = weatherData[defaultStationId].observations;
    server.debug('**** METEO *****');
    if (obs && Array.isArray(obs)) {
      server.debug('**** METEO OBS *****');
      obs.forEach((o: SKMeteo) => {
        deltaValues.push({
          path: ``,
          value: { name: weatherServiceName }
        });

        if (typeof o.date !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.date`,
            value: o.date
          });
        }
        if (typeof o.outside.horizontalVisibility !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.horizontalVisibility`,
            value: o.outside.horizontalVisibility
          });
        }
        if (typeof o.sun.sunrise !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.sun.sunrise`,
            value: o.sun.sunrise
          });
        }
        if (typeof o.sun.sunset !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.sun.sunset`,
            value: o.sun.sunset
          });
        }
        if (typeof o.outside.uvIndex !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.uvIndex`,
            value: o.outside.uvIndex
          });
        }
        if (typeof o.outside.cloudCover !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.cloudCover`,
            value: o.outside.cloudCover
          });
        }
        if (typeof o.outside.temperature !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.temperature`,
            value: o.outside.temperature
          });
        }
        if (typeof o.outside.dewPointTemperature !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.dewPointTemperature`,
            value: o.outside.dewPointTemperature
          });
        }
        if (typeof o.outside.feelsLikeTemperature !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.feelsLikeTemperature`,
            value: o.outside.feelsLikeTemperature
          });
        }
        if (typeof o.outside.pressure !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.pressure`,
            value: o.outside.pressure
          });
        }
        if (typeof o.outside.relativeHumidity !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.relativeHumidity`,
            value: o.outside.relativeHumidity
          });
        }
        if (typeof o.outside.absoluteHumidity !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.absoluteHumidity`,
            value: o.outside.absoluteHumidity
          });
        }
        if (typeof o.outside.precipitationType !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.outside.precipitationType`,
            value: o.outside.precipitationType
          });
        }
        if (typeof o.wind.speedTrue !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.wind.speedTrue`,
            value: o.wind.speedTrue
          });
        }
        if (typeof o.wind.directionTrue !== 'undefined') {
          deltaValues.push({
            path: `${pathRoot}.wind.directionTrue`,
            value: o.wind.directionTrue
          });
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        values: deltaValues
      };

      if (!metaSent) {
        server.debug('**** SENDING METAS *****');
        updates.meta = buildMeteoMetas();
        metaSent = true;
      }

      server.handleMessage(
        pluginId,
        {
          context: `meteo.${defaultStationId}`,
          updates: [updates]
        },
        SKVersion.v1
      );
    }
  }
};

const buildMeteoMetas = () => {
  server.debug('**** METEO - build metas *****');
  let metas = [];
  metas = metas.concat(buildObservationMetas('environment'));
  return metas;
};

const buildObservationMetas = (pathRoot: string) => {
  const metas = [];
  server.debug('**** METEO - building observation metas *****');
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

  return metas;
};
