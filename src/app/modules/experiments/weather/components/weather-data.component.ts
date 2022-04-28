import { Component, Input } from '@angular/core';

export interface WeatherData {
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
  };
}

/********* Weather Data viewer component ****************/
@Component({
  selector: 'weather-data',
  template: `
    <div class="weather-data">
      <mat-horizontal-stepper [linear]="false" #stepper>
        <mat-step *ngFor="let item of data; let i = index">
          <div style="display:flex;">
            <div style="min-width:50px;text-align:left;padding-top: 15%;">
              <button
                mat-icon-button
                *ngIf="i != 0 && data.length > 1"
                (click)="currentPage = currentPage - 1"
                color="primary"
                matStepperPrevious
              >
                <mat-icon>keyboard_arrow_left</mat-icon>
              </button>
            </div>
            <div style="flex: 1 1 auto;">
              <mat-card>
                <div style="display:flex;flex-direction: column;">
                  <div style="display:flex;">
                    <div class="key-label">
                      <mat-icon>schedule</mat-icon>
                      Time:
                    </div>
                    <div style="flex: 1 1 auto;">
                      {{ item.time.split(':').slice(0, 2).join(':') }}
                    </div>
                  </div>
                  <div style="display:flex;">
                    <div class="key-label">Outlook:</div>
                    <div style="flex: 1 1 auto;">{{ item.description }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.temperature">
                    <div class="key-label">
                      <mat-icon>device_thermostat</mat-icon>
                      Temp:
                    </div>
                    <div style="flex: 1 1 auto;">{{ item.temperature }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.temperatureMin">
                    <div class="key-label">Min:</div>
                    <div style="flex: 1 1 auto;">{{ item.temperatureMax }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.temperatureMax">
                    <div class="key-label">Max:</div>
                    <div style="flex: 1 1 auto;">{{ item.temperatureMax }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.dewPoint">
                    <div class="key-label">
                      <mat-icon>opacity</mat-icon>
                      Dew Point:
                    </div>
                    <div style="flex: 1 1 auto;">{{ item.dewPoint }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.wind.speed">
                    <div class="key-label">
                      <mat-icon>air</mat-icon>
                      Wind Speed:
                    </div>
                    <div style="flex: 1 1 auto;">{{ item.wind.speed }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.wind.direction">
                    <div class="key-label">
                      <mat-icon>outbound</mat-icon>
                      Wind Direction:
                    </div>
                    <div style="flex: 1 1 auto;">{{ item.wind.direction }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.humidity">
                    <div class="key-label">Humidity:</div>
                    <div style="flex: 1 1 auto;">{{ item.humidity }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.pressure">
                    <div class="key-label">Pressure:</div>
                    <div style="flex: 1 1 auto;">{{ item.pressure }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.uvIndex">
                    <div class="key-label">UV Index:</div>
                    <div style="flex: 1 1 auto;">{{ item.uvIndex }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.clouds">
                    <div class="key-label">Cloud Cover:</div>
                    <div style="flex: 1 1 auto;">{{ item.clouds }}</div>
                  </div>
                  <div style="display:flex;" *ngIf="item.visibility">
                    <div class="key-label">Visibility:</div>
                    <div style="flex: 1 1 auto;">{{ item.visibility }}</div>
                  </div>
                </div>
              </mat-card>
            </div>
            <div style="min-width:50px;text-align:right;padding-top: 15%;">
              <button
                mat-icon-button
                *ngIf="i != data.length - 1"
                (click)="currentPage = currentPage + 1"
                color="primary"
                matStepperNext
              >
                <mat-icon>keyboard_arrow_right</mat-icon>
              </button>
            </div>
          </div>
        </mat-step>
      </mat-horizontal-stepper>
      <div style="text-align:center;font-size:10pt;font-family:roboto;">
        <mat-icon
          *ngFor="let c of data; let i = index"
          [style.color]="currentPage - 1 == i ? 'blue' : 'gray'"
          style="font-size:8pt;width:12px;"
        >
          fiber_manual_record
        </mat-icon>
      </div>
    </div>
  `,
  styles: [
    `
      .weather-data h1 {
        font-weight: normal !important;
      }
      .weather-data-row {
        display: -webkit-box;
        display: -moz-box;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-content: stretch;
        font-family: Arial, Helvetica, sans-serif;
      }
      .weather-data-row .item.stretch {
        text-align: center;
        width: 100%;
      }
      .weather-data-row .item {
        padding-left: 5px;
      }
      .weather-data-row img {
        width: 42px;
      }
      .weather-data-row .description {
        font-size: 12pt;
      }
      .weather-data .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class WeatherDataComponent {
  @Input() data: Array<WeatherData>;

  public currentPage: number = 1;

  constructor() {}

  ngAfterViewInit() {
    let sh = document.getElementsByClassName(
      'mat-horizontal-stepper-header-container'
    );
    sh[0]['style']['display'] = 'none';
  }
}
