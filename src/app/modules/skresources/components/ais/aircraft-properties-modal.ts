import { Component, Inject } from '@angular/core';
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
import { SignalKClient } from 'signalk-client-angular';
import { SKAircraft } from 'src/app/modules/skresources/resource-classes';
import { SignalKDetailsComponent } from '../../components/signalk-details.component';

/********* AircraftPropertiesModal **********
	data: {
        title: "<string>" title text,
        target: "<SKAircraft>" aid to navigation
    }
***********************************/
@Component({
  selector: 'ap-aircraft-modal',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-aircraft">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon> airplanemode_active</mat-icon>
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
              <div style="flex: 1 1 auto;">{{ data.target.name }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">MMSI:</div>
              <div style="flex: 1 1 auto;">{{ data.target.mmsi }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Call sign VHF:</div>
              <div style="flex: 1 1 auto;">{{ data.target.callsignVhf }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Call sign HF:</div>
              <div style="flex: 1 1 auto;">{{ data.target.callsignHf }}</div>
            </div>
            <button mat-stroked-button (click)="toggleProperties()">
              <span>Show {{ showProperties ? 'Less' : 'More' }}</span>
              <mat-icon>{{
                showProperties ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
              }}</mat-icon>
            </button>
            @if(showProperties) {
            <signalk-details-list [details]="properties"></signalk-details-list>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      ._ap-aircraft {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-aircraft .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AircraftPropertiesModal {
  protected showProperties = true;
  protected properties: { [key: string]: string | number | null };

  constructor(
    private sk: SignalKClient,
    private app: AppFacade,
    public modalRef: MatBottomSheetRef<AircraftPropertiesModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      target: SKAircraft;
      id: string;
      icon: string;
    }
  ) {}

  ngOnInit() {
    this.getAircraftInfo();
  }

  // fetch object information
  private getAircraftInfo() {
    if (!this.data.id) {
      return;
    }
    const path = this.data.id.split('.').join('/');

    this.sk.api.get(path).subscribe((v) => {
      this.properties = this.parseAircraft(v);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAircraft(data: any) {
    const res = {};

    if (data.navigation && data.navigation.position) {
      res['navigation.position'] = data.navigation.position.value;
    }
    return res;
  }

  toggleProperties() {
    this.showProperties = !this.showProperties;
  }
}
