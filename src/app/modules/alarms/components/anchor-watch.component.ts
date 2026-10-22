import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  effect,
  DestroyRef
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule
} from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import {
  MatSlideToggle,
  MatSlideToggleChange,
  MatSlideToggleModule
} from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';

import { NSEWButtonsComponent } from './nsew-buttons.component';

import { computeDestinationPoint } from 'geolib';

import { AnchorService } from '../anchor.service';
import { AppFacade } from 'src/app/app.facade';
import { HttpErrorResponse } from '@angular/common/http';
import { Convert, SI_BASE_UNIT, TARGET_UNIT } from 'src/app/lib/convert';
import { Position } from 'src/app/types';

/** Radius step buttons, in the user's length unit. */
const RADIUS_STEPS = [-10, -1, 1, 10];

@Component({
  selector: 'anchor-watch',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    FormsModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatStepperModule,
    NSEWButtonsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anchor-watch.component.html',
  styleUrls: ['./anchor-watch.component.css']
})
export class AnchorWatchComponent {
  @Input() radius?: number;
  @Input() min = 5;
  @Input() raised = true;
  @Input() showSelf = false;
  @Output() closed: EventEmitter<void> = new EventEmitter();

  // a static query is resolved before ngOnInit
  @ViewChild('slideCtl', { static: true })
  slideCtl!: ElementRef<MatSlideToggle>;

  protected bgImage?: string;
  protected rodeOut = false;
  protected convert = Convert;

  // set controls
  protected useDefaultRadius = false;
  protected useSetManual = false;
  protected defaultRodeLength = signal<number>(10);
  protected defaultAlarmRadius = signal<number>(10);

  protected disableRaiseDrop = false;

  private anchor = inject(AnchorService);
  protected app = inject(AppFacade);
  private destroyRef = inject(DestroyRef);

  protected readonly radiusSteps = RADIUS_STEPS;
  /** The radius the step buttons start from, in metres. */
  private adjustRadius: number | null = null;
  /**
   * Radii the step buttons started from or sent, which the server can still
   * report after a later tap, as its deltas lag behind the requests.
   */
  private steppedRadii: number[] = [];
  private radiusSending = false;

  protected radiusValue = signal<number | null>(0); // incoming alarm radius
  protected formattedRadiusValue = computed(() => {
    const radius = this.radiusValue();
    if (radius === null || this.raised) {
      return '--';
    } else {
      return `${Math.round(radius)}${Convert.getSymbol(this.app.config.units.length)}`;
    }
  });
  protected displayRadius = signal<string>('--');
  protected manualSetSupported = computed(() =>
    this.anchor.supportsManualSet()
  );

  /** Where the shift buttons have moved the anchor to, ahead of the server. */
  private shiftTarget: Position | null = null;
  /**
   * Positions the shift started from or sent, which the server can still
   * report after a later step, as its deltas lag behind the requests.
   */
  private shiftedPositions: Position[] = [];
  private shiftSending = false;

  constructor() {
    effect(() => this.takeUpPosition(this.anchor.position()));
  }

  ngOnInit() {
    this.useDefaultRadius = this.app.config.anchor.setRadius;
    this.useSetManual =
      this.app.config.anchor.manualSet && this.anchor.supportsManualSet();
    this.defaultRodeLength.update(() => {
      return this.roundedValue(this.app.config.anchor.rodeLength);
    });
    this.defaultAlarmRadius.update(() => {
      return this.roundedValue(this.app.config.anchor.radius);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.radius) {
      this.takeUpRadius(changes.radius.currentValue);
      this.radiusValue.update(() =>
        this.transformValue(changes.radius.currentValue)
      );
      this.showAdjustRadius(changes.radius.currentValue);
    }

    this.bgImage = `url('${
      this.raised
        ? './assets/img/anchor-radius-raised.png'
        : './assets/img/anchor-radius.png'
    }')`;
    this.rodeOut = !this.raised && this.radius !== -1;
    this.disableRaiseDrop =
      !this.showSelf || (this.raised && this.useSetManual);
  }

  /**
   * Convert the formatted value based on config.units.length
   * @param value to convert
   * @returns Transformed value
   */
  transformValue(value: number): number | null {
    return Convert.transform(
      value,
      'm',
      this.app.config.units.length as TARGET_UNIT
    );
  }

  /** The converted value rounded, or 0 when it does not convert. */
  private roundedValue(value: number): number {
    return Math.round(this.transformValue(value) ?? 0);
  }

  /**
   * Convert and format the value for display
   * @param value Value to display
   * @returns Formatted string of transformed for display
   */
  formatTransformedValue(value: number): string {
    return `${this.roundedValue(value)} ${Convert.getSymbol(this.app.config.units.length)}`;
  }

  /**
   * Follow a radius the server reports unless it is one the step buttons
   * already passed, which would undo the taps made since.
   */
  private takeUpRadius(radius: number) {
    const stepped = this.steppedRadii.lastIndexOf(radius);
    if (stepped === -1) {
      this.adjustRadius = radius > 0 ? radius : null;
      this.steppedRadii = [];
    } else if (
      stepped === this.steppedRadii.length - 1 &&
      !this.radiusSending &&
      radius === this.adjustRadius
    ) {
      this.steppedRadii = [];
    }
  }

  /** Show the radius the step buttons go on from. */
  private showAdjustRadius(reported: number) {
    this.displayRadius.update(() =>
      this.formatTransformedValue(
        this.adjustRadius ??
          (reported > 0 ? reported : this.app.config.anchor.radius)
      )
    );
  }

  /** Sign the step for its button label. */
  protected stepLabel(step: number): string {
    return step > 0 ? `+${step}` : `${step}`;
  }

  /**
   * Change the alarm radius by a step in the user's length unit, from the
   * radius last set here or reported by the server, else the saved one. Steps
   * that come quicker than the server answers add up, and only the latest
   * radius is sent, one request at a time.
   * @param step Change in the user's length unit
   */
  stepRadius(step: number) {
    const base = this.adjustRadius ?? this.app.config.anchor.radius;
    const delta =
      Convert.transform(
        step,
        this.app.config.units.length as SI_BASE_UNIT,
        'm' as TARGET_UNIT
      ) ?? step;
    const radius = Math.max(this.min, base + delta);
    // a step down from below the minimum must not raise the radius
    if (step < 0 ? radius >= base : radius <= base) {
      return;
    }
    if (this.steppedRadii.length === 0) {
      this.steppedRadii.push(base);
    }
    this.adjustRadius = radius;
    this.showAdjustRadius(radius);
    this.sendRadius();
  }

  private sendRadius() {
    const radius = this.adjustRadius;
    if (this.radiusSending || radius === null || this.raised) {
      return;
    }
    this.radiusSending = true;
    this.steppedRadii.push(radius);
    this.anchor
      .setRadius(radius)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.radiusSending = false;
          this.app.config.anchor.radius = radius;
          this.app.saveConfig();
          if (this.adjustRadius !== radius) {
            this.sendRadius();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.radiusSending = false;
          // go on from the radius the server has, not the one it refused
          const reported = this.radius ?? -1;
          this.steppedRadii = [];
          this.takeUpRadius(reported);
          this.showAdjustRadius(reported);
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  onDefaultRadiusChecked(e: MatCheckboxChange) {
    this.useDefaultRadius = e.checked;
    this.app.config.anchor.setRadius = e.checked;
    if (!e.checked) {
      this.defaultAlarmRadius.update(() => {
        return this.roundedValue(this.app.config.anchor.radius);
      });
    }
    this.app.saveConfig();
  }

  /**
   * The field shows an error for an empty value or one below 1; the saved
   * radius stays until a valid one is entered, as it is the one a drop uses.
   * A value the field accepts is always saved, at least 1 m, so a 1 ft entry
   * is not lost to rounding.
   */
  onDefaultRadiusChange(e: number | null) {
    if (e === null || !Number.isFinite(e) || e < 1) {
      return;
    }
    this.app.config.anchor.radius = Math.max(
      1,
      Math.round(
        Convert.transform(
          e,
          this.app.config.units.length as SI_BASE_UNIT,
          'm' as TARGET_UNIT
        ) ?? 0
      )
    );
  }

  onSetManualCheck(e: MatCheckboxChange) {
    this.useSetManual = e.checked;
    this.app.config.anchor.manualSet = e.checked;
    if (!e.checked) {
      this.defaultRodeLength.update(() => {
        return this.roundedValue(this.app.config.anchor.rodeLength);
      });
    }
    this.disableRaiseDrop = this.raised && this.useSetManual;
    this.app.saveConfig();
  }

  stepSetRode() {
    this.setRadius();
  }

  /**
   * @description Set the anchor alarm max radius.
   * @param value Alarm radius in meters
   */
  setRadius(value?: number) {
    this.rodeOut = true;
    if (typeof value === 'number') {
      this.displayRadius.update(() => this.formatTransformedValue(value));
    }
    if (!this.raised) {
      this.anchor
        .setRadius(value)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (typeof value === 'number') {
              this.app.config.anchor.radius = value;
            }
            this.app.saveConfig();
          },
          error: (err: HttpErrorResponse) => {
            this.app.parseHttpErrorResponse(err);
          }
        });
    }
  }

  /**
   * @description Set anchor position using the rode length
   */
  setManualAnchor() {
    const rodeLength =
      typeof this.defaultRodeLength() === 'number'
        ? Convert.transform(
            this.defaultRodeLength(),
            this.app.config.units.length as SI_BASE_UNIT,
            'm' as TARGET_UNIT
          )
        : null;
    if (rodeLength === null) {
      this.app.showAlert('Error', 'Rode length value is not a number!');
      return;
    }
    this.app.config.anchor.rodeLength = Math.round(rodeLength);
    this.anchor
      .setManualAnchor(this.app.config.anchor.rodeLength)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.app.saveConfig();
        },
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  /**
   * @description Handle raise / drop slide toggle change
   * @param e Slide change event
   */
  dropRaiseAnchor(e: MatSlideToggleChange) {
    if (e.checked) {
      this.dropAnchor(
        this.useDefaultRadius ? this.app.config.anchor.radius : undefined
      );
    } else {
      this.raiseAnchor();
    }
  }

  /**
   * @description Drop the Anchor
   * @param radius Alarm radius to set
   */
  dropAnchor(radius?: number) {
    this.anchor.setRaisedSignal(false);
    this.anchor
      .drop(radius)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.app.saveConfig();
        },
        error: (err: HttpErrorResponse) => {
          this.anchor.setRaisedSignal(true);
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  /**
   * @description Raise the Anchor
   */
  raiseAnchor() {
    this.anchor
      .raise()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  /**
   * Follow an anchor position the server reports unless it is one the shift
   * already passed, which would undo the steps made since. Any other
   * position, such as one the anchor was dragged to, is shifted from next.
   */
  private takeUpPosition(position: Position | null) {
    const shifted = this.shiftedPositions.findIndex(
      (p) => position && p[0] === position[0] && p[1] === position[1]
    );
    if (shifted === -1) {
      this.shiftTarget = null;
      this.shiftedPositions = [];
    } else if (shifted === this.shiftedPositions.length - 1) {
      this.shiftedPositions = [this.shiftedPositions[shifted]];
    }
  }

  /**
   * @description Shift anchor position n,s,e,w. Steps that come quicker than
   * the server answers add up here, and only the latest position is sent.
   * @param direction (degrees) 0 | 90 | 180 | 270
   */
  shiftAnchor(direction: number) {
    const inc = 1;
    const anchor = this.shiftTarget ?? this.anchor.position();
    if (!anchor) {
      return;
    }
    if (this.shiftedPositions.length === 0) {
      this.shiftedPositions.push(anchor);
    }
    const position = computeDestinationPoint(anchor, inc, direction);
    this.shiftTarget = [position.longitude, position.latitude];
    this.sendShift();
  }

  private sendShift() {
    const target = this.shiftTarget;
    if (this.shiftSending || !target) {
      return;
    }
    const request = this.anchor.setAnchorPosition(target);
    if (!request) {
      return;
    }
    this.shiftSending = true;
    this.shiftedPositions.push(target);
    request
      .catch((err: HttpErrorResponse) => {
        this.shiftTarget = null;
        this.shiftedPositions = [];
        this.app.parseHttpErrorResponse(err);
      })
      .finally(() => {
        this.shiftSending = false;
        if (this.shiftTarget && this.shiftTarget !== target) {
          this.sendShift();
        }
      });
  }

  close() {
    this.closed.emit();
  }
}
