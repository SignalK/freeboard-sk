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
import { Position } from 'src/app/types';
import { CoordsPipe } from 'src/app/lib/pipes';

interface WeatherData {
  description?: string;
  time?: string;
  temperature?: string;
  temperatureMin?: string;
  temperatureMax?: string;
  dewPoint?: string;
  humidity?: string;
  pressure?: string;
  rain?: string;
  uvIndex?: string;
  clouds?: string;
  visibility?: string;
  wind?: {
    speed?: string;
    direction?: string;
    gust?: string;
  };
}

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

          <div class="meteo">
            <div class="meteo-row">
              <div class="meteo-row-label">
                <mat-icon>schedule</mat-icon>Time
              </div>
              <div class="meteo-row-units">&nbsp;</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.time }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <mat-icon>device_thermostat</mat-icon>Temp
              </div>
              <div class="meteo-row-units">{{ units.temp }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.temperature }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label"><mat-icon>eco</mat-icon>DewP</div>
              <div class="meteo-row-units">{{ units.temp }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.dewPoint }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label"><mat-icon>air</mat-icon>Speed</div>
              <div class="meteo-row-units">{{ units.speed }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.wind?.speed }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label"><mat-icon>explore</mat-icon>Dir</div>
              <div class="meteo-row-units">&nbsp;</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.wind?.direction }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label"><mat-icon>air</mat-icon>Gust</div>
              <div class="meteo-row-units">{{ units.speed }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.wind?.gust }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <mat-icon>opacity</mat-icon>Hum.
              </div>
              <div class="meteo-row-units">{{ units.humidity }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.humidity }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <mat-icon>compress</mat-icon>Bar.
              </div>
              <div class="meteo-row-units">{{ units.pressure }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.pressure }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <mat-icon>water_drop</mat-icon>Rain
              </div>
              <div class="meteo-row-units">{{ units.precipitation }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.rain }}</div>
              }
            </div>
          </div>
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

      .meteo {
        overflow: auto;
        font-size: small;
      }
      .meteo-row {
        display: flex;
        text-wrap-mode: nowrap;
        border-color: gray;
        border-style: solid;
        border-width: 0;
        font-weight: bold;
      }

      .meteo-row-label,
      .meteo-row-units {
        min-width: 65px;
        border-color: inherit;
        border-style: inherit;
        border-width: 0 0 1px 1px;
      }

      .meteo-row-units {
        min-width: 45px;
        max-width: 45px;
        text-align: center;
      }

      .meteo-row-value {
        border-width: 0 1px 1px;
        border-color: inherit;
        border-style: inherit;
        min-width: 50px;
        max-width: 50px;
        text-align: center;
      }

      .meteo-row:first-child div {
        border-top: gray 1px solid;
      }

      .meteo-row:nth-child(odd) div {
        background-color: rgb(209 243 209 / 60%);
        color: black;
      }
    `
  ]
})
export class WeatherForecastModal implements OnInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public forecasts: any[] = [];
  protected isFetching = false;
  protected errorText = 'No weather data found!';
  protected units!: {
    temp: string;
    speed: string;
    pressure: string;
    humidity: string;
    precipitation: string;
  };
  private maxForecasts = 12;

  constructor(
    public app: AppFacade,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<WeatherForecastModal>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any
  ) {}

  ngOnInit() {
    this.getForecast(this.data.position);
    this.units = {
      temp: `${String.fromCharCode(186)}${this.app.config.units?.temperature === 'f' ? 'F' : 'C'}`,
      speed: this.app.formattedSpeedUnits,
      humidity: '%',
      pressure: 'Pa',
      precipitation: 'mm'
    };
  }

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
        forecasts = forecasts.slice(0, this.maxForecasts);
        Object.values(forecasts)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .forEach((v: any) => {
            const forecastData: WeatherData = { wind: {} };
            forecastData.description = v['description'] ?? '';
            const d = new Date(v['date']);
            forecastData.time = d
              ? `${d.getHours()}:${('00' + d.getMinutes()).slice(-2)}`
              : '';

            if (typeof v.outside?.temperature !== 'undefined') {
              forecastData.temperature =
                this.app.config.units?.temperature === 'f'
                  ? Convert.kelvinToFarenheit(v.outside.temperature).toFixed(1)
                  : Convert.kelvinToCelsius(v.outside.temperature).toFixed(1);
            } else {
              forecastData.temperature = '--';
            }
            if (typeof v.outside?.dewPointTemperature !== 'undefined') {
              forecastData.dewPoint =
                this.app.config.units?.temperature === 'f'
                  ? Convert.kelvinToFarenheit(
                      v.outside.dewPointTemperature
                    ).toFixed(1)
                  : Convert.kelvinToCelsius(
                      v.outside.dewPointTemperature
                    ).toFixed(1);
            } else {
              forecastData.dewPoint = '--';
            }

            forecastData.humidity =
              typeof v.outside?.absoluteHumidity !== 'undefined'
                ? `${(v.outside?.absoluteHumidity * 100).toFixed(0)}`
                : '--';
            forecastData.pressure =
              typeof v.outside?.pressure !== 'undefined'
                ? `${Math.round(v.outside?.pressure)}`
                : '--';

            forecastData.rain =
              typeof v.outside?.precipitationVolume !== 'undefined'
                ? `${(v.outside?.precipitationVolume * 1000).toFixed(2)}`
                : '--';

            if (typeof v.wind !== 'undefined') {
              forecastData.wind.speed =
                typeof v.wind.speedTrue !== 'undefined'
                  ? `${this.app.formatSpeed(v.wind.speedTrue, true)}`
                  : '--';

              forecastData.wind.gust =
                typeof v.wind.gust !== 'undefined'
                  ? `${this.app.formatSpeed(v.wind.gust, true)}`
                  : '--';

              forecastData.wind.direction =
                typeof v.wind.directionTrue !== 'undefined'
                  ? `${this.toCardinal(Convert.radiansToDegrees(v.wind.directionTrue))}`
                  : '--';
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

  toCardinal(value: number) {
    return value > 348.75 && value <= 11.25
      ? 'N'
      : value > 11.25 && value <= 22.5
        ? 'NNE'
        : value > 22.5 && value <= 67.5
          ? 'NE'
          : value > 67.5 && value <= 78.75
            ? 'ENE'
            : value > 78.75 && value <= 101.25
              ? 'E'
              : value > 101.25 && value <= 112.5
                ? 'ESE'
                : value > 112.5 && value <= 157.5
                  ? 'SE'
                  : value > 157.5 && value <= 168.75
                    ? 'SSE'
                    : value > 168.75 && value <= 191.25
                      ? 'S'
                      : value > 191.25 && value <= 202.5
                        ? 'SSW'
                        : value > 202.5 && value <= 245.5
                          ? 'SW'
                          : value > 245.5 && value <= 258.75
                            ? 'WSW'
                            : value > 258.75 && value <= 281.25
                              ? 'W'
                              : value > 281.25 && value <= 292.5
                                ? 'WNW'
                                : value > 292.5 && value <= 337.5
                                  ? 'NW'
                                  : value > 337.5 && value <= 348.75
                                    ? 'NNW'
                                    : 'N';
  }
}
