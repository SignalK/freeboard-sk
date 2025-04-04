import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges,
  ViewChild,
  ElementRef
} from '@angular/core';

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
import { MatSliderModule } from '@angular/material/slider';
import { MatStepperModule } from '@angular/material/stepper';

import { NSEWButtonsComponent } from './nsew-buttons.component';

import { computeDestinationPoint } from 'geolib';

import { AnchorFacade } from '../anchor.facade';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { HttpErrorResponse } from '@angular/common/http';

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
    MatSliderModule,
    MatTooltipModule,
    MatStepperModule,
    NSEWButtonsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anchor-watch.component.html',
  styleUrls: ['./anchor-watch.component.css']
})
export class AnchorWatchComponent {
  @Input() radius: number;
  @Input() min = 5;
  @Input() max = 100;
  @Input() feet = false;
  @Input() raised = true;
  @Input() showSelf = false;
  @Output() closed: EventEmitter<void> = new EventEmitter();

  @ViewChild('slideCtl', { static: true }) slideCtl: ElementRef<MatSlideToggle>;

  protected bgImage: string;
  protected displayRadius: number | null;

  protected sliderValue: number;
  protected rodeOut = false;

  // set controls
  protected useDefaultRadius: boolean;
  protected defaultAlarmRadius: number;
  protected useSetManual: boolean;
  protected defaultRodeLength: number;
  protected disableRaiseDrop: boolean;

  constructor(
    private anchor: AnchorFacade,
    private app: AppFacade,
    private signalk: SignalKClient
  ) {}

  ngOnInit() {
    this.displayRadius = this.sliderValue;
    this.defaultAlarmRadius = this.app.config.anchorRadius;
    this.useDefaultRadius = this.app.config.anchorSetRadius;
    this.useSetManual = this.app.config.anchorManualSet;
    this.defaultRodeLength = this.app.config.anchorRodeLength;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.radius) {
      if (changes.radius.previousValue === -1) {
        this.sliderValue = Math.round(changes.radius.currentValue);
        this.displayRadius = this.sliderValue;
        this.max = this.sliderValue + 100;
      } else if (
        changes.radius.firstChange &&
        changes.radius.currentValue !== -1
      ) {
        this.sliderValue = Math.round(changes.radius.currentValue);
        this.max = this.sliderValue + 100;
      }
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

  onDefaultRadiusChecked(e: MatCheckboxChange) {
    this.useDefaultRadius = e.checked;
    this.app.config.anchorSetRadius = e.checked;
    if (!e.checked) {
      this.defaultAlarmRadius = this.app.config.anchorRadius;
    }
    this.app.saveConfig();
  }

  onSetManualCheck(e: MatCheckboxChange) {
    this.useSetManual = e.checked;
    this.app.config.anchorManualSet = e.checked;
    if (!e.checked) {
      this.defaultRodeLength = this.app.config.anchorRodeLength;
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
    this.displayRadius =
      typeof value === 'number'
        ? this.feet
          ? this.ftToM(value)
          : value
        : value;
    if (!this.raised) {
      this.signalk
        .post(
          '/plugins/anchoralarm/setRadius',
          typeof value === 'number' ? { radius: value } : {}
        )
        .subscribe(
          () => {
            this.app.config.anchorRadius = value;
            this.app.saveConfig();
          },
          (err: HttpErrorResponse) => {
            this.app.parseHttpErrorResponse(err);
          }
        );
    }
  }

  /**
   * @description Set anchor position using the rode length
   */
  setManualAnchor() {
    if (typeof this.defaultRodeLength !== 'number') {
      this.app.showAlert('Error', 'Rode length value is not a number!');
      return;
    }
    this.app.config.anchorRodeLength = this.defaultRodeLength;
    this.signalk
      .post('/plugins/anchoralarm/setManualAnchor', {
        rodeLength: this.app.config.anchorRodeLength
      })
      .subscribe(
        () => {
          this.app.saveConfig();
        },
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Handle raise / drop slide toggle change
   * @param e Slide change event
   */
  dropRaiseAnchor(e: MatSlideToggleChange) {
    if (e.checked) {
      this.dropAnchor(
        this.useDefaultRadius ? this.defaultAlarmRadius : undefined
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
    this.app.config.anchorRadius = radius;
    this.anchor.setRaisedSignal(false);
    this.signalk
      .post(
        '/plugins/anchoralarm/dropAnchor',
        typeof radius === 'number' ? { radius: radius } : {}
      )
      .subscribe(
        () => {
          this.app.saveConfig();
        },
        (err: HttpErrorResponse) => {
          this.anchor.setRaisedSignal(true);
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Raise the Anchor
   */
  raiseAnchor() {
    this.signalk.post('/plugins/anchoralarm/raiseAnchor', {}).subscribe(
      () => undefined,
      (err: HttpErrorResponse) => {
        this.app.parseHttpErrorResponse(err);
      }
    );
  }

  /**
   * @description Shift anchor position n,s,e,w
   * @param direction (degrees) 0 | 90 | 180 | 270
   */
  shiftAnchor(direction: number) {
    const inc = 1;
    const position = computeDestinationPoint(
      this.anchor.position(),
      inc,
      direction
    );
    this.anchor
      .setAnchorPosition([position.longitude, position.latitude])
      .catch((err: HttpErrorResponse) => {
        this.app.parseHttpErrorResponse(err);
      });
  }

  close() {
    this.closed.emit();
  }

  mToFt(value: number) {
    return Math.round(value * 3.28084);
  }
  ftToM(value: number) {
    return Math.round(value / 3.28084);
  }
}
