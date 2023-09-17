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

import { AlarmsFacade } from '../alarms.facade';

interface OutputMessage {
  radius: number | null;
  action: 'drop' | 'raise' | 'setRadius' | undefined;
}

@Component({
  selector: 'anchor-watch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anchor-watch.component.html',
  styleUrls: ['./anchor-watch.component.css']
})
export class AnchorWatchComponent {
  @Input() sliderValue: number;
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
  display = { sliderColor: 'primary' };
  msg: OutputMessage = { radius: null, action: undefined };

  constructor(private facade: AlarmsFacade) {}

  ngOnInit() {
    this.display.sliderColor = !this.raised ? 'warn' : 'primary';
    this.msg.radius = this.sliderValue;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.display.sliderColor = !this.raised ? 'warn' : 'primary';
    if (changes.sliderValue) {
      this.sliderValue =
        changes.sliderValue.currentValue ??
        changes.sliderValue.previousValue ??
        0;
    }
    this.bgImage = `url('${
      this.raised
        ? './assets/img/anchor-radius-raised.png'
        : './assets/img/anchor-radius.png'
    }')`;
    this.display.sliderColor = !this.raised ? 'warn' : 'primary';
  }

  setRadius(value: number) {
    console.log('raw:', value);
    console.log('converted:', this.feet ? this.ftToM(value) : value);
    this.msg.radius = this.feet ? this.ftToM(value) : value;
    if (!this.raised) {
      this.msg.action = 'setRadius'; // set radius change only
      //this.change.emit(this.msg);
      this.facade.anchorEvent({
        radius: this.msg.radius,
        action: this.msg.action
      });
    }
  }

  setAnchor(e: { checked: boolean }) {
    this.msg.action = e.checked ? 'drop' : 'raise';
    //this.change.emit(this.msg);
    this.facade
      .anchorEvent({ radius: this.msg.radius, action: this.msg.action })
      .catch((err: Error) => {
        (this.slideCtl as any).checked = !(this.slideCtl as any).checked;
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
