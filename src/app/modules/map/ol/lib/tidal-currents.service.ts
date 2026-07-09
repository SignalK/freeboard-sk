import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';

export interface GridSample {
  latitude: number;
  longitude: number;
  speedKn: number;
  direction: number;
  u: number;
  v: number;
}

export interface TidalCurrentGridResponse {
  time: string;
  units: {
    speedKn: string;
    u: string;
    v: string;
  };
  points: GridSample[];
}

export interface HourTick {
  ms: number;
  pct: number;
  isDayStart: boolean;
}

export interface HourLabel {
  ms: number;
  pct: number;
  label: string;
  isDayStart: boolean;
}

const PLAY_STEP_MS = 600;
const STEP_MINUTES = 15;

@Injectable({ providedIn: 'root' })
export class TidalCurrentsService {
  /** Absolute ms timestamp of the bar center. Null = "now" (no time param). */
  readonly scrubTime: WritableSignal<number | null> = signal(null);
  readonly isPlaying = signal(false);
  readonly dragEnd$ = new Subject<void>();
  private playTimer: ReturnType<typeof setInterval> | null = null;

  /** Ticks once a minute so "now"-based computed values keep advancing while scrubTime is null. */
  private readonly clockTick = signal(Date.now());

  /** Thin vertical lines at each whole-hour boundary. */
  readonly hourTicks = computed(() => {
    const st = this.scrubTime() ?? this.clockTick();
    const wStart = st - 12 * 3600_000;
    const wEnd = st + 12 * 3600_000;
    const hourMs = 3600_000;
    const totalMs = wEnd - wStart;
    const ticks: HourTick[] = [];
    const firstHour = Math.floor(wStart / hourMs) * hourMs;
    let t = firstHour;
    while (t <= wEnd) {
      const pct = ((t - wStart) / totalMs) * 100;
      if (pct >= -3 && pct <= 103) {
        ticks.push({ ms: t, pct, isDayStart: new Date(t).getHours() === 0 });
      }
      t += hourMs;
    }
    return ticks;
  });

  /** Labels centered within each hour segment. */
  readonly hourLabels = computed(() => {
    const st = this.scrubTime() ?? this.clockTick();
    const wStart = st - 12 * 3600_000;
    const wEnd = st + 12 * 3600_000;
    const hourMs = 3600_000;
    const totalMs = wEnd - wStart;
    const labels: HourLabel[] = [];
    const firstHour = Math.floor(wStart / hourMs) * hourMs;
    let t = firstHour;
    while (t < wEnd) {
      const segEnd = Math.min(t + hourMs, wEnd);
      const midMs = (t + segEnd) / 2;
      const midPct = ((midMs - wStart) / totalMs) * 100;
      const h = new Date(midMs).getHours();
      labels.push({
        ms: midMs,
        pct: midPct,
        label: h % 2 === 0 ? String(h).padStart(2, '0') : '',
        isDayStart: h === 0
      });
      t += hourMs;
    }
    return labels;
  });

  /** CSS gradient string with stops shifted to align with actual hour boundaries. */
  readonly barBgGradient = computed(() => {
    const st = this.scrubTime() ?? this.clockTick();
    const wStart = st - 12 * 3600_000;
    const totalMs = 24 * 3600_000;
    const firstHour = Math.floor(wStart / 3600_000) * 3600_000;
    const off = ((firstHour - wStart) / totalMs) * 100;
    const hw = 100 / 24;
    const shade = this.app.uiConfig().invertColor
      ? 'rgba(255,255,255,0.07)'
      : 'rgba(0,0,0,0.06)';
    return `repeating-linear-gradient(to right, transparent ${off}%, transparent ${off + hw}%, ${shade} ${off + hw}%, ${shade} ${off + 2 * hw}%)`;
  });

  constructor(
    private sk: SignalKClient,
    private app: AppFacade
  ) {
    setInterval(() => this.clockTick.set(Date.now()), 60_000);
  }

  /** Formats a current speed (in knots) for display in the user's preferred units. */
  formatSpeed(knots: number): string {
    const driftMs = knots / 1.94384;
    return this.app.formatValueForDisplay(driftMs, 'm/s', { precision: 1 });
  }

  getGridCurrents(
    bbox: [number, number, number, number],
    time?: Date
  ): Observable<TidalCurrentGridResponse> {
    const [w, s, e, n] = bbox;
    let url = `/currents/grid?bbox=${encodeURIComponent(`${w},${s},${e},${n}`)}&maxPoints=200`;
    if (time) {
      url += `&time=${encodeURIComponent(time.toISOString())}`;
    }
    return this.sk.api.get(2, url);
  }

  /** Absolute selected Date (or null for "now"). */
  selectedTime(): Date | null {
    const t = this.scrubTime();
    return t !== null ? new Date(t) : null;
  }

  /** Center the bar on the time at the given fractional position (0 = left edge, 1 = right edge). */
  setFromBarPosition(percent: number) {
    const current = this.scrubTime() ?? Date.now();
    const hourOffset = (percent - 0.5) * 24;
    this.scrubTime.set(current + hourOffset * 3600_000);
  }

  stepForward() {
    const current = this.scrubTime() ?? Date.now();
    this.scrubTime.set(current + STEP_MINUTES * 60_000);
  }

  stepBack() {
    const current = this.scrubTime() ?? Date.now();
    this.scrubTime.set(current - STEP_MINUTES * 60_000);
  }

  stepForwardBig() {
    const current = this.scrubTime() ?? Date.now();
    this.scrubTime.set(current + 6 * 3600_000);
  }

  stepBackBig() {
    const current = this.scrubTime() ?? Date.now();
    this.scrubTime.set(current - 6 * 3600_000);
  }

  resetToNow() {
    this.pause();
    this.scrubTime.set(null);
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.playTimer) return;
    this.isPlaying.set(true);
    if (this.scrubTime() === null) {
      this.scrubTime.set(Date.now());
    }
    this.playTimer = setInterval(() => {
      this.stepForward();
    }, PLAY_STEP_MS);
  }

  pause() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    this.isPlaying.set(false);
  }
}
