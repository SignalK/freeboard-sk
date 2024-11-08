import { Component, Input } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBar } from '@angular/material/progress-bar';

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
    gust?: string;
  };
}

/********* Weather Data viewer component ****************/
@Component({
  selector: 'weather-data',
  standalone: true,
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
    MatProgressBar
  ],
  template: `
    <div class="weather-data">
      <mat-horizontal-stepper [linear]="false" #stepper>
        @for(item of data; track item; let i = $index) {
        <mat-step>
          <div style="display:flex;">
            <div style="min-width:50px;text-align:left;padding-top: 15%;">
              @if(i !== 0 && data.length > 1) {
              <button
                mat-icon-button
                (click)="currentPage = currentPage - 1"
                matStepperPrevious
              >
                <mat-icon>keyboard_arrow_left</mat-icon>
              </button>
              }
            </div>
            <div style="flex: 1 1 auto;">
              <mat-card>
                <div style="display:flex;flex-direction: column;">
                  <div style="display:flex;">
                    <div class="key-icon">
                      <mat-icon>schedule</mat-icon>
                    </div>
                    <div class="key-label">Time:</div>
                    <div style="flex: 1 1 auto;">
                      {{ item.time }}
                    </div>
                  </div>
                  @if(item.description) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Outlook:</div>
                    <div style="flex: 1 1 auto;">{{ item.description }}</div>
                  </div>
                  } @if(item.temperature) {
                  <div style="display:flex;">
                    <div class="key-icon">
                      <mat-icon>device_thermostat</mat-icon>
                    </div>
                    <div class="key-label">Temp:</div>
                    <div style="flex: 1 1 auto;">{{ item.temperature }}</div>
                  </div>
                  } @if(item.temperatureMin) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Min:</div>
                    <div style="flex: 1 1 auto;">{{ item.temperatureMax }}</div>
                  </div>
                  } @if(item.temperatureMax) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Max:</div>
                    <div style="flex: 1 1 auto;">{{ item.temperatureMax }}</div>
                  </div>
                  } @if(item.dewPoint) {
                  <div style="display:flex;">
                    <div class="key-icon">
                      <mat-icon>opacity</mat-icon>
                    </div>
                    <div class="key-label">Dew Point:</div>
                    <div style="flex: 1 1 auto;">{{ item.dewPoint }}</div>
                  </div>
                  } @if(item.wind.speed) {
                  <div style="display:flex;">
                    <div class="key-icon">
                      <mat-icon>air</mat-icon>
                    </div>
                    <div class="key-label">Wind Speed:</div>
                    <div style="flex: 1 1 auto;">{{ item.wind.speed }}</div>
                  </div>
                  } @if(item.wind.gust) {
                  <div style="display:flex;">
                    <div class="key-icon">
                      <mat-icon>air</mat-icon>
                    </div>
                    <div class="key-label">Wind Gust:</div>
                    <div style="flex: 1 1 auto;">{{ item.wind.gust }}</div>
                  </div>
                  } @if(item.wind.direction) {
                  <div style="display:flex;">
                    <div class="key-icon">
                      <mat-icon>outbound</mat-icon>
                    </div>
                    <div class="key-label">Wind Direction:</div>
                    <div style="flex: 1 1 auto;">{{ item.wind.direction }}</div>
                  </div>
                  } @if(item.humidity) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Humidity:</div>
                    <div style="flex: 1 1 auto;">{{ item.humidity }}</div>
                  </div>
                  } @if(item.pressure) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Pressure:</div>
                    <div style="flex: 1 1 auto;">{{ item.pressure }}</div>
                  </div>
                  } @if(item.uvIndex) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">UV Index:</div>
                    <div style="flex: 1 1 auto;">{{ item.uvIndex }}</div>
                  </div>
                  } @if(item.clouds) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Cloud Cover:</div>
                    <div style="flex: 1 1 auto;">{{ item.clouds }}</div>
                  </div>
                  } @if(item.visibility) {
                  <div style="display:flex;">
                    <div class="key-icon"></div>
                    <div class="key-label">Visibility:</div>
                    <div style="flex: 1 1 auto;">{{ item.visibility }}</div>
                  </div>
                  }
                </div>
              </mat-card>
            </div>
            <div style="min-width:50px;text-align:right;padding-top: 15%;">
              @if(i !== data.length - 1) {
              <button
                mat-icon-button
                (click)="currentPage = currentPage + 1"
                matStepperNext
              >
                <mat-icon>keyboard_arrow_right</mat-icon>
              </button>
              }
            </div>
          </div>
        </mat-step>
        }
      </mat-horizontal-stepper>
      <div style="text-align:center;font-size:10pt;font-family:roboto;">
        @for(c of data; track c; let i = $index) {
        <mat-icon
          [style.color]="currentPage - 1 === i ? 'blue' : 'gray'"
          style="font-size:8pt;width:12px;"
        >
          fiber_manual_record
        </mat-icon>
        }
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
      .weather-data .key-icon {
        width: 30px;
        font-weight: bold;
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

  public currentPage = 1;

  ngAfterViewInit() {
    const sh = document.getElementsByClassName(
      'mat-horizontal-stepper-header-container'
    );
    sh[0]['style']['display'] = 'none';
  }
}
