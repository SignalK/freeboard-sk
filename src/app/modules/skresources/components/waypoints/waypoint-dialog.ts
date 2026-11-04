import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AbstractControl,
  FormsModule,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
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
import {
  COORD_ENTRY_FORMATS,
  CoordAxis,
  CoordEntryFormat,
  entryFormatFor,
  formatMagnitude,
  fromUtm,
  hemisphereOf,
  HEMISPHERES,
  namesDirection,
  parseAngle,
  toUtm,
  withoutDirection
} from 'src/app/lib/coord-entry';

const ENTRY_EXAMPLES: Record<
  Exclude<CoordEntryFormat, 'UTM'>,
  { lat: string; lon: string }
> = {
  DD: { lat: '47.6375°', lon: '3.5°' },
  DDM: { lat: `47° 38.250'`, lon: `3° 30.000'` },
  DMS: { lat: `47° 38' 15"`, lon: `3° 30' 00"` }
};

const angleValidator =
  (axis: CoordAxis): ValidatorFn =>
  (c: AbstractControl): ValidationErrors | null =>
    parseAngle(c.value, axis) === null ? { coord: true } : null;

interface UtmForm {
  zone: FormControl<number | null>;
  hemisphere: FormControl<'N' | 'S'>;
  easting: FormControl<number | null>;
  northing: FormControl<number | null>;
}

const utmOf = (g: FormGroup<UtmForm>) => {
  const v = g.getRawValue();
  return fromUtm({
    zone: v.zone ?? NaN,
    hemisphere: v.hemisphere,
    easting: v.easting ?? NaN,
    northing: v.northing ?? NaN
  });
};

const utmValidator: ValidatorFn = (c: AbstractControl) =>
  utmOf(c as FormGroup<UtmForm>) === null ? { utm: true } : null;

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

            @if (wptReadOnly) {
              <div style="font-size: 10pt;display:flex;flex-wrap:wrap">
                <div style="display:flex;">
                  <div style="width:45px;font-weight:bold;">Lat:</div>
                  <div
                    style="flex: 1 1 auto;"
                    [innerText]="
                      wptLat | coords: app.config.units.positionFormat : true
                    "
                  ></div>
                </div>
                <div style="display:flex;padding-left: 5px;">
                  <div style="width:45px;font-weight:bold;">Lon:</div>
                  <div
                    style="flex: 1 1 auto;"
                    [innerText]="
                      wptLon | coords: app.config.units.positionFormat
                    "
                  ></div>
                </div>
              </div>
            } @else {
              <div class="_ap-wpt-position">
                <mat-chip-listbox
                  aria-label="Position format"
                  (change)="setEntryFormat($event.value)"
                >
                  @for (f of entryFormats; track f.id) {
                    <!-- The active chip is not selectable, so clicking it
                    again cannot leave the dialog with no format. -->
                    <mat-chip-option
                      [value]="f.id"
                      [selected]="entryFormat() === f.id"
                      [selectable]="entryFormat() !== f.id"
                      [matTooltip]="f.description"
                      >{{ f.label }}</mat-chip-option
                    >
                  }
                </mat-chip-listbox>

                @if (entryFormat() === 'UTM') {
                  <div class="_ap-wpt-coords" [formGroup]="inpUtm">
                    <mat-form-field floatLabel="always" style="width:80px;">
                      <mat-label>Zone</mat-label>
                      <input
                        matInput
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        required
                        formControlName="zone"
                      />
                    </mat-form-field>
                    <mat-form-field floatLabel="always" style="width:80px;">
                      <mat-label>Hemisphere</mat-label>
                      <mat-select formControlName="hemisphere">
                        <mat-option value="N">N</mat-option>
                        <mat-option value="S">S</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field floatLabel="always">
                      <mat-label>Easting (m)</mat-label>
                      <input
                        matInput
                        type="number"
                        required
                        formControlName="easting"
                      />
                    </mat-form-field>
                    <mat-form-field floatLabel="always">
                      <mat-label>Northing (m)</mat-label>
                      <input
                        matInput
                        type="number"
                        required
                        formControlName="northing"
                      />
                    </mat-form-field>
                  </div>
                  @if (utmUnavailable()) {
                    <div class="_ap-wpt-error" role="alert">
                      UTM covers 80°S to 84°N only. Use another format for this
                      position.
                    </div>
                  }
                  @if (inpUtm.invalid && (inpUtm.dirty || inpUtm.touched)) {
                    <div class="_ap-wpt-error" role="alert">
                      Not a valid UTM position (zone 1-60, between 80°S and
                      84°N).
                    </div>
                  }
                } @else {
                  <div class="_ap-wpt-coords">
                    <div class="_ap-wpt-axis">
                      <mat-form-field floatLabel="always">
                        <mat-label>Latitude</mat-label>
                        <input
                          matInput
                          type="text"
                          inputmode="text"
                          autocomplete="off"
                          required
                          [placeholder]="example().lat"
                          [formControl]="inpLat"
                        />
                        <mat-hint>e.g. {{ example().lat }}</mat-hint>
                        @if (inpLat.invalid) {
                          <mat-error>Not a valid latitude.</mat-error>
                        }
                      </mat-form-field>
                      <mat-form-field floatLabel="always" class="_ap-wpt-hem">
                        <mat-label>Hemisphere</mat-label>
                        <mat-select
                          aria-label="Latitude hemisphere"
                          [formControl]="inpLatHem"
                        >
                          <mat-option value="N">N</mat-option>
                          <mat-option value="S">S</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                    <div class="_ap-wpt-axis">
                      <mat-form-field floatLabel="always">
                        <mat-label>Longitude</mat-label>
                        <input
                          matInput
                          type="text"
                          inputmode="text"
                          autocomplete="off"
                          required
                          [placeholder]="example().lon"
                          [formControl]="inpLon"
                        />
                        <mat-hint>e.g. {{ example().lon }}</mat-hint>
                        @if (inpLon.invalid) {
                          <mat-error>Not a valid longitude.</mat-error>
                        }
                      </mat-form-field>
                      <mat-form-field floatLabel="always" class="_ap-wpt-hem">
                        <mat-label>Hemisphere</mat-label>
                        <mat-select
                          aria-label="Longitude hemisphere"
                          [formControl]="inpLonHem"
                        >
                          <mat-option value="E">E</mat-option>
                          <mat-option value="W">W</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                }
              </div>
            }

            <div style="font-size: 10pt;display:flex;flex-wrap:wrap">
              <div>
                <div>
                  <div
                    style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;"
                  >
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
                        <!-- Touch gestures off: on a touch platform MatTooltip
                        sets inline touch-action:none on its trigger to reserve
                        the long press, and every tile of this scrolling grid is
                        a trigger — so a finger has nowhere to land that scrolls
                        it (#651). -->
                        <mat-icon
                          [svgIcon]="i.svgIcon ?? ''"
                          [matTooltip]="i.svgIcon"
                          matTooltipTouchGestures="off"
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
            [disabled]="positionInvalid() || inpName.invalid || wptReadOnly"
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

      ._ap-wpt-position {
        padding-bottom: 10px;
      }

      ._ap-wpt-coords {
        display: flex;
        flex-wrap: wrap;
        gap: 0 8px;
        padding-top: 10px;
      }

      ._ap-wpt-axis {
        display: flex;
        gap: 0 8px;
        /* Room under the "e.g." hint, which otherwise touches what follows. */
        padding-bottom: 12px;
      }

      ._ap-wpt-hem {
        width: 100px;
      }

      ._ap-wpt-error {
        color: var(--mat-sys-error);
        font-size: 9pt;
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
  // Last valid position entered, in any format. The text controls show it
  // rounded to their notation; this keeps full precision, so switching format
  // without editing never moves the waypoint.
  protected wptLat: number;
  protected wptLon: number;
  protected wptIcon = signal<AppIconDef>({}); // selected icon, set in ngOnInit

  protected readonly entryFormats = COORD_ENTRY_FORMATS;
  protected entryFormat = signal<CoordEntryFormat>('DD');
  protected example = computed(() => {
    const f = this.entryFormat();
    return ENTRY_EXAMPLES[f === 'UTM' ? 'DD' : f];
  });
  /** The current position lies outside the UTM latitude band. */
  protected utmUnavailable = signal(false);

  protected inpLat = new FormControl('', {
    nonNullable: true,
    validators: [angleValidator('lat')]
  });
  protected inpLon = new FormControl('', {
    nonNullable: true,
    validators: [angleValidator('lon')]
  });
  // The hemisphere of each axis, picked from a list as for UTM. The text
  // fields then hold the unsigned value; a sign or letter typed (or pasted)
  // into them still counts, and moves the list to match.
  protected inpLatHem = new FormControl('N', { nonNullable: true });
  protected inpLonHem = new FormControl('E', { nonNullable: true });
  protected inpUtm = new FormGroup<UtmForm>(
    {
      zone: new FormControl<number | null>(null),
      hemisphere: new FormControl<'N' | 'S'>('N', { nonNullable: true }),
      easting: new FormControl<number | null>(null),
      northing: new FormControl<number | null>(null)
    },
    { validators: utmValidator }
  );
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

    this.iconsForSelection.set(
      this.wptOptions[this.wptType]?.icons ?? this.wptOptions['waypoint'].icons
    );
    this.wptDescription = this.data.waypoint.description ?? '';
    this.wptReadOnly = this.data.waypoint.feature.properties?.readOnly ?? false;
    const coords = this.data.waypoint.feature.geometry.coordinates ?? [0, 0];
    this.wptLat = coords[1];
    this.wptLon = coords[0];

    this.inpName = new FormControl(this.data.waypoint.name ?? '', [
      Validators.required
    ]);

    this.setEntryFormat(entryFormatFor(this.app.config.units.positionFormat));

    this.inpLat.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.wptLat = this.readAxis('lat') ?? this.wptLat;
    });
    this.inpLon.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.wptLon = this.readAxis('lon') ?? this.wptLon;
    });
    this.inpLatHem.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dropTypedDirection(this.inpLat);
      this.wptLat = this.readAxis('lat') ?? this.wptLat;
    });
    this.inpLonHem.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dropTypedDirection(this.inpLon);
      this.wptLon = this.readAxis('lon') ?? this.wptLon;
    });
    this.inpUtm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const pos = utmOf(this.inpUtm);
      if (pos) {
        [this.wptLon, this.wptLat] = pos;
        this.utmUnavailable.set(false);
      }
    });

    merge(this.inpName.statusChanges, this.inpName.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessage());
  }

  /**
   * Show the position in another notation. The controls are written without
   * emitting, so the rounded text does not overwrite the precise position.
   */
  protected setEntryFormat(format: CoordEntryFormat) {
    this.entryFormat.set(format);
    if (format === 'UTM') {
      const utm = toUtm(this.wptLon, this.wptLat);
      this.utmUnavailable.set(utm === null);
      this.inpUtm.setValue(
        {
          zone: utm?.zone ?? null,
          hemisphere: utm?.hemisphere ?? (this.wptLat < 0 ? 'S' : 'N'),
          easting: utm ? Math.round(utm.easting) : null,
          northing: utm ? Math.round(utm.northing) : null
        },
        { emitEvent: false }
      );
    } else {
      const quiet = { emitEvent: false };
      this.inpLat.setValue(formatMagnitude(this.wptLat, format), quiet);
      this.inpLatHem.setValue(hemisphereOf(this.wptLat, 'lat'), quiet);
      this.inpLon.setValue(formatMagnitude(this.wptLon, format), quiet);
      this.inpLonHem.setValue(hemisphereOf(this.wptLon, 'lon'), quiet);
    }
  }

  /**
   * The signed value of an axis from its text and hemisphere list. A sign or
   * letter in the text wins, and the list is moved to match it.
   */
  private readAxis(axis: CoordAxis): number | null {
    const text = axis === 'lat' ? this.inpLat.value : this.inpLon.value;
    const hem = axis === 'lat' ? this.inpLatHem : this.inpLonHem;
    const value = parseAngle(text, axis);
    if (value === null) {
      return null;
    }
    if (namesDirection(text)) {
      hem.setValue(hemisphereOf(value, axis), { emitEvent: false });
      return value;
    }
    return hem.value === HEMISPHERES[axis].neg
      ? -Math.abs(value)
      : Math.abs(value);
  }

  /** Once the list is used, it alone says the hemisphere: take any sign or
   *  letter out of the text, which would otherwise override it. */
  private dropTypedDirection(control: FormControl<string>) {
    if (namesDirection(control.value)) {
      control.setValue(withoutDirection(control.value), { emitEvent: false });
    }
  }

  protected positionInvalid(): boolean {
    return this.entryFormat() === 'UTM'
      ? this.inpUtm.invalid
      : this.inpLat.invalid || this.inpLon.invalid;
  }

  protected updateErrorMessage() {
    this.errorMessage.set(
      this.inpName.hasError('required') ? 'Please enter a waypoint name.' : ''
    );
  }

  protected handleClose(save: boolean) {
    if (save) {
      this.data.waypoint.name = this.inpName.value;
      this.data.waypoint.description = this.wptDescription;
      this.data.waypoint.type = this.wptType;
      this.data.waypoint.feature.geometry.coordinates = [
        this.wptLon,
        this.wptLat
      ];
      // Only the 'waypoint' category participates in symbol overrides, so only
      // it gets the bare-vs-default: persistence treatment. Other categories
      // (start-pin, …) save their icon id verbatim.
      (this.data.waypoint.feature.properties ??= {}).skIcon =
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
    const currentGroup = this.wptOptions[this.wptType]
      ? this.wptType
      : 'waypoint';
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
