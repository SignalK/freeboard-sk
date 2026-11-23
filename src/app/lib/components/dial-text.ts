import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-text',
  imports: [],
  template: `
    <div class="dial-text mat-app-background">
      <div class="dial-text-title">
        {{ title() }}&nbsp;
        @if (subTitle()) {
          <span class="dial-text-subtitle">({{ subTitle() }})</span>
        }
      </div>
      <div class="dial-text-value">{{ value() }}</div>
      <div class="dial-text-units">{{ units() }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class TextDialComponent {
  title = input<string>();
  subTitle = input<string>();
  value = input<string | number>();
  units = input<string>();
}

/**
 * Styles for a value line that holds its width once cleared: the hidden
 * `.dial-text-reserve` copy of the last value shares the grid cell of the text
 * shown, so the line stays as wide as that value.
 */
const HELD_WIDTH = `
  .dial-text-value {
    display: grid;
  }
  .dial-text-value > span {
    grid-area: 1 / 1;
  }
  .dial-text-reserve {
    visibility: hidden;
  }
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-ttg',
  imports: [],
  template: `
    <div class="dial-text mat-app-background">
      <div class="dial-text-title">
        TTG&nbsp;
        @if (subTitle()) {
          <span class="dial-text-subtitle"> ({{ subTitle() }}) </span>
        }
      </div>
      <div class="dial-text-value">
        <span>{{ ttg }}</span>
        <span class="dial-text-reserve" aria-hidden="true">{{
          lastShown
        }}</span>
      </div>
      <div class="dial-text-units">{{ units }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css'],
  // The route bar keeps its width when the value gives way to '--' (#1350):
  // at least as wide as an hr:min value, and once cleared as wide as the last
  // value shown, which a day count can make wider still.
  styles: [HELD_WIDTH, '.dial-text-value { min-width: 4.6ch; }']
})
export class TTGDialComponent {
  value = input<number | null>();
  subTitle = input<string>();
  protected ttg: string = '--';
  protected units: string = 'min';
  /** The last value shown, kept (invisibly) after it is cleared to hold the
   *  cell's width. */
  protected lastShown: string = '';

  constructor() {
    effect(() => {
      const cv = this.value();
      if (typeof cv !== 'number') {
        this.ttg = '--';
        this.units = 'min';
        return;
      }
      if (cv < 60) {
        this.ttg = Math.floor(cv).toString();
        this.units = 'min';
      } else if (cv < 60 * 24) {
        this.ttg = `${Math.floor(cv / 60)}:${(
          '00' + (cv % 60).toFixed(0)
        ).slice(-2)}`;
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
      this.lastShown = this.ttg;
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-eta',
  imports: [],
  template: `
    <div class="dial-text mat-app-background">
      <div class="dial-text-title">
        ETA&nbsp;
        @if (subTitle()) {
          <span class="dial-text-subtitle"> ({{ subTitle() }}) </span>
        }
      </div>
      <div class="dial-text-value">
        <span>{{ etaTime }}</span>
        <span class="dial-text-reserve" aria-hidden="true">{{
          lastShown
        }}</span>
      </div>
      <div class="dial-text-units">{{ etaDate }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css'],
  // The route bar keeps its width when the value gives way to '--' (#1350):
  // at least as wide as a 12-hour time such as '12:45 PM', and once cleared as
  // wide as the last time shown, which some locales make wider still.
  styles: [HELD_WIDTH, '.dial-text-value { min-width: 7.7ch; }']
})
export class ETADialComponent {
  value = input<Date | null>();
  subTitle = input<string>();
  protected etaTime: string = '--';
  protected etaDate: string = '--';
  /** The last time shown, kept (invisibly) after it is cleared to hold the
   *  cell's width. */
  protected lastShown: string = '';

  constructor() {
    effect(() => {
      const v = this.value();
      if (v) {
        // Let Intl drop the seconds. Slicing the ':'-separated parts of a full
        // toLocaleTimeString() also discarded the locale's day period, showing
        // an ambiguous '6:16' instead of '6:16 PM' in 12-hour locales.
        this.etaTime = v.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit'
        });
        this.etaDate = v.toLocaleDateString();
        this.lastShown = this.etaTime;
      } else {
        this.etaTime = '--';
        this.etaDate = '--';
      }
    });
  }
}
