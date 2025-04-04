import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  ChangeDetectionStrategy,
  Renderer2,
  SimpleChanges
} from '@angular/core';

import { CommonModule } from '@angular/common';

interface DialConfig {
  minValue: number;
  maxValue: number;
  minAngle: number;
  maxAngle: number;
}

//** Base class **
class SvgDialBase implements DialConfig {
  //** config variables **
  minValue = 0; //** min scale value
  maxValue = 360; //** max scale value
  minAngle = 0; //** pointer angle when showing min value
  maxAngle = 360; //** pointer angle when showing max value
  private _scale = 1; //** scaling variables
  protected pointers = {
    //** dial pointers
    value: null,
    lo: null,
    hi: null
  };

  constructor(config?: DialConfig) {
    if (config) {
      //** set config here
      this.minValue = config.minValue ? config.minValue : this.minValue;
      this.maxValue = config.maxValue ? config.maxValue : this.maxValue;
      this.minAngle = config.minAngle ? config.minAngle : this.minAngle;
      this.maxAngle = config.maxAngle ? config.maxAngle : this.maxAngle;
    }
    this._init();
  }

  //** initialise: calculate scaling **
  private _init() {
    const a: number =
      this.minAngle > this.maxAngle
        ? 360 - this.minAngle + this.maxAngle
        : this.maxAngle - this.minAngle;
    const b: number = this.maxValue - this.minValue;
    this._scale = a / b; //** deg / 1 unit
  }

  //** return the angle to rotate needle for supplied val **
  getAngle(val) {
    let v = this._checkInRange(val);
    v = v - this.minValue; //** cater for non-zero min values
    return v * this._scale + this.minAngle;
  }

  /** check minValue < val < maxValue.
   * retruns: val if in range else minVaue or maxVale **/
  private _checkInRange(val) {
    if (isNaN(val)) {
      return 0;
    }

    if (val > this.maxValue) {
      return this.maxValue;
    } else if (val < this.minValue) {
      return this.minValue;
    } else {
      return val;
    }
  }
}

/*** Compass component *******
 <ap-compass>
    [heading]="<number>" dial heading value to display
    [needle]="<number>" needle value to display
	[windtrue]="<number>" wind true direction 0-359
	[windapparent]="<number>" wind apparent direction 0-359
	[speed]="<string>" speed value to display
***********************************/
@Component({
  selector: 'ap-compass',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './compass.component.svg'
})
export class CompassComponent extends SvgDialBase {
  @Input() speed: number;
  @Input() speedunits = 'knots';
  @Input() heading: number;
  @Input() needle: number;
  @Input() windtrue: number;
  @Input() windapparent: number;
  @ViewChild('speedtext', { static: true }) speedtext: ElementRef;
  @ViewChild('speedunitstext', { static: true }) speedunitstext: ElementRef;
  @ViewChild('dial', { static: true }) dial: ElementRef;
  @ViewChild('headingtext', { static: true }) headingtext: ElementRef;
  @ViewChild('pointer', { static: true }) pointer: ElementRef;
  @ViewChild('needlehi', { static: true }) needlehi: ElementRef;
  @ViewChild('needlelo', { static: true }) needlelo: ElementRef;
  public valueStr: string = '0' + String.fromCharCode(186);
  private ptrOffset = 0; // ** pointer offset value

  constructor(private renderer: Renderer2) {
    super(null);
  }

  ngOnInit() {
    this.pointers.value = this.dial;
    this.pointers['value2'] = this.pointer;
    this.pointers.hi = this.needlehi;
    this.pointers.lo = this.needlelo;
    this.updateDial();
  }

  //** handle inputs changes
  ngOnChanges(changes: SimpleChanges) {
    this.updateDial(changes);
  }

  updateDial(changes = null) {
    const d = {
      heading: null,
      needle: null,
      windtrue: null,
      windapparent: null,
      speed: null
    };
    d.heading =
      changes && changes.heading ? changes.heading.currentValue : this.heading;
    d.needle =
      changes && changes.needle ? changes.needle.currentValue : this.needle;
    d.windtrue =
      changes && changes.hi ? changes.windtrue.currentValue : this.windtrue;
    d.windapparent =
      changes && changes.windapparent
        ? changes.windapparent.currentValue
        : this.windapparent;
    d.speed =
      changes && changes.speed ? changes.speed.currentValue : this.speed;

    this.renderer.setProperty(
      this.speedtext.nativeElement,
      'innerHTML',
      `${typeof this.speed === 'number' ? this.speed.toFixed(1) : '-'}`
    );
    this.renderer.setProperty(
      this.speedunitstext.nativeElement,
      'innerHTML',
      this.speedunits
    );
    if (this.pointers.value) {
      d.heading = parseFloat(d.heading);
      if (isNaN(d.heading)) {
        d.heading = null;
      }
      this.ptrOffset = d.heading !== null ? d.heading : 0;
      if (d.heading !== null) {
        d.heading = d.heading > 360 ? d.heading - 360 : d.heading;
        this.valueStr = d.heading.toFixed(0) + String.fromCharCode(186);
        const val = 0 - this.getAngle(d.heading);
        this.renderer.setAttribute(
          this.dial.nativeElement,
          'transform',
          'rotate(' + val + ' 100 100)'
        );
        this.renderer.setProperty(
          this.headingtext.nativeElement,
          'innerHTML',
          this.valueStr
        );
      } else {
        this.renderer.setAttribute(
          this.dial.nativeElement,
          'transform',
          'rotate(' + (0 - this.getAngle(0)) + ' 100 100)'
        );
        this.renderer.setProperty(
          this.headingtext.nativeElement,
          'innerHTML',
          '--'
        );
      }
    }
    if (this.pointers['value2']) {
      d.needle = parseFloat(d.needle);
      if (isNaN(d.needle)) {
        d.needle = null;
      }
      if (d.needle !== null) {
        const val = this.getAngle(d.needle) - this.ptrOffset;
        this.renderer.setAttribute(
          this.pointer.nativeElement,
          'transform',
          'rotate(' + val + ' 100 100)'
        );
      }
    }
    if (this.pointers.hi) {
      d.windtrue = parseFloat(d.windtrue);
      if (isNaN(d.windtrue)) {
        d.windtrue = null;
      }
      if (d.windtrue !== null) {
        const val =
          d.windtrue < 0
            ? d.windtrue
            : this.getAngle(d.windtrue) - this.ptrOffset;
        this.renderer.setAttribute(
          this.needlehi.nativeElement,
          'transform',
          'rotate(' + val + ' 100 100)'
        );
      }
    }
    if (this.pointers.lo) {
      d.windapparent = parseFloat(d.windapparent);
      if (isNaN(d.windapparent)) {
        d.windapparent = null;
      }
      if (d.windapparent !== null) {
        const val = d.windapparent;
        this.renderer.setAttribute(
          this.needlelo.nativeElement,
          'transform',
          'rotate(' + val + ' 100 100)'
        );
      }
    }
  }
}

/*** North Up Compass component *************
 <ap-compass-northup>
	[heading]="<number>" pointer value to display
	[windtrue]="<number>" wind true direction 0-359
	[windapparent]="<number>" wind apparent direction 0-359
	[label]="<string>" label text to display
***********************************/
@Component({
  selector: 'ap-compass-northup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './compass-northup.component.svg'
})
export class NorthUpCompassComponent extends SvgDialBase {
  @Input() label = '';
  @Input() speed: number | undefined;
  @Input() heading: number | undefined;
  @Input() windtrue: boolean;
  @Input() windapparent: boolean;
  @ViewChild('labeltext', { static: true }) labeltext: ElementRef;
  @ViewChild('headingtext', { static: true }) headingtext: ElementRef;
  @ViewChild('speedtext', { static: true }) speedtext: ElementRef;
  @ViewChild('pointer', { static: true }) pointer: ElementRef;
  @ViewChild('needlehi', { static: true }) needlehi: ElementRef;
  @ViewChild('needlelo', { static: true }) needlelo: ElementRef;

  public showPointer = true;
  public showWindTrue = true;
  public showWindApparent = true;

  constructor(private renderer: Renderer2) {
    super(null);
  }

  ngOnInit() {
    this.updateDial();
  }

  //** handle inputs changes
  ngOnChanges(changes: SimpleChanges) {
    this.updateDial(changes);
  }

  // render numeric value as string
  renderValue(value: number, precision = 0, leadingZero = false): string {
    if (isNaN(value) || typeof value !== 'number') {
      return '--';
    }
    const res =
      typeof precision === 'number'
        ? value.toFixed(precision)
        : value.toString();
    return value < 10 && leadingZero ? '0' + res : res;
  }

  updateDial(changes?: SimpleChanges) {
    const d = {
      windtrue: false,
      windapparent: false,
      label: null,
      heading: null,
      speed: null
    };
    d.heading =
      changes && changes['heading']
        ? changes['heading'].currentValue
        : this.heading;
    d.speed =
      changes && changes['speed'] ? changes['speed'].currentValue : this.speed;
    d.label =
      changes && changes['label'] ? changes['label'].currentValue : this.label;

    if (this.labeltext && this.labeltext.nativeElement) {
      this.renderer.setProperty(
        this.labeltext.nativeElement,
        'innerHTML',
        d.label
      );
    }

    if (this.speedtext && this.speedtext.nativeElement) {
      this.renderer.setProperty(
        this.speedtext.nativeElement,
        'innerHTML',
        this.renderValue(d.speed, 1)
      );
    }

    const rHeading = this.renderValue(d.heading, 0);
    const rAngle = rHeading === '--' ? this.minValue : d.heading;

    this.showPointer =
      (rHeading === '--' ? false : true) &&
      !this.windtrue &&
      !this.windapparent;
    if (this.pointer && this.pointer.nativeElement) {
      this.renderer.setAttribute(
        this.pointer.nativeElement,
        'transform',
        'rotate(' + this.getAngle(rAngle) + ' 100 100)'
      );
    }
    if (this.headingtext && this.headingtext.nativeElement) {
      this.renderer.setProperty(
        this.headingtext.nativeElement,
        'innerHTML',
        rHeading + String.fromCharCode(186)
      );
    }

    this.showWindTrue = (rHeading === '--' ? false : true) && this.windtrue;
    if (this.needlehi && this.needlehi.nativeElement) {
      this.renderer.setAttribute(
        this.needlehi.nativeElement,
        'transform',
        'rotate(' + this.getAngle(rAngle) + ' 100 100)'
      );
    }

    this.showWindApparent =
      (rHeading === '--' ? false : true) && this.windapparent && !this.windtrue;
    if (this.needlehi && this.needlehi.nativeElement) {
      this.renderer.setAttribute(
        this.needlelo.nativeElement,
        'transform',
        'rotate(' + this.getAngle(rAngle) + ' 100 100)'
      );
    }
  }
}
