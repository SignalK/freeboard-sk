// NOAA

import { Position } from '@signalk/server-api';
import { fetch } from './fetch';

import {
  IWeatherService,
  SKWeather,
  SKWeatherWarning,
  ParsedResponse,
  WEATHER_CONFIG
} from '../weather';

interface NoaaObservation {
  timestamp: string;
  textDescription: string;
  temperature: {
    unitCode: string;
    value: number;
  };
  dewpoint: {
    unitCode: string;
    value: number;
  };
  windDirection: {
    unitCode: string;
    value: number;
  };
  windSpeed: {
    unitCode: string;
    value: number;
  };
  windGust: {
    unitCode: string;
    value: number;
  };
  barometricPressure: {
    unitCode: string;
    value: number;
  };
  seaLevelPressure: {
    unitCode: string;
    value: number;
  };
  visibility: {
    unitCode: string;
    value: number;
  };
  maxTemperatureLast24Hours: {
    unitCode: string;
    value: number;
  };
  minTemperatureLast24Hours: {
    unitCode: string;
    value: number;
  };
  precipitationLastHour: {
    unitCode: string;
    value: number;
  };
  precipitationLast3Hours: {
    unitCode: string;
    value: number;
  };
  precipitationLast6Hours: {
    unitCode: string;
    value: number;
  };
  relativeHumidity: {
    unitCode: string;
    value: number;
  };
  windChill: {
    unitCode: string;
    value: number;
  };
  heatIndex: {
    unitCode: string;
    value: number;
  };
  cloudLayers: any[];
}

interface NoaaForecast {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

interface NoaaWarning {
  properties: {
    senderName: string;
    effective: string;
    ends: string;
    description: string;
    headline: string;
    messageType: string;
  };
}

interface NoaaResponse {
  [key: string]: any;
}

enum CARDINAL_POINTS {
  'N' = 0,
  'NNE' = 22.5,
  'NE' = 45,
  'ENE' = 67.5,
  'E' = 90,
  'ESE' = 112.5,
  'SE' = 135,
  'SSE' = 157.5,
  'S' = 180,
  'SSW' = 202.5,
  'SW' = 225,
  'WSW' = 247.5,
  'W' = 270,
  'WNW' = 292.5,
  'NW' = 315,
  'NNW' = 337.5
}

export class NOAA implements IWeatherService {
  private settings: WEATHER_CONFIG;

  constructor(config: WEATHER_CONFIG) {
    this.settings = config;
  }

  private getUrl(position: Position): string {
    const api = 'https://api.weather.gov/points';
    if (!this.settings.apiKey || !position) {
      return '';
    } else {
      return `${api}/${position.latitude.toFixed(
        4
      )},${position.longitude.toFixed(4)}`;
    }
  }

  fetchData = async (position: Position): Promise<ParsedResponse> => {
    const url = this.getUrl(position);
    try {
      //console.log(`url`, url)
      const response: any = await fetch(url);
      let forecasts: any = [];
      let observations: any = [];
      // observations
      if (response?.properties?.observationStations) {
        const stations: any = await fetch(
          response.properties.observationStations
        );
        observations = await fetch(
          `${stations.features[0].id}/observations/latest`
        );
        //console.log(`observations`, observations)
      }
      // forecasts
      if (response?.properties?.forecastHourly) {
        forecasts = await fetch(response.properties.forecastHourly);
        //console.log(`forecasts`, forecasts)
      }
      // warnings
      const warnings: any = await fetch(
        `https://api.weather.gov/alerts/active?point=${position.latitude.toFixed(
          4
        )},${position.longitude.toFixed(4)}`
      );
      //console.log(`warnings`, warnings)

      return this.parseResponse({
        position: position,
        forecasts: forecasts?.properties?.periods ?? [],
        observations: observations?.properties ?? null,
        warnings: warnings?.features ?? []
      });
    } catch (error) {
      throw error;
    }
  };

  private parseResponse = (wData: NoaaResponse): ParsedResponse => {
    return {
      self: {
        id: 'self',
        name: 'Weather data relative to supplied position.',
        position: {
          latitude: wData.latitude,
          longitude: wData.longitude
        },
        observations: this.parseNoaaObservations(wData.observations),
        forecasts: this.parseNoaaForecasts(wData.forecasts),
        warnings: this.parseNoaaWarnings(wData.warnings)
      }
    };
  };

  private parseNoaaObservations(wData: NoaaObservation): SKWeather[] {
    const data: SKWeather[] = [];
    const obs: SKWeather = {};
    let v: number | null;

    if (wData) {
      obs.timestamp = wData.timestamp ?? null;
      obs.description = wData.textDescription ?? null;
      v = wData.visibility.value
        ? wData.visibility.unitCode === 'wmoUnit:m'
          ? wData.visibility.value
          : wData.visibility.value
        : null;
      obs.visibility = {
        value: v,
        units: 'm'
      };
      obs.temperature = {};
      v = wData.temperature.value
        ? wData.temperature.unitCode === 'wmoUnit:degC'
          ? wData.temperature.value + 273.15
          : wData.temperature.value
        : null;
      obs.temperature.air = {
        value: v,
        units: 'K'
      };
      v = wData.dewpoint.value
        ? wData.dewpoint.unitCode === 'wmoUnit:degC'
          ? wData.dewpoint.value + 273.15
          : wData.dewpoint.value
        : null;
      obs.temperature.dewPoint = {
        value: v,
        units: 'K'
      };

      obs.pressure = {};
      v = wData.seaLevelPressure.value
        ? wData.seaLevelPressure.unitCode === 'wmoUnit:Pa'
          ? wData.seaLevelPressure.value
          : wData.seaLevelPressure.value
        : null;
      obs.pressure.value = {
        value: v,
        units: 'Pa'
      };

      obs.humidity = {};
      v = wData.relativeHumidity.value
        ? wData.relativeHumidity.unitCode === 'wmoUnit:percent'
          ? wData.relativeHumidity.value / 100
          : wData.relativeHumidity.value
        : null;
      obs.humidity.relative = {
        value: v,
        units: '%'
      };

      obs.wind = {};
      v = wData.windSpeed.value
        ? wData.windSpeed.unitCode === 'wmoUnit:km_h-1'
          ? wData.windSpeed.value / 3.6
          : wData.windSpeed.value
        : null;
      obs.wind.speed = {
        value: v,
        units: 'm/s'
      };
      v = wData.windDirection.value
        ? wData.windDirection.unitCode === 'wmoUnit:degree_(angle)'
          ? wData.windDirection.value * (Math.PI / 180)
          : wData.windDirection.value
        : null;
      obs.wind.direction = {
        value: v,
        units: 'rad'
      };
      v = wData.windGust.value
        ? wData.windGust.unitCode === 'wmoUnit:km_h-1'
          ? wData.windGust.value / 3.6
          : wData.windGust.value
        : null;
      obs.wind.gust = {
        value: v,
        units: 'm/s'
      };

      data.push(obs);
    }

    return data;
  }

  private parseNoaaForecasts(
    forecasts: NoaaForecast[],
    period = 'hourly'
  ): SKWeather[] {
    const data: SKWeather[] = [];

    if (forecasts && Array.isArray(forecasts)) {
      forecasts.forEach((f: NoaaForecast) => {
        const forecast: SKWeather = {};
        forecast.timestamp = f.startTime ?? null;
        forecast.description = f.shortForecast ?? null;

        forecast.temperature = {};
        forecast.temperature.air = {
          value:
            typeof f.temperature !== 'undefined'
              ? ((f.temperature - 32) * 5) / 9 + 273.15
              : null,
          units: 'K'
        };
        forecast.wind = {};
        forecast.wind.speed = {
          value: parseInt(f.windSpeed.split(' ')[0]) / 2.237 ?? null,
          units: 'm/s'
        };

        const wd: any = f.windDirection
          ? CARDINAL_POINTS[f.windDirection as any]
          : 0;
        forecast.wind.direction = {
          value: f.windDirection ? (Math.PI / 180) * wd : null,
          units: 'rad'
        };
        data.push(forecast);
      });
    }
    return data;
  }

  private parseNoaaWarnings(alerts: NoaaWarning[]): SKWeatherWarning[] {
    const data: SKWeatherWarning[] = [];
    if (alerts && Array.isArray(alerts)) {
      alerts.forEach((alert: NoaaWarning) => {
        const warn = {
          startTime: alert?.properties?.effective ?? null,
          endTime: alert?.properties?.ends ?? null,
          details: alert?.properties?.description ?? null,
          source: alert?.properties?.senderName ?? null,
          type: alert?.properties?.messageType ?? null
        };
        data.push(warn);
      });
    }

    return data;
  }
}
