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
import { MatTooltip } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
import {
  AppIconDef,
  getResourceIcon,
  persistSkIcon,
  selListWaypointIcons
} from 'src/app/modules/icons';

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
    MatTooltip,
    MatChipsModule,
    MatSlideToggleModule
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

            <div style="font-size: 10pt;display:flex;flex-wrap:wrap">
              <div>
                <div>
                  <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                    <mat-chip-listbox
                      selectable
                      (change)="handleWptTypeChange($event.value)"
                    >
                      @for (i of iconTypeSelection; track i) {
                        <mat-chip-option
                          [value]="i.id"
                          [selected]="wptType === i.id"
                        >
                          {{ i.group }}
                        </mat-chip-option>
                      }
                    </mat-chip-listbox>
                    @if (wptType === 'waypoint') {
                      <mat-slide-toggle
                        labelPosition="before"
                        [hideIcon]="true"
                        [checked]="showAllIcons()"
                        (change)="onShowAllToggle($event.checked)"
                        style="font-size:10pt;margin-left:4px;"
                      >
                        Show all symbols
                      </mat-slide-toggle>
                    }
                  </div>
                  <div
                    style="display:flex;flex-wrap:wrap;padding-bottom:10px;height:64px;overflow-y:auto;"
                  >
                    @for (i of iconsForSelection(); track i) {
                      <div
                        style="background-color:silver;padding:2px;"
                        [ngClass]="{
                          'selected-icon': i.svgIcon === this.wptIcon().svgIcon,
                          'unselected-icon':
                            i.svgIcon !== this.wptIcon().svgIcon
                        }"
                        (click)="handleIconSelected($index)"
                      >
                        <mat-icon
                          [svgIcon]="i.svgIcon"
                          [matTooltip]="i.svgIcon"
                        ></mat-icon>
                      </div>
                    }
                  </div>
                </div>
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

  // waypoint properties
  protected wptType: string;
  protected wptDescription: string;
  protected wptReadOnly = false;
  protected wptLat: number;
  protected wptLon: number;
  protected wptIcon = signal<AppIconDef>(undefined); // selected icon

  protected inpLat: FormControl;
  protected inpLon: FormControl;
  protected inpName: FormControl;

  protected errorMessage = signal('');

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WaypointDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  protected wptOptions!: Record<
    string,
    {
      group: string;
      icons: Array<AppIconDef>;
    }
  >;
  protected iconTypeSelection: Array<{ id: string; group: string }> = [];
  protected iconsForSelection = signal<AppIconDef[]>([]);
  protected showAllIcons = signal(false);

  constructor() {
    this.dialogIcon = this.data.addMode ? 'add_location' : 'edit_location';

    // initialise waypoint icons and selections
    this.rebuildIconOptions(false);
    const typeKeys = Object.keys(this.wptOptions);
    this.wptType = !typeKeys.includes(this.data.waypoint.type)
      ? 'waypoint'
      : this.data.waypoint.type;

    this.wptIcon.update(() => this.getIconDef(this.data.waypoint));

    // If the current icon isn't visible in the merged Waypoints list (e.g. a
    // 'default:' pin or a non-waypoint-role symbol, both shown only under
    // "Show all symbols"), start with the slider on so the selection is shown.
    if (this.wptType === 'waypoint') {
      const sel = this.wptIcon().svgIcon;
      const visible = this.wptOptions['waypoint'].icons.some(
        (i) => i.svgIcon === sel
      );
      if (sel && !visible) {
        this.showAllIcons.set(true);
        this.rebuildIconOptions(true);
      }
    }

    this.iconsForSelection.set(this.wptOptions[this.wptType]?.icons ?? this.wptOptions['waypoint'].icons);
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
      // Only the 'waypoint' category participates in symbol overrides, so only
      // it gets the bare-vs-default: persistence treatment. Other categories
      // (start-pin, …) save their icon id verbatim.
      this.data.waypoint.feature.properties.skIcon =
        this.wptType === 'waypoint'
          ? persistSkIcon(this.wptIcon().svgIcon)
          : this.wptIcon().svgIcon;
    }
    this.dialogRef.close({ save: save, waypoint: this.data.waypoint });
  }

  /** return the waypoint icon definition */
  private getIconDef(wpt?: SKWaypoint): AppIconDef {
    return getResourceIcon('waypoints', wpt ?? this.data.waypoint);
  }

  protected onShowAllToggle(checked: boolean) {
    this.showAllIcons.set(checked);
    this.rebuildIconOptions(checked);
    // Stay on the current category (only the Waypoints chip shows the toggle).
    const currentGroup = this.wptOptions[this.wptType] ? this.wptType : 'waypoint';
    this.iconsForSelection.set(this.wptOptions[currentGroup].icons);
  }

  private rebuildIconOptions(showAll: boolean) {
    this.wptOptions = selListWaypointIcons(showAll);
    this.iconTypeSelection = Object.entries(this.wptOptions).map((i) => ({
      id: i[0],
      group: i[1].group
    }));
  }

  protected handleWptTypeChange(value: string) {
    this.iconsForSelection.set(this.wptOptions[value].icons);
    if (this.data.waypoint.type === value) {
      this.wptIcon.update(() => this.getIconDef(this.data.waypoint));
    } else {
      this.wptIcon.set(this.wptOptions[value].icons[0]);
    }
    this.wptType = value;
  }

  protected handleIconSelected(index: number) {
    this.wptIcon.set(this.wptOptions[this.wptType].icons[index]);
  }
}
