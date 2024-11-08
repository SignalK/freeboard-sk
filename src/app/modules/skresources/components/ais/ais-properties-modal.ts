import { Component, OnInit, Inject } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { SKVessel } from 'src/app/modules/skresources/resource-classes';
import { Convert } from 'src/app/lib/convert';

/********* AISPropertiesModal **********
	data: {
        title: "<string>" title text,
        target: "<SKVessel>" vessel,
        id: <string> vessel id
    }
***********************************/
@Component({
  selector: 'ap-ais-modal',
  standalone: true,
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
          <mat-icon> directions_boat</mat-icon>
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
        <mat-card-content>
          <div style="display:flex;flex-direction: column;">
            <div style="display:flex;">
              <div class="key-label">Name:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.name }}</div>
            </div>
            @if(vInfo.mmsi) {
            <div style="display:flex;">
              <div class="key-label">MMSI:</div>
              <div style="flex: 1 1 auto;">
                {{ vInfo.mmsi }}
                <a
                  target="aisinfo"
                  [href]="
                    'https://www.marinetraffic.com/en/ais/details/ships/mmsi:' +
                    vInfo.mmsi
                  "
                >
                  <mat-icon>info</mat-icon>
                </a>
              </div>
            </div>
            } @if(vInfo.shipType) {
            <div style="display:flex;">
              <div class="key-label">Type:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.shipType }}</div>
            </div>
            } @if(vInfo.flag) {
            <div style="display:flex;">
              <div class="key-label">Flag:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.flag }}</div>
            </div>
            } @if(vInfo.port) {
            <div style="display:flex;">
              <div class="key-label">Port:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.port }}</div>
            </div>
            } @if(vInfo.callsignVhf) {
            <div style="display:flex;">
              <div class="key-label">Call sign VHF:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.callsignVhf }}</div>
            </div>
            } @if(vInfo.callsignHf) {
            <div style="display:flex;">
              <div class="key-label">Call sign HF:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.callsignHf }}</div>
            </div>
            }@if(vInfo.length) {
            <div style="display:flex;">
              <div class="key-label">Dimensions:</div>
              <div style="flex: 1 1 auto;">
                {{ vInfo.length }} x {{ vInfo.beam }}
              </div>
            </div>
            } @if(vInfo.draft) {
            <div style="display:flex;">
              <div class="key-label">Draft:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.draft }}</div>
            </div>
            } @if(vInfo.height) {
            <div style="display:flex;">
              <div class="key-label">Height:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.height }}</div>
            </div>
            } @if(vInfo.state) {
            <div style="display:flex;">
              <div class="key-label">State:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.state }}</div>
            </div>
            } @if(vInfo.destination) {
            <div style="display:flex;">
              <div class="key-label">Destination:</div>
              <div style="flex: 1 1 auto;">{{ vInfo.destination }}</div>
            </div>
            } @if(vInfo.eta) {
            <div style="display:flex;">
              <div class="key-label">ETA:</div>
              <div style="flex: 1 1 auto;">
                {{ vInfo.eta.toLocaleString() }}
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
export class AISPropertiesModal implements OnInit {
  public vInfo = {
    name: null,
    mmsi: null,
    callsignVhf: null,
    callsignHf: null,
    length: null,
    beam: null,
    draft: null,
    height: null,
    shipType: null,
    destination: null,
    eta: null,
    state: null,
    flag: null,
    port: null
  };

  constructor(
    public app: AppInfo,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<AISPropertiesModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      target: SKVessel;
      id: string;
    }
  ) {}

  ngOnInit() {
    this.getVesselInfo();
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

  private getVesselInfo() {
    let path: string;
    if (!this.data.id) {
      path = 'vessels/self';
    } else {
      path = this.data.id.split('.').join('/');
    }

    this.sk.api.get(path).subscribe((v) => {
      if (typeof v['name'] !== 'undefined') {
        this.vInfo.name = v['name'];
      }
      if (typeof v['mmsi'] !== 'undefined') {
        this.vInfo.mmsi = v['mmsi'];
      }
      if (typeof v['flag'] !== 'undefined') {
        this.vInfo.flag = v['flag'];
      }
      if (typeof v['port'] !== 'undefined') {
        this.vInfo.port = v['port'];
      }
      if (typeof v['communication'] !== 'undefined') {
        if (typeof v['communication']['callsignVhf'] !== 'undefined') {
          this.vInfo.callsignVhf = v['communication']['callsignVhf']['value'];
        }
        if (typeof v['communication']['callsignHf'] !== 'undefined') {
          this.vInfo.callsignHf = v['communication']['callsignHf']['value'];
        }
      }
      if (typeof v['navigation'] !== 'undefined') {
        if (typeof v['navigation']['destination'] !== 'undefined') {
          if (
            typeof v['navigation']['destination']['commonName'] !== 'undefined'
          ) {
            this.vInfo.destination =
              v['navigation']['destination']['commonName']['value'];
          }
          if (typeof v['navigation']['destination']['eta'] !== 'undefined') {
            this.vInfo.eta = new Date(
              v['navigation']['destination']['eta']['value']
            ).toUTCString();
          }
        }
        if (
          typeof v['navigation']['state'] !== 'undefined' &&
          typeof v['navigation']['state']['value'] !== 'undefined'
        ) {
          this.vInfo.state = v['navigation']['state']['value'];
        }
      }
      if (typeof v['design'] !== 'undefined') {
        if (
          typeof v['design']['length'] !== 'undefined' &&
          v['design']['length']['value']['overall']
        ) {
          this.vInfo.length = v['design']['length']['value']['overall'];
        }
        if (typeof v['design']['beam'] !== 'undefined') {
          this.vInfo.beam = v['design']['beam']['value'];
        }
        if (
          typeof v['design']['draft'] !== 'undefined' &&
          v['design']['draft']['value']
        ) {
          if (typeof v['design']['draft']['value']['maximum'] !== 'undefined') {
            this.vInfo.draft = `${v['design']['draft']['value']['maximum']} (max)`;
          } else if (
            typeof v['design']['draft']['value']['current'] !== 'undefined'
          ) {
            this.vInfo.draft = `${v['design']['draft']['value']['current']} (current)`;
          }
        }
        if (typeof v['design']['airHeight'] !== 'undefined') {
          this.vInfo.height = v['design']['airHeight']['value'];
        }
        if (typeof v['design']['aisShipType'] !== 'undefined') {
          this.vInfo.shipType = v['design']['aisShipType']['value']['name'];
        }
      }
    });
  }
}
