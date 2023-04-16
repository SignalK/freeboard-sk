// OpenWeather

import { Position } from '@signalk/server-api';
import { fetch } from './fetch';

import {
  IWeatherService,
  SKWeather,
  SKWeatherWarning,
  ParsedResponse,
  WEATHER_CONFIG
} from '../weather';

interface OWObservation {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  rain: { [key: string]: any };
  snow: { [key: string]: any };
}

interface OWForecast {
  dt: number;
  sunrise: number;
  sunset: number;
  moonrise: number;
  moonset: number;
  moon_phase: number;
  temp: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: [
    {
      id: number;
      main: string;
      description: string;
      icon: string;
    }
  ];
  clouds: number;
  pop: number;
  uvi: number;
  rain: { [key: string]: any };
  snow: { [key: string]: any };
}

interface OWWarning {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: Array<string>;
}

interface OWResponse {
  [key: string]: any;
}

export class OpenWeather implements IWeatherService {
  private settings: WEATHER_CONFIG;

  constructor(config: WEATHER_CONFIG) {
    this.settings = config;
  }

  private getUrl(position: Position): string {
    const api = 'https://api.openweathermap.org/data/2.5/onecall';
    if (!this.settings.apiKey || !position) {
      return '';
    } else {
      return `${api}?lat=${position.latitude}&lon=${position.longitude}&exclude=minutely,daily&appid=${this.settings.apiKey}`;
    }
  }

  fetchData = async (position: Position): Promise<ParsedResponse> => {
    const url = this.getUrl(position);
    try {
      const response = await fetch(url);
      return this.parseResponse(response as OWResponse);
    } catch (error) {
      throw error;
    }
  };

  private parseResponse = (owData: OWResponse): ParsedResponse => {
    return {
      self: {
        id: 'self',
        name: 'Weather data relative to supplied position.',
        position: {
          latitude: owData.lat,
          longitude: owData.lon
        },
        observations: this.parseOWObservations(owData),
        forecasts: this.parseOWForecasts(owData),
        warnings: this.parseOWWarnings(owData)
      }
    };
  };

  private parseOWObservations(owData: OWResponse): SKWeather[] {
    //server.debug(JSON.stringify(weatherData.current))
    const data: SKWeather[] = [];
    const obs: SKWeather = {};

    if (owData && owData.current) {
      const current: OWObservation = owData.current;
      obs.timestamp = current.dt
        ? new Date(current.dt * 1000).toISOString()
        : null;
      obs.description = current.weather[0].description ?? null;
      obs.sunrise = new Date(current.sunrise * 1000).toISOString() ?? null;
      obs.sunset = new Date(current.sunset * 1000).toISOString() ?? null;
      obs.uvIndex = {
        value: current.uvi ?? null,
        units: null
      };
      obs.clouds = {
        value: current.clouds ?? null,
        units: '%'
      };
      obs.visibility = {
        value: current.visibility ?? null,
        units: 'm'
      };
      obs.temperature = {};
      obs.temperature.air = {
        value: current.temp ?? null,
        units: 'K'
      };
      obs.temperature.feelsLike = {
        value: current.feels_like ?? null,
        units: 'K'
      };
      obs.temperature.dewPoint = {
        value: current.dew_point ?? null,
        units: 'K'
      };
      obs.pressure = {};
      obs.pressure.value = {
        value: current.pressure ? current.pressure * 100 : null,
        units: 'Pa'
      };
      obs.humidity = {};
      obs.humidity.absolute = {
        value: current.humidity ?? null,
        units: '%'
      };
      obs.wind = {};
      obs.wind.speed = {
        value: current.wind_speed ?? null,
        units: 'm/s'
      };
      obs.wind.direction = {
        value:
          typeof current.wind_deg !== 'undefined'
            ? (Math.PI / 180) * current.wind_deg
            : null,
        units: 'rad'
      };
      obs.precipitation = {
        rain: {},
        snow: {}
      };
      obs.precipitation.rain.volume = {
        value:
          current.rain && typeof current.rain['1h'] !== 'undefined'
            ? current.rain['1h']
            : null,
        units: 'mm'
      };
      obs.precipitation.snow.volume = {
        value:
          current.snow && typeof current.snow['1h'] !== 'undefined'
            ? current.snow['1h']
            : null,
        units: 'mm'
      };

      data.push(obs);
    }

    return data;
  }

  private parseOWForecasts(owData: OWResponse, period = 'hourly'): SKWeather[] {
    //server.debug(JSON.stringify(owData[period]))
    const data: SKWeather[] = [];

    if (owData && owData[period] && Array.isArray(owData[period])) {
      const forecasts = owData[period];
      forecasts.forEach((f: OWForecast) => {
        const forecast: SKWeather = {};
        forecast.timestamp = f.dt ? new Date(f.dt * 1000).toISOString() : null;
        forecast.description = f.weather[0].description ?? null;

        forecast.temperature = {};
        forecast.temperature.air = {
          value: f.temp ?? null,
          units: 'K'
        };
        if (period === 'daily') {
          forecast.sunrise = new Date(f.sunrise * 1000).toISOString() ?? null;
          forecast.sunset = new Date(f.sunset * 1000).toISOString() ?? null;
          forecast.temperature.minimum = {
            value: f.temp.min ?? null,
            units: 'K'
          };
          forecast.temperature.maximum = {
            value: f.temp.max ?? null,
            units: 'K'
          };
          forecast.temperature.feelsLike = {
            value: f.feels_like.day ?? null,
            units: 'K'
          };
        } else {
          forecast.temperature.feelsLike = {
            value: f.feels_like ?? null,
            units: 'K'
          };
        }
        forecast.temperature.dewPoint = {
          value: f.dew_point ?? null,
          units: 'K'
        };
        forecast.uvIndex = {
          value: f.uvi ?? null,
          units: null
        };
        forecast.clouds = {
          value: f.clouds ?? null,
          units: '%'
        };
        forecast.pop = {
          value: typeof f.pop !== 'undefined' ? f.pop * 100 : null,
          units: '%'
        };

        forecast.pressure = {
          value: typeof f.pressure !== 'undefined' ? f.pressure * 100 : null,
          units: 'Pa'
        };
        forecast.humidity = {};
        forecast.humidity.absolute = {
          value: f.humidity ?? null,
          units: '%'
        };
        forecast.wind = {};
        forecast.wind.speed = {
          value: f.wind_speed ?? null,
          units: 'm/s'
        };
        forecast.wind.direction = {
          value:
            typeof f.wind_deg !== 'undefined'
              ? (Math.PI / 180) * f.wind_deg
              : null,
          units: 'rad'
        };
        forecast.wind.gust = {
          value: f.wind_gust ?? null,
          units: 'm/s'
        };
        forecast.precipitation = {
          rain: {},
          snow: {}
        };
        forecast.precipitation.rain.volume = {
          value:
            f.rain && typeof f.rain['1h'] !== 'undefined' ? f.rain['1h'] : null,
          units: 'mm'
        };
        forecast.precipitation.snow.volume = {
          value:
            f.snow && typeof f.snow['1h'] !== 'undefined' ? f.snow['1h'] : null,
          units: 'mm'
        };
        data.push(forecast);
      });
    }

    return data;
  }

  private parseOWWarnings(owData: OWResponse): SKWeatherWarning[] {
    //server.debug(JSON.stringify(weatherData.alerts))
    const data: SKWeatherWarning[] = [];
    if (owData && owData.alerts) {
      const alerts: OWWarning[] = owData.alerts;
      alerts.forEach((alert: OWWarning) => {
        const warn = {
          startTime: alert.start
            ? new Date(alert.start * 1000).toISOString()
            : null,
          endTime: alert.end
            ? new Date(alert.start * 1000).toISOString()
            : null,
          details: alert.description ?? null,
          source: alert.sender_name ?? null,
          type: alert.event ?? null
        };
        data.push(warn);
      });
    }

    return data;
  }
}
