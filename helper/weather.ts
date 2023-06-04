// **** Experiment: OpenWeather integration ****
import { Position } from '@signalk/server-api';
import { FreeboardHelperApp } from '.';
import { ALARM_METHOD, ALARM_STATE } from './lib/types';
import { OpenWeather } from './lib/openweather';
import { NOAA } from './lib/noaa';

export interface WEATHER_CONFIG {
  enable: boolean;
  apiKey: string;
  service: string;
}

interface SKWeatherValue {
  value: number | string | null;
  units: string | null;
}

interface SKWeatherGroup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: SKWeatherValue | SKWeatherGroup | any;
}

export interface SKWeather {
  [key: string]: number | string | SKWeatherValue | SKWeatherGroup | null;
}

export interface SKWeatherWarning {
  startTime: string | null;
  endTime: string | null;
  details: string | null;
  source: string | null;
  type: string | null;
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
  observations?: SKWeather[];
  forecasts?: SKWeather[];
  warnings?: SKWeatherWarning[];
}

export interface IWeatherService {
  fetchData(position: Position): Promise<ParsedResponse>;
}

let server: FreeboardHelperApp;
let pluginId: string;

let lastFetch: number; // last successful fetch
const fetchInterval = 3600000; // 1hr
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let timer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let retryTimer: any;
const retryCountMax = 5; // max number of retries on failed api connection
let retryCount = 0; // number of retries on failed api connection

let weatherData: ParsedResponse;
let weatherService: OpenWeather | NOAA;

export const WEATHER_SERVICES = ['openweather', 'noaa'];

export const initWeather = (
  app: FreeboardHelperApp,
  id: string,
  config: WEATHER_CONFIG
) => {
  server = app;
  pluginId = id;

  server.debug(`*** Weather: settings: ${JSON.stringify(config)}`);

  weatherService =
    config.service === 'noaa' ? new NOAA(config) : new OpenWeather(config);

  fetchWeatherData();
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
    server.debug(`*** Weather: No vessel position detected!`);
    retryTimer = setTimeout(() => fetchWeatherData(), 5000);
    return;
  }
  if (lastFetch) {
    if (Date.now() - lastFetch < fetchInterval) {
      server.debug(`*** Weather: Fetch - too soon!....`);
      return;
    }
  }
  if (retryCount < retryCountMax) {
    retryCount++;
    server.debug(
      `*** Weather: Calling service API.....(attempt: ${retryCount})`
    );

    server.debug(`Position: ${JSON.stringify(pos.value)}`);
    weatherService
      .fetchData(pos.value)
      .then((data) => {
        server.debug(`*** Weather: data received....`);
        server.debug(JSON.stringify(data));
        retryCount = 0;
        lastFetch = Date.now();
        weatherData = data;
        timer = setInterval(() => fetchWeatherData(), 60000);
        checkForWarnings();
      })
      .catch((err) => {
        server.debug(err.message);
        // sleep and retry
        retryTimer = setTimeout(() => fetchWeatherData(), 10000);
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
  if ('self' in weatherData) {
    if (weatherData.self.warnings && Array.isArray(weatherData.self.warnings)) {
      server.debug(`*** No. Warnings ${weatherData.self.warnings.length}`);
      if (weatherData.self.warnings.length !== 0) {
        emitWarningNotification(weatherData.self.warnings[0]);
      } else {
        emitWarningNotification();
      }
    } else {
      emitWarningNotification();
    }
  }
};

// emit weather warning notification
const emitWarningNotification = (warning?: SKWeatherWarning) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let delta: any;
  if (warning) {
    server.debug(`** Setting Notification **`);
    server.debug(JSON.stringify(warning));
    delta = {
      path: 'notifications.environment.weather.warning',
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
      path: 'notifications.environment.weather.warning',
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
      updates: [{ values: [delta] }]
    },
    'v2'
  );
};
