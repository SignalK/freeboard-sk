/***********************************
  Alert List
  <alert-list>
***********************************/
import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  Output,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { AppFacade } from 'src/app/app.facade';
import { getAlertIcon } from '../../icons';
import { AlertData } from './alert.component';
import { NotificationManager } from '../notification-manager';

@Component({
  selector: 'alert-list',
  imports: [
    MatTooltipModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    FormsModule,
    CdkDrag
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./alert-list.component.css'],
  template: `
    <mat-menu #alarmsmenu="matMenu">
      <button mat-menu-item (click)="raiseAlarm('mob')">
        <mat-icon class="ob" svgIcon="alarm-mob"></mat-icon>
        &nbsp;Overboard!
      </button>
      <button mat-menu-item (click)="raiseAlarm('fire')">
        <mat-icon class="ob" svgIcon="alarm-fire"></mat-icon>
        &nbsp;Fire
      </button>
      <button mat-menu-item (click)="raiseAlarm('aground')">
        <mat-icon class="ob" svgIcon="alarm-aground"></mat-icon>
        &nbsp;Aground
      </button>
      <button mat-menu-item (click)="raiseAlarm('abandon')">
        <mat-icon class="ob" svgIcon="alarm-abandon"></mat-icon>
        &nbsp;Abandon
      </button>
      <button mat-menu-item (click)="raiseAlarm('piracy')">
        <mat-icon class="" svgIcon="alarm-acknowledged-iec"></mat-icon>
        &nbsp;Piracy
      </button>
    </mat-menu>
    <mat-card appearance="outlined">
      <div class="alert-list-main mat-app-background" cdkDrag>
        <div class="title" cdkDragHandle>
          <div>
            <button
              class="button-warn"
              mat-raised-button
              matTooltip="Raise Alarm"
              matTooltipPosition="right"
              [matMenuTriggerFor]="alarmsmenu"
            >
              <mat-icon>warning</mat-icon>
              Raise
            </button>
          </div>
          <div
            style="flex: 1 1 auto;
            font-size: 14pt;
            line-height: 2.5em;
            text-align: center;
            cursor: grab;"
          >
            Alert List
          </div>
          <div>
            <button
              mat-icon-button
              [matTooltip]="
                this.app.config.muteSound ? 'Sound is Off' : 'Sound is On'
              "
              matTooltipPosition="left"
              (click)="togglePlaySound()"
            >
              <mat-icon
                class="ob"
                [svgIcon]="
                  this.app.config.muteSound
                    ? 'sound-off-fill'
                    : 'sound-high-fill'
                "
              ></mat-icon>
            </button>
            &nbsp;
            <button mat-icon-button (click)="handleClose()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="content">
          <div class="alert-list-container">
            <div class="alert-list">
              @for(item of alerts(); track item[0]) {
              <div class="alert-box">
                <div
                  style="width:40px;"
                  (click)="notiMgr.showAlertInfo(item[1].path)"
                >
                  <mat-icon
                    [class]="item[1].icon.class"
                    [svgIcon]="item[1].icon.svgIcon"
                    >{{ item[1].icon.name }}</mat-icon
                  >
                </div>
                <div
                  class="alert-text"
                  (click)="notiMgr.showAlertInfo(item[1].path)"
                  [ngClass]="{
                    'blink-text':
                      item[1].canAcknowledge && !item[1].acknowledged,
                    'red-text': ['emergency', 'alarm'].includes(
                      item[1].priority
                    ),
                    'amber-text': item[1].priority === 'alert'
                  }"
                >
                  {{ item[1].message }}
                </div>
                <div style="width:90px;">
                  @if(item[1].sound) {
                  <button
                    mat-icon-button
                    [matTooltip]="item[1].silenced ? 'Silenced' : 'Silence'"
                    matTooltipPosition="below"
                    [disabled]="item[1].acknowledged || item[1].silenced"
                    (click)="muteAlert(item[1].path)"
                  >
                    <mat-icon
                      [class]="item[1].acknowledged ? '' : 'ob'"
                      [svgIcon]="
                        item[1].silenced ? 'sound-off-fill' : 'sound-high-fill'
                      "
                    ></mat-icon>
                  </button>
                  &nbsp; } @if(item[1].canAcknowledge) {
                  @if(!item[1].acknowledged) {
                  <button
                    mat-icon-button
                    matTooltip="Acknowledge"
                    matTooltipPosition="below"
                    [disabled]="item[1].acknowledged"
                    (click)="ackAlert(item[1].path)"
                  >
                    <mat-icon>check</mat-icon>
                  </button>
                  } @else { @if(item[1].canCancel) {
                  <button
                    mat-icon-button
                    matTooltip="Clear / Cancel"
                    matTooltipPosition="below"
                    [disabled]="!item[1].acknowledged"
                    (click)="clearAlert(item[1].path)"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                  } } }
                </div>
              </div>
              }
            </div>
          </div>
        </div>
      </div>
    </mat-card>
  `
})
export class AlertListComponent {
  alerts = input([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() closed: EventEmitter<void> = new EventEmitter();

  constructor(
    protected app: AppFacade,
    protected notiMgr: NotificationManager
  ) {}

  protected handleClose() {
    this.closed.emit();
  }

  protected togglePlaySound() {
    this.app.config.muteSound = !this.app.config.muteSound;
    this.app.saveConfig();
  }

  protected ackAlert(path: string) {
    this.notiMgr.acknowledge(path);
  }

  protected muteAlert(path: string) {
    this.notiMgr.silence(path);
  }

  protected clearAlert(path: string) {
    this.notiMgr.clear(path);
  }

  /**
   * @description Raise standard alarm
   * @param alarmType Signal K standard alarm
   */
  protected raiseAlarm(alarmType: string) {
    const msg = alarmType === 'mob' ? 'Person Overboard!' : undefined;
    this.notiMgr.raiseServerAlarm(alarmType, msg);
  }

  /**
   * @description Set the alert icon
   * @returns svgIcon value
   */
  protected setIcon(alert: AlertData): string {
    return getAlertIcon(alert).svgIcon;
  }
}
