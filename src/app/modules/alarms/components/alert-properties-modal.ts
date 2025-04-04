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

import { SignalKDetailsComponent } from '../../skresources';
import { AlertData } from './alert.component';
import { NotificationManager } from '../notification-manager';

/********* AlertPropertiesModal **********
	data: {
    alert: "<string>" title text
  }
***********************************/
@Component({
  selector: 'ap-alert-modal',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-alert">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon
            [class]="data.alert.icon.class"
            [svgIcon]="data.alert.icon.svgIcon"
          >
            {{ data.alert.icon.name }}</mat-icon
          >
        </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          Alert Information
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
            @if(data.alert.canAcknowledge && !data.alert.acknowledged) {
            <div style="display:flex;">
              <div style="flex: 1 1 auto;">
                <button
                  class="button-warn"
                  mat-raised-button
                  (click)="notiMgr.acknowledge(data.alert.path)"
                >
                  <mat-icon>check</mat-icon> Acknowledge
                </button>
              </div>
            </div>
            }
            <div style="display:flex;">
              <div class="key-label">Message:</div>
              <div style="flex: 1 1 auto;">{{ data.alert.message }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Type:</div>
              <div style="flex: 1 1 auto;">{{ data.alert.type }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Priority:</div>
              <div style="flex: 1 1 auto;">{{ data.alert.priority }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Raised at:</div>
              <div style="flex: 1 1 auto;">{{ raisedAt }}</div>
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
      ._ap-alert {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-alert .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AlertPropertiesModal implements OnInit {
  protected showProperties = true;
  protected properties: { [key: string]: any };
  protected raisedAt!: string;

  constructor(
    protected notiMgr: NotificationManager,
    public modalRef: MatBottomSheetRef<AlertPropertiesModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      alert: AlertData;
    }
  ) {}

  ngOnInit() {
    this.parseAlertInfo();
  }

  toggleProperties() {
    this.showProperties = !this.showProperties;
  }

  private parseAlertInfo() {
    this.properties = this.data.alert.properties ?? {};
    const d = new Date(this.data.alert.createdAt);
    this.raisedAt = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }
}
