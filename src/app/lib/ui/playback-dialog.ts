/** History Playback Dialog **
 ********************************/

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'ap-playbackdialog',
  template: `
    <div class="_ap-playback">
      <div>
        <h1 mat-dialog-title>
          <mat-icon>history</mat-icon>&nbsp;History Playback
        </h1>
      </div>
      <mat-dialog-content>
        <div style="display:flex;">
          <div>
            <div>
              <b>Context:</b>&nbsp;&nbsp;
              <mat-form-field style="width:50px;">
                <mat-select [(ngModel)]="formData.context">
                  <mat-option *ngFor="let i of ['self', 'all']" [value]="i">{{
                    i
                  }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <div>
              <mat-form-field>
                <input
                  matInput
                  required
                  [matDatepicker]="picker"
                  [(ngModel)]="formData.startDate"
                  placeholder="Choose a start date"
                />
                <mat-datepicker-toggle
                  matSuffix
                  [for]="picker"
                ></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>
            </div>
            <div>
              <b>Start Time:</b>&nbsp;&nbsp;
              <mat-form-field style="width:50px;">
                <mat-select [(ngModel)]="formData.startTimeHr">
                  <mat-option *ngFor="let i of hrValues()" [value]="i">{{
                    i
                  }}</mat-option>
                </mat-select>
              </mat-form-field>
              <b>: </b>
              <mat-form-field style="width:50px;">
                <mat-select [(ngModel)]="formData.startTimeMin">
                  <mat-option *ngFor="let i of minValues()" [value]="i">{{
                    i
                  }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <div>
              <b>Playback Rate:</b>&nbsp;&nbsp;
              <mat-form-field
                style="width:50px;"
                matTooltip="Advance stream the selected number of seconds for every second of playback"
              >
                <mat-select [(ngModel)]="formData.playbackRate">
                  <mat-option *ngFor="let i of rateValues()" [value]="i">{{
                    i
                  }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <div style="text-align:center;width:100%;">
          <button
            mat-raised-button
            color="primary"
            [disabled]="!formData.startDate"
            (click)="submit()"
          >
            START
          </button>
          <button mat-raised-button (click)="submit(true)">CANCEL</button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-playback {
        font-family: arial;
        min-width: 300px;
      }
      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
      }
    `
  ]
})
export class PlaybackDialog {
  public hour;
  public minute;
  public formData = {
    context: 'all',
    startTimeHr: '00',
    startTimeMin: '00',
    startDate: null,
    playbackRate: 1
  };

  constructor(
    public dialogRef: MatDialogRef<PlaybackDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  submit(cancel = false) {
    let q = {};
    let ts = '';
    if (!cancel) {
      this.formData.startDate.setHours(parseInt(this.formData.startTimeHr));
      this.formData.startDate.setMinutes(parseInt(this.formData.startTimeMin));
      ts = this.formData.startDate.toISOString();
      ts = ts.slice(0, ts.indexOf('.')) + 'Z';
      q = {
        subscribe: this.formData.context,
        startTime: ts,
        playbackRate: this.formData.playbackRate
      };
    }
    this.dialogRef.close({
      result: !cancel,
      query: q,
      startTime: ts
    });
  }

  hrValues() {
    const v = [];
    for (let i = 0; i < 24; i++) {
      v.push(('00' + i).slice(-2));
    }
    return v;
  }

  minValues() {
    const v = [];
    for (let i = 0; i < 59; i++) {
      v.push(('00' + i).slice(-2));
    }
    return v;
  }

  rateValues() {
    return [0.5, 1, 2, 5, 10];
  }
}
