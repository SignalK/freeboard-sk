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

import { AlarmsFacade, AnchorEvent } from '../alarms.facade';
import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'anchor-watch',
  standalone: true,
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
  @Input() disableRaiseDrop = false;
  @Output() change: EventEmitter<AnchorEvent> = new EventEmitter();
  @Output() closed: EventEmitter<AnchorEvent> = new EventEmitter();

  @ViewChild('slideCtl', { static: true }) slideCtl: ElementRef<MatSlideToggle>;

  protected bgImage: string;
  protected msg: AnchorEvent = {
    radius: null,
    action: undefined,
    mode: undefined,
    rodeLength: null
  };

  protected sliderValue: number;
  protected rodeOut = false;

  // set controls
  protected useDefaultRadius: boolean;
  protected defaultAlarmRadius: number;
  protected useSetManual: boolean;
  protected defaultRodeLength: number;

  constructor(private facade: AlarmsFacade, private app: AppFacade) {}

  ngOnInit() {
    this.msg.radius = this.sliderValue;
    this.defaultAlarmRadius = this.app.config.anchorRadius;
    this.useDefaultRadius = this.app.config.anchorSetRadius;
    this.useSetManual = this.app.config.anchorManualSet;
    this.defaultRodeLength = this.app.config.anchorRodeLength;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.radius) {
      if (changes.radius.previousValue === -1) {
        this.sliderValue = Math.round(changes.radius.currentValue);
        this.msg.radius = this.sliderValue;
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
    this.disableRaiseDrop = this.raised && this.useSetManual;
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

  setRadius(value?: number) {
    this.rodeOut = true;
    this.msg.radius =
      typeof value === 'number'
        ? this.feet
          ? this.ftToM(value)
          : value
        : value;
    if (!this.raised) {
      this.msg.action = 'setRadius';
      this.facade.anchorEvent({
        radius: this.msg.radius,
        action: this.msg.action
      });
    }
  }

  setManualAnchor() {
    this.app.config.anchorRodeLength = this.defaultRodeLength;
    this.msg.action = 'drop';
    this.msg.radius = undefined;
    this.msg.mode = 'setManualAnchor';
    this.msg.rodeLength = this.defaultRodeLength;
    this.facade.anchorEvent(this.msg).catch(() => {
      this.slideCtl.nativeElement.checked =
        !this.slideCtl.nativeElement.checked;
    });
  }

  dropRaiseAnchor(e: MatSlideToggleChange) {
    if (e.checked) {
      this.msg.action = 'drop';
      this.msg.radius = this.useDefaultRadius
        ? this.defaultAlarmRadius
        : undefined;
      this.msg.mode = 'dropAnchor';
      this.msg.rodeLength = undefined;
    } else {
      this.msg.action = 'raise';
      this.msg.radius = undefined;
      this.msg.mode = undefined;
      this.msg.rodeLength = undefined;
    }
    this.facade.anchorEvent(this.msg).catch(() => {
      this.slideCtl.nativeElement.checked =
        !this.slideCtl.nativeElement.checked;
    });
  }

  shiftAnchor(direction: number) {
    const inc = 1;
    const position = computeDestinationPoint(
      this.app.data.anchor.position,
      inc,
      direction
    );

    this.msg.action = 'position';
    this.facade
      .anchorEvent(this.msg, undefined, [position.longitude, position.latitude])
      .catch(() => {
        console.log('Error shifting anchor!');
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
