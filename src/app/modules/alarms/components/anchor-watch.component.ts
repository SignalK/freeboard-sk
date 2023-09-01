import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges
} from '@angular/core';

interface OutputMessage {
  radius: number | null;
  raised: boolean;
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

  bgImage: string;
  display = { sliderColor: 'primary' };
  msg: OutputMessage = { radius: null, raised: true };

  //constructor() { }

  ngOnInit() {
    this.display.sliderColor = !this.raised ? 'warn' : 'primary';
    this.msg.radius = this.sliderValue;
  }

  //ngAfterViewInit() { }

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
  }

  setRadius(value: number) {
    console.log('raw:', value);
    console.log('converted:', this.feet ? this.ftToM(value) : value);
    this.msg.radius = this.feet ? this.ftToM(value) : value;
    if (!this.raised) {
      this.msg.raised = null; // set radius change only
      this.change.emit(this.msg);
    }
  }

  dropAnchor(e: any) {
    this.raised = !e.checked;
    this.display.sliderColor = !this.raised ? 'warn' : 'primary';
    this.msg.raised = this.raised;
    this.change.emit(this.msg);
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
