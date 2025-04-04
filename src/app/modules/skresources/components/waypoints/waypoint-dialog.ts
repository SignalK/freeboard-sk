/** Waypoint Details Dialog Component **
 ********************************/

import { Component, OnInit, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  FormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { AppFacade } from 'src/app/app.facade';
import { PipesModule } from 'src/app/lib/pipes';
import { SKWaypoint } from '../../resource-classes';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getResourceIcon } from 'src/app/modules/icons';

/********* WaypointDialog **********
	data: {
    title: <string> title text,
    addMode: <boolean> Add vs update waypoint,
    waypoint: <SKWaypoint> Waypoint resource
  }
***********************************/
@Component({
  selector: 'ap-waypointdialog',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatDialogModule,
    PipesModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="_ap-waypoint">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          <mat-icon class="icon-waypoint">{{ icon }}</mat-icon>
        </div>
        <div>
          <h1 mat-dialog-title>{{ data['title'] }}</h1>
        </div>
      </div>

      <mat-dialog-content>
        <div>
          <div style="padding-left: 10px;">
            <div>
              <mat-form-field floatLabel="always">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  type="text"
                  required
                  [readonly]="readOnly"
                  [formControl]="inpName"
                  (blur)="updateErrorMessage()"
                />
                @if(inpName.invalid && (inpName.dirty || inpName.touched)) {
                <mat-error>{{ errorMessage() }}</mat-error>
                }
              </mat-form-field>
            </div>
            <div>
              <mat-form-field floatLabel="always">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  rows="2"
                  #inpcmt="ngModel"
                  [readonly]="readOnly"
                  [(ngModel)]="description"
                >
                </textarea>
              </mat-form-field>
            </div>

            <div>
              <mat-form-field style="width:100%;" floatLabel="always">
                <mat-label>Type</mat-label>
                <mat-select [disabled]="readOnly" [(value)]="wptType">
                  @for(wt of waypointTypes; track wt) {
                  <mat-optgroup [label]="wt.group">
                    @for(i of wt.icons; track i) {
                    <mat-option [value]="i.type">
                      <mat-icon
                        [class]="i.icon.class"
                        [svgIcon]="i.icon.svgIcon"
                        >{{ i.icon.name }}</mat-icon
                      >
                      {{ i.name }}
                    </mat-option>
                    }
                  </mat-optgroup>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div style="font-size: 10pt;">
              <div style="display:flex;">
                @if(readOnly) {
                <div style="width:45px;font-weight:bold;">Lat:</div>
                <div
                  style="flex: 1 1 auto;"
                  [innerText]="
                    lat | coords : app.config.selections.positionFormat : true
                  "
                ></div>
                } @else {
                <div style="flex: 1 1 auto;">
                  <mat-form-field floatLabel="always">
                    <mat-label>Latitude</mat-label>
                    <input
                      matInput
                      type="number"
                      min="-90"
                      max="90"
                      required
                      [formControl]="inpLat"
                      (blur)="updateErrorMessage()"
                    />
                    @if(inpLat.invalid && (inpLat.dirty || inpLat.touched)) {
                    <mat-error>{{ errorMessage() }}</mat-error>
                    }
                  </mat-form-field>
                </div>
                }
              </div>
              <div style="display:flex;">
                @if(readOnly) {
                <div style="width:45px;font-weight:bold;">Lon:</div>
                <div
                  style="flex: 1 1 auto;"
                  [innerText]="
                    lon | coords : app.config.selections.positionFormat
                  "
                ></div>
                } @else {
                <div style="flex: 1 1 auto;">
                  <mat-form-field floatLabel="always">
                    <mat-label>Longitude</mat-label>
                    <input
                      matInput
                      type="number"
                      min="-180"
                      max="180"
                      [formControl]="inpLon"
                      (blur)="updateErrorMessage()"
                    />
                    @if(inpLon.invalid && (inpLon.dirty || inpLon.touched)) {
                    <mat-error>{{ errorMessage() }}</mat-error>
                    }
                  </mat-form-field>
                </div>
                }
              </div>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <div style="text-align:center;width:100%;">
          @if(!readOnly) {
          <button
            mat-raised-button
            [disabled]="
              inpLat.invalid || inpLon.invalid || inpName.invalid || readOnly
            "
            (click)="handleClose(true)"
          >
            SAVE
          </button>
          }
          <button mat-raised-button (click)="handleClose(false)">CANCEL</button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-waypoint {
        min-width: 300px;
      }
    `
  ]
})
export class WaypointDialog implements OnInit {
  protected icon: string;
  protected waypointTypes: Array<any>;

  protected description: string;
  protected wptType: string;
  protected lat: number;
  protected lon: number;
  protected readOnly = false;

  protected inpLat: FormControl;
  protected inpLon: FormControl;
  protected inpName: FormControl;

  errorMessage = signal('');

  constructor(
    protected app: AppFacade,
    protected dialogRef: MatDialogRef<WaypointDialog>,
    @Inject(MAT_DIALOG_DATA)
    protected data: {
      title: string;
      addMode: boolean;
      waypoint: SKWaypoint;
    }
  ) {}

  ngOnInit() {
    this.description = this.data.waypoint.description ?? '';
    this.wptType = this.data.waypoint.type ?? '';
    const coords = this.data.waypoint.feature.geometry.coordinates ?? [0, 0];
    this.lat = coords[1];
    this.lon = coords[0];
    this.readOnly = this.data.waypoint.feature.properties?.readOnly ?? false;
    this.icon = this.data.addMode ? 'add_location' : 'edit_location';
    this.inpLat = new FormControl(this.lat, [Validators.required]);
    this.inpLon = new FormControl(this.lon, [Validators.required]);
    this.inpName = new FormControl(this.data.waypoint.name ?? '', [
      Validators.required
    ]);

    const wptIcons = {
      default: getResourceIcon('waypoints', undefined),
      pseudoaton: getResourceIcon('waypoints', 'pseudoaton'),
      whale: getResourceIcon('waypoints', 'whale'),
      pob: getResourceIcon('waypoints', 'alarm-mob')
    };

    this.waypointTypes = [
      {
        group: 'Points of Interest',
        icons: [
          {
            type: '',
            name: 'Waypoint',
            icon: wptIcons.default
          },
          {
            type: 'pseudoaton',
            name: 'Pseudo AtoN',
            icon: wptIcons.pseudoaton
          },
          {
            type: 'whale',
            name: 'Whale Sighting',
            icon: wptIcons.whale
          }
        ]
      },
      {
        group: 'Alarms',
        icons: [
          {
            type: 'alarm-mob',
            name: 'Person Overboard',
            icon: wptIcons.pob
          }
        ]
      }
    ];

    merge(
      this.inpLat.statusChanges,
      this.inpLat.valueChanges,
      this.inpLon.statusChanges,
      this.inpLon.valueChanges,
      this.inpName.statusChanges,
      this.inpName.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessage());
  }

  updateErrorMessage() {
    if (this.inpLat.hasError('required') || this.inpLon.hasError('required')) {
      this.errorMessage.set('You must enter a value.');
    } else if (this.inpName.hasError('required')) {
      this.errorMessage.set('Please enter a waypoint name.');
    } else if (this.inpLat.hasError('min') || this.inpLat.hasError('max')) {
      this.errorMessage.set(`Value must be > -90 and < 90`);
    } else if (this.inpLon.hasError('min') || this.inpLon.hasError('max')) {
      this.errorMessage.set(`Value must be > -180 and < 180`);
    } else {
      this.errorMessage.set('');
    }
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.waypoint.name = this.inpName.value;
      this.data.waypoint.description = this.description;
      this.data.waypoint.type = this.wptType;
      this.data.waypoint.feature.geometry.coordinates = [
        this.inpLon.value,
        this.inpLat.value
      ];
    }
    this.dialogRef.close({ save: save, waypoint: this.data.waypoint });
  }
}
