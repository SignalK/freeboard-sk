import { Component, inject, signal } from '@angular/core';
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
import { CoordsPipe } from 'src/app/lib/pipes';
import { SKWaypoint } from '../../resource-classes';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppIconDef, getResourceIcon, getSvgList } from 'src/app/modules/icons';
import { MatTooltip } from '@angular/material/tooltip';

const waypointTypeDef = {
  default: {
    icon: getResourceIcon('waypoints', undefined),
    group: 'Points of Interest',
    displayName: 'Waypoint'
  },
  pseudoaton: {
    icon: getResourceIcon('waypoints', 'pseudoaton'),
    group: 'Points of Interest',
    displayName: 'Pseudo AtoN'
  },
  whale: {
    icon: getResourceIcon('waypoints', 'whale'),
    group: 'Points of Interest',
    displayName: 'Whale Sighting'
  },
  pob: {
    icon: getResourceIcon('waypoints', 'pob'),
    group: 'Alarms',
    displayName: 'Person Overboard'
  },
  'start-boat': {
    icon: getResourceIcon('waypoints', 'start-boat'),
    group: 'Racing',
    displayName: 'Start Boat'
  },
  'start-pin': {
    icon: getResourceIcon('waypoints', 'start-pin'),
    group: 'Racing',
    displayName: 'Start Pin'
  }
};

interface DialogData {
  title: string; // title text,
  addMode: boolean; // Add vs update waypoint,
  waypoint: SKWaypoint; // Waypoint resource
}

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
    CoordsPipe,
    ReactiveFormsModule,
    MatTooltip
  ],
  template: `
    <div class="_ap-waypoint">
      <mat-toolbar style="background-color: transparent">
        <div>
          <mat-icon class="icon-waypoint">{{ dialogIcon }}</mat-icon>
        </div>
        <span style="flex: 1 1 auto; text-align: center;">{{
          data.title
        }}</span>
        <div style="width: 50px;text-align:right;">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-toolbar>
      <mat-dialog-content>
        <div style="display: flex">
          <div style="flex: 1 1 auto">
            <div>
              <mat-form-field floatLabel="always" style="width:100%;">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  type="text"
                  required
                  [readonly]="wptReadOnly"
                  [formControl]="inpName"
                  (blur)="updateErrorMessage()"
                />
                @if (inpName.invalid && (inpName.dirty || inpName.touched)) {
                  <mat-error>{{ errorMessage() }}</mat-error>
                }
              </mat-form-field>
            </div>
            <div>
              <mat-form-field floatLabel="always" style="width:100%;">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  rows="3"
                  #inpcmt="ngModel"
                  [readonly]="wptReadOnly"
                  [(ngModel)]="wptDescription"
                >
                </textarea>
              </mat-form-field>
            </div>
            <!-- select icon type / category-->
            <div style="display:flex;flex-wrap:wrap;">
              <mat-form-field style="width:_stretch;" floatLabel="always">
                <mat-label>Type</mat-label>
                <mat-select
                  [disabled]="wptReadOnly"
                  [(value)]="wptType"
                  (selectionChange)="handleWptTypeChange($event)"
                >
                  <mat-select-trigger>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      @if (wptIcon().svgIcon) {
                        <mat-icon
                          [svgIcon]="wptIcon().svgIcon"
                          [class]="wptIcon().class"
                        ></mat-icon>
                      } @else {
                        <mat-icon [class]="wptIcon().class">{{
                          wptIcon().name
                        }}</mat-icon>
                      }
                      {{ wptIconDisplayName }}
                    </div>
                  </mat-select-trigger>

                  @for (wt of waypointTypeSelections; track wt[0]) {
                    <mat-optgroup [label]="wt[0]">
                      @for (i of wt[1]; track i.name) {
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

              @if (iconsForSelection().length !== 0) {
                <div>
                  <div
                    style="display:flex;flex-wrap:wrap;padding-bottom:10px;height:40px;"
                  >
                    @for (i of iconsForSelection(); track i) {
                      <div
                        style="background-color:silver;padding:2px;"
                        [ngClass]="{
                          'selected-icon': i.svgIcon === this.wptIcon().svgIcon,
                          'unselected-icon':
                            i.svgIcon !== this.wptIcon().svgIcon
                        }"
                        (click)="handleIconSelected(i.svgIcon)"
                      >
                        <mat-icon
                          [svgIcon]="i.svgIcon"
                          [matTooltip]="i.svgIcon"
                        ></mat-icon>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <div style="font-size: 10pt;display:flex;flex-wrap:wrap">
              <div style="display:flex;">
                @if (wptReadOnly) {
                  <div style="width:45px;font-weight:bold;">Lat:</div>
                  <div
                    style="flex: 1 1 auto;"
                    [innerText]="
                      wptLat | coords: app.config.units.positionFormat : true
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
                      @if (inpLat.invalid && (inpLat.dirty || inpLat.touched)) {
                        <mat-error>{{ errorMessage() }}</mat-error>
                      }
                    </mat-form-field>
                  </div>
                }
              </div>
              <div style="display:flex;padding-left: 5px;">
                @if (wptReadOnly) {
                  <div style="width:45px;font-weight:bold;">Lon:</div>
                  <div
                    style="flex: 1 1 auto;"
                    [innerText]="
                      wptLon | coords: app.config.units.positionFormat
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
                      @if (inpLon.invalid && (inpLon.dirty || inpLon.touched)) {
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
      @if (!wptReadOnly) {
        <mat-dialog-actions align="end">
          <button
            mat-flat-button
            [disabled]="
              inpLat.invalid || inpLon.invalid || inpName.invalid || wptReadOnly
            "
            (click)="handleClose(true)"
          >
            SAVE
          </button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [
    `
      ._ap-waypoint {
        min-width: 300px;
      }

      ._ap-waypoint .selected-icon {
        border: red 2px solid;
      }

      ._ap-waypoint .unselected-icon {
        border: black 1px solid;
      }
    `
  ]
})
export class WaypointDialog {
  protected dialogIcon: string; // dialog add / edit icon
  protected wptIcon = signal<AppIconDef>(undefined);
  protected waypointTypeSelections: Map<string, any[]>;
  protected wptIconDisplayName!: string;

  protected wptType: string;
  protected wptDescription: string;
  protected wptReadOnly = false;
  protected wptLat: number;
  protected wptLon: number;

  protected skIcon: string;
  protected inpLat: FormControl;
  protected inpLon: FormControl;
  protected inpName: FormControl;

  protected errorMessage = signal('');
  protected iconsForSelection = signal<AppIconDef[]>([]);
  protected selectableIcons = ['pseudoaton'];

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WaypointDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {
    this.dialogIcon = this.data.addMode ? 'add_location' : 'edit_location';

    this.wptIcon.update(() => this.getIconDef(this.data.waypoint));
    this.wptIconDisplayName = this.getFriendlyIconName(this.data.waypoint);

    this.wptType = this.data.waypoint.type ?? '';
    this.wptDescription = this.data.waypoint.description ?? '';
    this.wptReadOnly = this.data.waypoint.feature.properties?.readOnly ?? false;
    const coords = this.data.waypoint.feature.geometry.coordinates ?? [0, 0];
    this.wptLat = coords[1];
    this.wptLon = coords[0];

    this.inpLat = new FormControl(this.wptLat, [Validators.required]);
    this.inpLon = new FormControl(this.wptLon, [Validators.required]);
    this.inpName = new FormControl(this.data.waypoint.name ?? '', [
      Validators.required
    ]);

    this.waypointTypeSelections = this.buildWptSelections();

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

  protected updateErrorMessage() {
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

  protected handleClose(save: boolean) {
    if (save) {
      this.data.waypoint.name = this.inpName.value;
      this.data.waypoint.description = this.wptDescription;
      this.data.waypoint.type = this.wptType;
      this.data.waypoint.feature.geometry.coordinates = [
        this.inpLon.value,
        this.inpLat.value
      ];
      if (this.skIcon) {
        this.data.waypoint.feature.properties.skIcon = this.skIcon;
      } else {
        delete this.data.waypoint.feature.properties.skIcon;
      }
    }
    this.dialogRef.close({ save: save, waypoint: this.data.waypoint });
  }

  private buildWptSelections() {
    const wt = Object.entries(waypointTypeDef);
    const groups = new Map();
    wt.forEach((i: any) => {
      if (!groups.has(i[1].group)) {
        groups.set(i[1].group, []);
      }
      groups.get(i[1].group).push({
        type: i[0] === 'default' ? '' : i[0],
        name: i[1].displayName,
        icon: i[1].icon
      });
    });
    return groups;
    /*return [
      {
        group: 'Points of Interest',
        icons: [
          {
            type: '',
            name: 'Waypoint',
            icon: waypointTypeDef.default.icon
          },
          {
            type: 'pseudoaton',
            name: 'Pseudo AtoN',
            icon: waypointTypeDef.pseudoaton.icon
          },
          {
            type: 'whale',
            name: 'Whale Sighting',
            icon: waypointTypeDef.whale.icon
          }
        ]
      },
      {
        group: 'Racing',
        icons: [
          {
            type: 'start-boat',
            name: 'Start Boat',
            icon: waypointTypeDef['start-boat'].icon
          },
          {
            type: 'start-pin',
            name: 'Start Pin',
            icon: waypointTypeDef['start-pin'].icon
          }
        ]
      },
      {
        group: 'Alarms',
        icons: [
          {
            type: 'pob',
            name: 'Person Overboard',
            icon: waypointTypeDef.pob.icon
          }
        ]
      }
    ]*/
  }

  private getFriendlyIconName(w: SKWaypoint): string {
    if (!w.feature.properties.skIcon) {
      return !w.type ? 'Waypoint' : w.type.replaceAll('-', ' ');
    } else {
      return w.feature.properties.skIcon.replaceAll('-', ' ');
    }
  }

  /** return the waypoint icon definition */
  private getIconDef(wpt?: SKWaypoint): AppIconDef {
    return getResourceIcon('waypoints', wpt ?? this.data.waypoint);
  }

  protected handleWptTypeChange(e) {
    const w = Object.assign({}, this.data.waypoint);
    w.type = this.wptType;
    delete w.feature.properties.skIcon;
    this.wptIconDisplayName = this.getFriendlyIconName(w);
    this.wptIcon.update(() => this.getIconDef(w));
    this.iconsForSelection.set([]);
    this.skIcon = undefined;
    this.handleChangeIcon();
  }

  private handleChangeIcon() {
    if (this.wptType === 'pseudoaton') {
      const { svgIcon } = getResourceIcon('waypoints', 'pseudoaton');
      const d = getSvgList()
        .filter((i) => i.id.includes('virtual-'))
        .map((i) => {
          return { svgIcon: i.id };
        });
      d.unshift({ svgIcon: svgIcon });
      this.iconsForSelection.update(() => d);
    } else {
      this.iconsForSelection.set([]);
    }
  }

  protected handleIconSelected(skIcon: string) {
    this.skIcon = skIcon;
    const w = Object.assign({}, this.data.waypoint);
    w.feature.properties.skIcon = skIcon;
    this.wptIconDisplayName = this.getFriendlyIconName(w);
    this.wptIcon.update(() => this.getIconDef(w));
  }
}
