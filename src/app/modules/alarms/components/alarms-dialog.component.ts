/** Alarms Dialog Components **
 ********************************/

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, Inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Subscription } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { AlarmsFacade } from '../alarms.facade';
import { AppFacade } from 'src/app/app.facade';

/********* AlarmsDialog *********
	data: {
        alarms: current alarms and their state
    }
***********************************/
@Component({
  selector: 'ap-alarmsdialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    MatToolbarModule
  ],
  template: `
    <div class="_ap-alarms">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>alarm_on</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Alarms</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <div style="display:flex;flex-wrap:wrap;">
          @for(i of stdAlarms; track i) {
          <div class="alarm-item">
            @if(i.cancel || i.displayAlways) {
            <mat-card appearance="outlined" style="padding:3px;">
              <mat-card-title-group>
                <img
                  width="30px"
                  [src]="'./assets/img/alarms/' + i.key + '.png'"
                />
                <mat-card-title>{{ i.title }}</mat-card-title>
              </mat-card-title-group>
              <mat-card-content> </mat-card-content>
              <mat-card-actions>
                @if(!i.cancel) {
                <button
                  class="button-warn"
                  mat-raised-button
                  (click)="raise(i.key)"
                >
                  <mat-icon>alarm_on</mat-icon>
                  RAISE ALARM
                </button>
                } @else {
                <button
                  class="button-accent"
                  mat-raised-button
                  (click)="clear(i.key)"
                >
                  <mat-icon>alarm_off</mat-icon>
                  CANCEL ALARM
                </button>
                }
              </mat-card-actions>
            </mat-card>
            }
          </div>
          }
        </div>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      ._ap-alarms {
        font-family: arial;
        max-width: 500px;
      }
      .alarm-item {
        width: 100%;
      }

      @media only screen and (min-width: 500px) {
        .alarm-item {
          width: 50%;
        }
      }
    `
  ]
})
export class AlarmsDialog implements OnInit {
  public stdAlarms: Array<{
    key: string;
    title: string;
    subtitle: string;
    cancel: boolean;
    displayAlways: boolean;
  }>;
  private obs: Subscription;

  constructor(
    private app: AppFacade,
    private signalk: SignalKClient,
    private facade: AlarmsFacade,
    public dialogRef: MatDialogRef<AlarmsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: unknown
  ) {}

  ngOnInit() {
    this.obs = this.facade.update$().subscribe(() => {
      this.parseAlarms();
    });
    this.stdAlarms = [
      {
        key: 'mob',
        title: 'M.O.B.',
        subtitle: 'Man Overboard!',
        cancel: false,
        displayAlways: true
      },
      {
        key: 'sinking',
        title: 'Sinking',
        subtitle: 'Vessel sinking!',
        cancel: false,
        displayAlways: true
      },
      {
        key: 'fire',
        title: 'Fire',
        subtitle: 'Fire onboard!',
        cancel: false,
        displayAlways: true
      },
      {
        key: 'piracy',
        title: 'Piracy',
        subtitle: 'Pirates encountered!',
        cancel: false,
        displayAlways: true
      },
      {
        key: 'abandon',
        title: 'Abandon',
        subtitle: 'Abandoned ship!',
        cancel: false,
        displayAlways: true
      },
      {
        key: 'adrift',
        title: 'Adrift',
        subtitle: 'Vessel adrift!',
        cancel: false,
        displayAlways: true
      },
      {
        key: 'flooding',
        title: 'Flooding',
        subtitle: 'Taking on Water!',
        cancel: false,
        displayAlways: false
      },
      {
        key: 'listing',
        title: 'Listing',
        subtitle: 'Vessel listing!',
        cancel: false,
        displayAlways: false
      },
      {
        key: 'collision',
        title: 'Collision',
        subtitle: 'Vessel collision!',
        cancel: false,
        displayAlways: false
      },
      {
        key: 'grounding',
        title: 'Grounding',
        subtitle: 'Vessel run aground!',
        cancel: false,
        displayAlways: false
      }
    ];

    this.parseAlarms();
  }

  ngOnDestroy() {
    this.obs.unsubscribe();
  }

  parseAlarms() {
    this.stdAlarms.forEach((i) => {
      if (this.facade.alarms.has(i.key)) {
        i.cancel =
          this.facade.alarms.get(i.key).state !== 'normal' ? true : false;
      } else {
        i.cancel = false;
      }
    });
    this.stdAlarms.sort((a, b) => {
      if (!a.cancel && b.cancel) {
        return 1;
      }
      if (a.cancel && !b.cancel) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  raise(alarmType: string) {
    this.signalk.api
      .post(this.app.skApiVersion, `alarms/${alarmType}`, undefined)
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          console.warn(`Error raising alarm: ${alarmType}`, err);
        }
      );
    this.dialogRef.close();
  }

  clear(alarmType: string) {
    this.signalk.api
      .delete(this.app.skApiVersion, `alarms/${alarmType}`)
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          console.warn(`Error clearing alarm: ${alarmType}`, err);
        }
      );
  }
}
