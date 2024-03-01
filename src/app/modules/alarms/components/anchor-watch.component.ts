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

import { computeDestinationPoint } from 'geolib';

import { AlarmsFacade } from '../alarms.facade';
import { AppInfo } from 'src/app/app.info';

interface OutputMessage {
  radius: number | null;
  action: 'drop' | 'raise' | 'setRadius' | 'position' | undefined;
}

@Component({
  selector: 'anchor-watch',
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
  @Input() disable = false;
  @Output() change: EventEmitter<OutputMessage> = new EventEmitter();
  @Output() closed: EventEmitter<OutputMessage> = new EventEmitter();

  @ViewChild('slideCtl', { static: true }) slideCtl: ElementRef;

  bgImage: string;
  msg: OutputMessage = { radius: null, action: undefined };

  sliderValue: number;
  rodeOut = false;

  constructor(private facade: AlarmsFacade, private app: AppInfo) {}

  ngOnInit() {
    this.msg.radius = this.sliderValue;
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

  setAnchor(e: { checked: boolean }) {
    this.msg.action = e.checked ? 'drop' : 'raise';
    this.facade
      .anchorEvent({ radius: this.msg.radius, action: this.msg.action })
      .catch(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.slideCtl as any).checked = !(this.slideCtl as any).checked;
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
