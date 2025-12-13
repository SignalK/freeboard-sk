/** Weather Forecast Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatBottomSheetModule,
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { WeatherData, WeatherDataComponent } from './weather-data.component';
import { Position } from 'src/app/types';
import { CoordsPipe } from 'src/app/lib/pipes';

/********* WeatherForecastModal **********
	data: {
        title: "<string>" title text
    }
***********************************/
@Component({
  selector: 'weather-forecast-modal',
  imports: [
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatBottomSheetModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    MatStepperModule,
    MatProgressBar,
    WeatherDataComponent,
    CoordsPipe
  ],
  template: `
    <div class="_weather-forecast">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon>air</mat-icon>
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
      @if (isFetching) {
        <mat-progress-bar mode="query"></mat-progress-bar>
      } @else {
        @if (!forecasts || forecasts.length === 0) {
          <div style="text-align:center">{{ errorText }}</div>
        } @else {
          <div style="display:flex;flex-wrap: nowrap;">
            <div style="flex: 1;"></div>
            <div style="width: 350px;text-align:center;">
              <span style="font-size: small;">{{ data.subTitle }}</span>
              <div
                style="font-size: small;text-align:left;display:flex;flex-wrap: wrap;"
              >
                <div style="flex: 1;">
                  <span style="font-weight:bold;">Lat:</span>&nbsp;
                  <span
                    [innerText]="
                      this.data.position[1]
                        | coords: app.config.units.positionFormat : true
                    "
                  >
                  </span>
                  &nbsp;
                </div>
                <div style="flex: 1;">
                  <span style="font-weight:bold;">Lon:</span>&nbsp;
                  <span
                    [innerText]="
                      this.data.position[0]
                        | coords: app.config.units.positionFormat : false
                    "
                  >
                  </span>
                </div>
              </div>
            </div>
            <div style="flex: 1;"></div>
          </div>
          <weather-data [data]="forecasts.slice(0, 18)"></weather-data>
        }
      }
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
  protected isFetching = false;
  protected errorText = 'No weather data found!';

  constructor(
    public app: AppFacade,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<WeatherForecastModal>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any
  ) {}

  ngOnInit() {
    this.getForecast(this.data.position);
  }

  formatTempDegreesC(val: number) {
    return val
      ? `${Convert.kelvinToCelsius(val).toFixed(1)} ${String.fromCharCode(186)}`
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

  private dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  private getForecast(pos: Position) {
    if (!this.app.featureFlags().weatherApi) {
      this.errorText =
        'Cannot retrieve forecasts as Weather API is not available!';
      return;
    }
    if (!this.data.position) {
      this.errorText =
        'Cannot retrieve forecasts as location has not been supplied!';
      return;
    }
    const path = `/weather/forecasts/point?lat=${pos[1]}&lon=${pos[0]}`;
    this.isFetching = true;
    this.sk.api.get(2, path).subscribe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (forecasts: any) => {
        this.isFetching = false;
        Object.values(forecasts)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .forEach((v: any) => {
            const forecastData: WeatherData = { wind: {} };
            forecastData.description = v['description'] ?? '';
            const d = new Date(v['date']);
            forecastData.time = d
              ? `${this.dayNames[d.getDay()]} ${d.getHours()}:${(
                  '00' + d.getMinutes()
                ).slice(-2)}`
              : '';

            if (typeof v.outside?.temperature !== 'undefined') {
              forecastData.temperature =
                this.app.config.units?.temperature === 'f'
                  ? Convert.kelvinToFarenheit(v.outside.temperature).toFixed(
                      1
                    ) +
                    String.fromCharCode(186) +
                    'F'
                  : Convert.kelvinToCelsius(v.outside.temperature).toFixed(1) +
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
                  : Convert.kelvinToCelsius(v.outside.minTemperature).toFixed(
                      1
                    ) +
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
                  : Convert.kelvinToCelsius(v.outside.maxTemperature).toFixed(
                      1
                    ) +
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
                  : Convert.kelvinToCelsius(
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
                ? `${Math.round(v.outside?.pressure)} (Pa)`
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
            if (typeof v.outside?.precipitationVolume !== 'undefined') {
              forecastData.rain = `${(
                v.outside?.precipitationVolume * 1000
              ).toFixed(2)} mm`;
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
      },
      () => {
        this.isFetching = false;
        this.errorText = 'Error retrieving weather data!';
      }
    );
  }
}
