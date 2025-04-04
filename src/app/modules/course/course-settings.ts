import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatBottomSheetModule,
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CommonDialogs } from 'src/app/lib/components/dialogs';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { SKStreamFacade } from 'src/app/modules';
import { UpdateMessage } from 'src/app/types';
import { Subscription } from 'rxjs';

/********* Course Settings Modal ********
	data: {
        title: "<string>" title text
    }
***********************************/
@Component({
  selector: 'ap-course-modal',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatBottomSheetModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    CommonDialogs
  ],
  template: `
    <div class="_ap-course">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon class="ob" svgIcon="navigation-route"></mat-icon>
        </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          {{ data.title }}
        </span>
        <span>
          <button
            mat-icon-button
            (click)="closeModal()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </mat-toolbar>

      <fieldset>
        <legend>Arrival</legend>

        <mat-form-field floatLabel="always">
          <mat-label
            >Arrival Circle radius ({{
              app.config.units.distance === 'm'
                ? app.config.units.distance
                : 'NM'
            }}):
          </mat-label>
          <input
            id="arrivalCircle"
            matInput
            type="number"
            min="0"
            [value]="frmArrivalCircle"
            (change)="onFormChange($event)"
            placeholder="500"
            matTooltip="Enter Arrival circle radius"
          />
        </mat-form-field>

        <div style="padding-right: 10px;">
          <mat-slide-toggle
            id="targetarrivalenable"
            labelPosition="before"
            [hideIcon]="true"
            [(checked)]="targetArrivalEnabled"
            (change)="toggleTargetArrival($event)"
          >
            Target Arrival time
          </mat-slide-toggle>
        </div>

        <div style="display:flex; flex-wrap:wrap;">
          <div>
            <mat-form-field floatLabel="always">
              <mat-label>Date</mat-label>
              <input
                id="arrivalDate"
                [disabled]="!targetArrivalEnabled"
                matInput
                required
                [matDatepicker]="picker"
                [min]="minDate"
                [(ngModel)]="arrivalData.datetime"
                (dateChange)="onFormChange($event)"
                placeholder="Choose a start date"
              />
              <mat-hint>MM/DD/YYYY</mat-hint>
              <mat-datepicker-toggle
                matIconSuffix
                [for]="picker"
              ></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
          </div>

          <div style="display:flex;flex-wrap:nowrap;">
            <mat-form-field style="width:100px;">
              <mat-label>Hour</mat-label>
              <mat-select
                id="arrivalHour"
                [(ngModel)]="arrivalData.hour"
                [disabled]="!targetArrivalEnabled"
                (selectionChange)="onFormChange($event)"
              >
                @for(i of hrValues(); track i) {
                <mat-option [value]="i">{{ i }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field style="width:100px;">
              <mat-label>Minutes</mat-label>
              <mat-select
                id="arrivalMinutes"
                [(ngModel)]="arrivalData.minutes"
                [disabled]="!targetArrivalEnabled"
                (selectionChange)="onFormChange($event)"
              >
                @for(i of minValues(); track i) {
                <mat-option [value]="i">{{ i }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field style="width:100px;">
              <mat-label>seconds</mat-label>
              <mat-select
                id="arrivalSeconds"
                [(ngModel)]="arrivalData.seconds"
                [disabled]="!targetArrivalEnabled"
                (selectionChange)="onFormChange($event)"
              >
                @for(i of minValues(); track i) {
                <mat-option [value]="i">{{ i }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </fieldset>
    </div>
  `,
  styles: [
    `
      ._ap-course {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-course .key-label {
        font-weight: 500;
        width: 120px;
      }
      ._ap-course .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class CourseSettingsModal implements OnInit {
  frmArrivalCircle: number;
  private deltaSub: Subscription;
  protected targetArrivalEnabled = false;
  protected minDate = new Date();
  protected arrivalData = {
    hour: '00',
    minutes: '00',
    seconds: '00',
    datetime: null
  };
  private context = 'self';
  /*this.app.data.vessels.activeId
  ? this.app.data.vessels.activeId
  : 'self';*/

  constructor(
    public app: AppFacade,
    private stream: SKStreamFacade,
    private cdr: ChangeDetectorRef,
    private signalk: SignalKClient,
    public modalRef: MatBottomSheetRef<CourseSettingsModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data
  ) {}

  ngOnInit() {
    if (this.data.title === 'undefined') {
      this.data['title'] = 'Course Settings';
    }
    this.frmArrivalCircle =
      this.app.data.navData.arrivalCircle === null
        ? 0
        : this.app.data.navData.arrivalCircle;
    this.frmArrivalCircle =
      this.app.config.units.distance === 'm'
        ? this.frmArrivalCircle
        : Number(
            Convert.kmToNauticalMiles(this.frmArrivalCircle / 1000).toFixed(1)
          );

    this.deltaSub = this.stream.delta$().subscribe((e: UpdateMessage) => {
      if (e.action === 'update') {
        this.cdr.detectChanges();
      }
    });

    this.signalk.api
      .get(this.app.skApiVersion, 'vessels/self/navigation/course')
      .subscribe((val) => {
        console.log(val.targetArrivalTime);
        if (val.targetArrivalTime) {
          this.targetArrivalEnabled = true;
          this.arrivalData.datetime = new Date(val.targetArrivalTime);
          this.arrivalData.hour = (
            '00' + this.arrivalData.datetime.getHours()
          ).slice(-2);
          this.arrivalData.minutes = (
            '00' + this.arrivalData.datetime.getMinutes()
          ).slice(-2);
          this.arrivalData.seconds = (
            '00' + this.arrivalData.datetime.getSeconds()
          ).slice(-2);
        }
      });
  }

  ngOnDestroy() {
    this.deltaSub.unsubscribe();
  }

  closeModal() {
    this.modalRef.dismiss();
  }

  onFormChange(e) {
    if (
      e.targetElement &&
      [
        'arrivalDate',
        'arrivalHour',
        'arrivalMinutes',
        'arrivalSeconds'
      ].includes(e.targetElement.id)
    ) {
      this.processTargetArrival();
    }
    if (
      e.source &&
      ['arrivalHour', 'arrivalMinutes', 'arrivalSeconds'].includes(e.source.id)
    ) {
      this.processTargetArrival();
    }
    if (e.target && e.target.id === 'arrivalCircle') {
      if (e.target.value !== '' && e.target.value !== null) {
        let d =
          this.app.config.units.distance === 'm'
            ? Number(e.target.value)
            : Convert.nauticalMilesToKm(Number(e.target.value)) * 1000;
        d = d <= 0 ? null : d;

        this.signalk.api
          .putWithContext(
            this.app.skApiVersion,
            this.context,
            'navigation/course/arrivalCircle',
            { value: d }
          )
          .subscribe(
            () => undefined,
            (error: HttpErrorResponse) => {
              let msg = `Error setting Arrival Circle!\n`;
              if (error.status === 403) {
                msg += 'Unauthorised: Please login.';
              }
              this.app.showAlert(`Error (${error.status}):`, msg);
            }
          );
      }
    }
  }

  toggleTargetArrival(e) {
    this.targetArrivalEnabled = e.checked;
    if (!this.targetArrivalEnabled) {
      this.arrivalData.datetime = null;
      this.signalk.api
        .putWithContext(
          this.app.skApiVersion,
          this.context,
          'navigation/course/targetArrivalTime',
          {
            value: null
          }
        )
        .subscribe();
    } else {
      this.processTargetArrival();
    }
  }

  processTargetArrival() {
    if (this.targetArrivalEnabled) {
      if (!this.arrivalData.datetime) {
        return;
      }
      const atime = this.formatArrivalTime();
      this.signalk.api
        .putWithContext(
          this.app.skApiVersion,
          this.context,
          'navigation/course/targetArrivalTime',
          {
            value: atime
          }
        )
        .subscribe(
          () => {
            console.log('targetArrivalTime = ', atime);
          },
          (error: HttpErrorResponse) => {
            let msg = `Error setting target arrival time!\n`;
            if (error.status === 403) {
              msg += 'Unauthorised: Please login.';
            }
            this.app.showAlert(`Error (${error.status}):`, msg);
          }
        );
    }
  }

  formatArrivalTime(): string {
    let ts = '';
    this.arrivalData.datetime.setHours(parseInt(this.arrivalData.hour));
    this.arrivalData.datetime.setMinutes(parseInt(this.arrivalData.minutes));
    this.arrivalData.datetime.setSeconds(parseInt(this.arrivalData.seconds));
    ts = this.arrivalData.datetime.toISOString();
    return ts.slice(0, ts.indexOf('.')) + 'Z';
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
}
