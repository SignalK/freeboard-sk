/** Weather Forecast Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { WeatherData } from './components/weather-data.component';

/********* WeatherForecastModal **********
	data: {
        title: "<string>" title text
    }
***********************************/
@Component({
  selector: 'weather-forecast-modal',
  template: `
    <div class="_weather-forecast">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon color="primary">air</mat-icon>
        </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          {{ data.title }}
        </span>
        <span>
          <button
            mat-icon-button
            (click)="modalRef.dismiss()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      @if(!forecasts || forecasts.length === 0) {
      <div style="text-align:center">No weather data found!</div>
      }
      <weather-data [data]="forecasts"></weather-data>
    </div>
  `,
  styles: [
    `
      ._weather-forecast {
        font-family: arial;
      }
      ._weather-forecast .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class WeatherForecastModal implements OnInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public forecasts: any[] = [];

  constructor(
    public app: AppInfo,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<WeatherForecastModal>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any
  ) {}

  ngOnInit() {
    this.getForecast();
  }

  formatTempDegreesC(val: number) {
    return val
      ? `${Convert.kelvinToCelcius(val).toFixed(1)} ${String.fromCharCode(186)}`
      : '0.0';
  }

  formatDegrees(val: number) {
    return val
      ? `${Convert.radiansToDegrees(val).toFixed(1)} ${String.fromCharCode(
          186
        )}`
      : '0.0';
  }

  formatKnots(val: number) {
    return val ? `${Convert.msecToKnots(val).toFixed(1)} kn` : '0.0';
  }

  private getForecast(count = 8) {
    const path = '/meteo/freeboard-sk/forecasts';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.sk.api.get(2, path).subscribe((forecasts: any) => {
      Object.values(forecasts)
        .slice(0, count)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .forEach((v: any) => {
          const forecastData: WeatherData = { wind: {} };
          forecastData.description = v['description'] ?? '';
          forecastData.time = new Date(v['date']).toLocaleTimeString() ?? '';

          if (typeof v.outside?.temperature !== 'undefined') {
            forecastData.temperature =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(v.outside.temperature).toFixed(1) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.outside.temperature).toFixed(1) +
                  String.fromCharCode(186) +
                  'C';
          }
          if (typeof v.outside?.minTemperature?.minimum !== 'undefined') {
            forecastData.temperatureMin =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(v.outside.minTemperature).toFixed(
                    1
                  ) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.outside.minTemperature).toFixed(1) +
                  String.fromCharCode(186) +
                  'C';
          }
          if (typeof v.outside?.maxTemperature !== 'undefined') {
            forecastData.temperatureMax =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(v.outside.maxTemperature).toFixed(
                    1
                  ) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.outside.maxTemperature).toFixed(1) +
                  String.fromCharCode(186) +
                  'C';
          }
          if (typeof v.outside?.dewPointTemperature !== 'undefined') {
            forecastData.dewPoint =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(
                    v.outside.dewPointTemperature
                  ).toFixed(1) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(
                    v.outside.dewPointTemperature
                  ).toFixed(1) +
                  String.fromCharCode(186) +
                  'C';
          }

          forecastData.humidity =
            typeof v.outside?.absoluteHumility !== 'undefined'
              ? `${v.outside?.absoluteHumility} (%)`
              : '';
          forecastData.pressure =
            typeof v.outside?.pressure !== 'undefined'
              ? `${v.outside?.pressure} (Pa)`
              : '';

          if (typeof v.outside?.uvIndex !== 'undefined') {
            forecastData.uvIndex = v.outside?.uvIndex.toFixed(2);
          }
          if (typeof v.outside?.clouds !== 'undefined') {
            forecastData.clouds =
              v.outside?.clouds.toFixed(1) +
              `${v.clouds.units ? ' (' + v.clouds.units + ')' : ''}`;
          }
          if (typeof v.outside?.visibility !== 'undefined') {
            forecastData.visibility = v.outside?.visibility;
          }

          if (typeof v.wind !== 'undefined') {
            if (typeof v.wind.speedTrue !== 'undefined') {
              forecastData.wind.speed =
                this.app.formatSpeed(v.wind.speedTrue, true) +
                ' ' +
                this.app.formattedSpeedUnits;
            }
            if (typeof v.wind.gust !== 'undefined') {
              forecastData.wind.gust =
                this.app.formatSpeed(v.wind.gust, true) +
                ' ' +
                this.app.formattedSpeedUnits;
            }
            if (typeof v.wind.directionTrue !== 'undefined') {
              forecastData.wind.direction =
                Convert.radiansToDegrees(v.wind.directionTrue).toFixed(0) +
                String.fromCharCode(186);
            }
          }
          this.forecasts.push(forecastData);
        });
    });
  }
}
