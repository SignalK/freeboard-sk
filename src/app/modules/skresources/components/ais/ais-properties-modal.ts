import { Component, Inject, signal } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AppFacade } from 'src/app/app.facade';
import { SKVessel } from 'src/app/modules/skresources/resource-classes';
import { getAisIcon } from 'src/app/modules/icons';

/********* AISPropertiesModal **********
	data: {
        title: "<string>" title text,
        target: <SKVessel> vessel
    }
***********************************/
@Component({
  selector: 'ap-ais-modal',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule
  ],
  template: `
    <div class="_ap-ais">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon [svgIcon]="getShipIcon(data.target.type?.id)"></mat-icon>
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

      <mat-card>
        <mat-card-header>
          <mat-card-title-group>
            <mat-card-title>{{ data.target.name }}</mat-card-title>
            <mat-card-subtitle>
              {{ data.target.mmsi }}
              <a
                target="aisinfo"
                [href]="
                  'https://www.marinetraffic.com/en/ais/details/ships/mmsi:' +
                  data.target.mmsi
                "
              >
                <mat-icon>info</mat-icon>
              </a>
            </mat-card-subtitle>
            @if(showFlag()) {
            <img mat-card-sm-image [src]="flagIcon" (error)="imgError()" />
            }
          </mat-card-title-group>
        </mat-card-header>
        <mat-card-content>
          <div style="display:flex;flex-direction: column;">
            @if(data.target.type?.name) {
            <div style="display:flex;">
              <div class="key-label">Type:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.type?.name }}
              </div>
            </div>
            } @if(data.target.flag) {
            <div style="display:flex;">
              <div class="key-label">Flag:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.flag }}
              </div>
            </div>
            } @if(data.target.port) {
            <div style="display:flex;">
              <div class="key-label">Port:</div>
              <div style="flex: 1 1 auto;">{{ data.target.port }}</div>
            </div>
            } @if(data.target.registrations?.imo) {
            <div style="display:flex;">
              <div class="key-label">IMO:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.registrations?.imo }}
              </div>
            </div>
            } @if(data.target.callsignVhf) {
            <div style="display:flex;">
              <div class="key-label">Call sign VHF:</div>
              <div style="flex: 1 1 auto;">{{ data.target.callsignVhf }}</div>
            </div>
            } @if(data.target.callsignHf) {
            <div style="display:flex;">
              <div class="key-label">Call sign HF:</div>
              <div style="flex: 1 1 auto;">{{ data.target.callsignHf }}</div>
            </div>
            }@if(data.target.design.length?.overall && data.target.design?.beam)
            {
            <div style="display:flex;">
              <div class="key-label">Dimensions:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.design.length?.overall }} x
                {{ data.target.design.beam }}
              </div>
            </div>
            } @if(data.target.design.draft?.current) {
            <div style="display:flex;">
              <div class="key-label">Draft:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.design.draft?.current }}
              </div>
            </div>
            } @if(data.target.design.draft?.maximum) {
            <div style="display:flex;">
              <div class="key-label">Draft (max):</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.design.draft?.maximum }}
              </div>
            </div>
            } @if(data.target.design?.airHeight) {
            <div style="display:flex;">
              <div class="key-label">Height:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.design.airHeight }}
              </div>
            </div>
            } @if(data.target.state) {
            <div style="display:flex;">
              <div class="key-label">State:</div>
              <div style="flex: 1 1 auto;">{{ data.target.state }}</div>
            </div>
            } @if(data.target.destination?.name) {
            <div style="display:flex;">
              <div class="key-label">Destination:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.destination.name }}
              </div>
            </div>
            } @if(data.target.destination?.eta) {
            <div style="display:flex;">
              <div class="key-label">ETA:</div>
              <div style="flex: 1 1 auto;">
                {{ data.target.destination.eta.toLocaleString() }}
              </div>
            </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      ._ap-ais {
        font-family: arial;
      }
      ._ap-ais .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AISPropertiesModal {
  protected flagIcon: string;
  protected showFlag = signal<boolean>(true);

  constructor(
    public app: AppFacade,
    public modalRef: MatBottomSheetRef<AISPropertiesModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      target: SKVessel;
    }
  ) {
    this.flagIcon = `${this.app.host}/signalk/v2/api/resources/flags/mmsi/${this.data.target.mmsi}`;
  }

  /**
   * Handle flag image error
   */
  imgError() {
    this.showFlag.set(false);
  }

  /**
   * @description Return icon for AIS vessel type id
   * @param id AIS shipType identifier
   * @returns mat-icon svgIcon value
   */
  protected getShipIcon(id: number): string {
    return getAisIcon(id).svgIcon;
  }
}
