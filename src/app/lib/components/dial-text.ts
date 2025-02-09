/** Text Dial Component **
 ************************/

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';

/*********** Text Dial ***************
title: "<string>" title text,
value: "<string>" display value,
units: "<string>" dsisplay units,
***********************************/
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-text',
  imports: [],
  template: `
    <div class="dial-text mat-app-background">
      <div class="dial-text-title">{{ title }}</div>
      <div class="dial-text-value">{{ value }}</div>
      <div class="dial-text-units">{{ units }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class TextDialComponent {
  @Input() title: string;
  @Input() value: string;
  @Input() units: string;
}

/*********** TTG Text Dial ***************
value: "<number>" TTG value in minutes
***********************************/
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-ttg',
  imports: [],
  template: `
    <div class="dial-text mat-app-background">
      <div class="dial-text-title">TTG</div>
      <div class="dial-text-value">{{ ttg }}</div>
      <div class="dial-text-units">{{ units }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class TTGDialComponent {
  @Input() value: number;
  protected ttg: string = '--';
  protected units: string = 'min';

  ngOnChanges(changes: SimpleChanges) {
    const cv = changes.value.currentValue;
    if (typeof cv !== 'number') {
      this.ttg = '--';
      this.units = 'min';
    } else if (cv < 60) {
      this.ttg = Math.floor(cv).toString();
      this.units = 'min';
    } else if (cv < 60 * 24) {
      this.ttg = `${Math.floor(cv / 60)}:${(cv % 60).toFixed(0)}`;
      this.units = 'hr:min';
    } else {
      const minPerDay = 60 * 24;
      const days = Math.floor(cv / minPerDay);
      const dm = days * minPerDay;
      const rhm = cv - dm;
      const hours = Math.floor(rhm / 60);
      const minutes = `00${Math.floor(rhm - hours * 60)}`.slice(-2);
      this.ttg = `${days}:${('00' + hours).slice(-2)}:${minutes}`;
      this.units = 'day:hr:min';
    }
  }
}

/*********** ETA Text Dial ***************
value: "<Date>" ETA date
***********************************/
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-eta',
  imports: [],
  template: `
    <div class="dial-text mat-app-background">
      <div class="dial-text-title">ETA</div>
      <div class="dial-text-value">{{ etaTime }}</div>
      <div class="dial-text-units">{{ etaDate }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class ETADialComponent {
  @Input() value: Date;
  protected etaTime: string = '--';
  protected etaDate: string = '--';

  ngOnChanges(changes: SimpleChanges) {
    const cv = changes.value.currentValue;
    this.etaTime = cv.toLocaleTimeString().split(':').slice(0, 2).join(':');
    this.etaDate = cv.toLocaleDateString();
  }
}
