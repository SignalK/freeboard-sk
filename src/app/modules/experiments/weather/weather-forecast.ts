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
      <mat-toolbar>
        <span>
          <mat-icon color="primary">ac_unit</mat-icon>
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
  public forecasts: any[] = [];

  constructor(
    public app: AppInfo,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<WeatherForecastModal>,
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
    const path = '/resources/weather/forecasts/self';
    this.sk.api
      .get(2, path)
      .subscribe((forecasts: Array<{ [key: string]: any }>) => {
        forecasts = forecasts.slice(0, count);
        forecasts.forEach((v) => {
          const forecastData: WeatherData = { wind: {} };
          forecastData.description = v['description'] ?? '';
          forecastData.time =
            new Date(v['timestamp']).toLocaleTimeString() ?? '';

          if (typeof v.temperature?.air !== 'undefined') {
            forecastData.temperature =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(v.temperature.air.value).toFixed(
                    1
                  ) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.temperature.air.value).toFixed(1) +
                  String.fromCharCode(186) +
                  'C';
          }
          if (typeof v.temperature?.minimum !== 'undefined') {
            forecastData.temperatureMin =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(
                    v.temperature.minimum.value
                  ).toFixed(1) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.temperature.minimum.value).toFixed(
                    1
                  ) +
                  String.fromCharCode(186) +
                  'C';
          }
          if (typeof v.temperature?.maximum !== 'undefined') {
            forecastData.temperatureMax =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(
                    v.temperature.maximum.value
                  ).toFixed(1) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.temperature.maximum.value).toFixed(
                    1
                  ) +
                  String.fromCharCode(186) +
                  'C';
          }
          if (typeof v.temperature?.dewPoint !== 'undefined') {
            forecastData.dewPoint =
              this.app.config.units?.temperature === 'f'
                ? Convert.kelvinToFarenheit(
                    v.temperature.dewPoint.value
                  ).toFixed(1) +
                  String.fromCharCode(186) +
                  'F'
                : Convert.kelvinToCelcius(v.temperature.dewPoint.value).toFixed(
                    1
                  ) +
                  String.fromCharCode(186) +
                  'C';
          }

          forecastData.humidity =
            typeof v.humidity?.absolute?.value !== 'undefined'
              ? v.humidity.absolute.value +
                `${
                  v.humidity.absolute.units
                    ? ' (' + v.humidity.absolute.units + ')'
                    : ''
                }`
              : '';
          forecastData.pressure =
            typeof v.pressure?.value !== 'undefined'
              ? v.pressure.value +
                `${v.pressure.units ? ' (' + v.pressure.units + ')' : ''}`
              : '';

          if (typeof v.uvIndex !== 'undefined') {
            forecastData.uvIndex = v.uvIndex.value.toFixed(2);
          }
          if (typeof v.clouds !== 'undefined') {
            forecastData.clouds =
              v.clouds.value.toFixed(1) +
              `${v.clouds.units ? ' (' + v.clouds.units + ')' : ''}`;
          }
          if (typeof v.visibility !== 'undefined') {
            forecastData.visibility = v.visibility.value;
          }

          if (typeof v.wind !== 'undefined') {
            if (typeof v.wind.speed !== 'undefined') {
              forecastData.wind.speed =
                this.app.formatSpeed(v.wind.speed.value, true) +
                ' ' +
                this.app.formattedSpeedUnits;
            }
            if (typeof v.wind.gust !== 'undefined') {
              forecastData.wind.gust =
                this.app.formatSpeed(v.wind.gust.value, true) +
                ' ' +
                this.app.formattedSpeedUnits;
            }
            if (typeof v.wind.direction !== 'undefined') {
              forecastData.wind.direction =
                Convert.radiansToDegrees(v.wind.direction.value).toFixed(0) +
                String.fromCharCode(186);
            }
          }
          this.forecasts.push(forecastData);
        });
      });
  }
}
