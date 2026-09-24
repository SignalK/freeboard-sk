import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';

import { ChartTimeBar, ChartTimeLoop } from './chart-time-bar';
import {
  CHART_TIME_PLAYBACK_MS,
  ChartTimePlaybackSpeed,
  chartTimeShortLabel
} from './chart-time-dialog';
import { PalettePosition } from 'src/app/types';
// type-only: the service opens this palette, so a value import would be a cycle
import type { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import {
  HistoryPreset,
  historyAxis,
  loopToRange,
  nextPlaybackTime,
  rangeToLoop,
  stepScrubTime
} from 'src/app/modules/skstream/track-history';

export interface TrackHistoryDialogData {
  history: TrackHistoryService;
  position?: PalettePosition | null;
  onMoved?: (position: PalettePosition) => void;
}

/** How often "now" (the end of the bar) moves on. */
const CLOCK_TICK_MS = 60000;

/**
 * Modeless, draggable palette for recorded track history (#821): the vessels
 * whose history is shown, the one time range shown for all of them (quick
 * choices, and the from/to handles of the bar over the whole recorded span),
 * and a scrubber — the bar's playhead, stepped or played through the range —
 * that puts a ghost of each vessel where it was at that time. Closing it
 * hides every history layer.
 */
@Component({
  selector: 'ap-track-history-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    ChartTimeBar,
    CdkDrag,
    CdkDragHandle
  ],
  styles: `
    .section-title {
      padding: 8px 16px 0;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.04em;
      opacity: 0.7;
    }
    .presets {
      display: flex;
      gap: 4px;
      padding: 4px 12px 0;
    }
    .group {
      margin: 10px 12px 0;
      padding: 0 4px 4px;
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
    }
    .group legend {
      padding: 0 4px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.04em;
      opacity: 0.7;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .presets button {
      min-width: 0;
      padding: 0 10px;
      height: 28px;
      font-size: 12px;
    }
    .presets button.active {
      font-weight: 700;
      background: rgba(79, 148, 212, 0.24);
    }
    .vessels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 2px 4px 4px;
    }
    .vessel {
      display: flex;
      align-items: center;
      gap: 2px;
      max-width: 100%;
      padding-left: 8px;
      border-radius: 12px;
      font-size: 12px;
      background: rgba(127, 127, 127, 0.18);
    }
    .vessel span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vessel button {
      width: 24px;
      height: 24px;
      padding: 0;
      --mat-icon-button-state-layer-size: 24px;
    }
    .vessel mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    /* Compact select, as on the chart time palette. */
    ._ap-speed {
      width: 92px;
      font-size: 11px;
    }
    ._ap-speed ::ng-deep .mat-mdc-text-field-wrapper {
      padding-top: 0;
      padding-bottom: 0;
    }
    ._ap-speed ::ng-deep .mat-mdc-form-field-infix {
      min-height: 30px;
      padding-top: 6px;
      padding-bottom: 4px;
    }
    ._ap-speed ::ng-deep .mat-mdc-select-value,
    ._ap-speed ::ng-deep .mat-mdc-floating-label {
      font-size: 11px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 20px;
      padding: 2px 16px 8px;
      font-size: 11px;
      opacity: 0.7;
    }
  `,
  template: `
    <div
      style="overflow: hidden; color: var(--mat-app-text-color);"
      cdkDrag
      cdkDragRootElement=".cdk-overlay-pane"
      [cdkDragFreeDragPosition]="initialPosition"
      (cdkDragEnded)="onDragEnded($event)"
    >
      <div
        cdkDragHandle
        style="display:flex; align-items:center; cursor:move; padding: 4px 4px 0 12px;"
      >
        <mat-icon style="opacity:0.6;">history</mat-icon>
        <div style="flex: 1 1 auto; padding-left: 8px; font-weight: 500;">
          Track history
        </div>
        <button
          mat-icon-button
          aria-label="Hide track history"
          matTooltip="Hide track history"
          (click)="history.clear()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <fieldset class="group">
        <legend>Vessels</legend>
        <div class="vessels">
          @for (c of history.shown(); track c) {
            <div class="vessel">
              <span [title]="history.label(c)">{{ history.label(c) }}</span>
              <button
                mat-icon-button
                [attr.aria-label]="'Hide history of ' + history.label(c)"
                matTooltip="Hide this vessel's history"
                (click)="history.remove(c)"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </div>
      </fieldset>

      <div class="section-title">Range: {{ rangeText() }}</div>
      <div class="presets" role="group" aria-label="Quick ranges">
        @for (p of presets; track p.id) {
          <button
            mat-stroked-button
            [class.active]="history.preset() === p.id"
            [attr.aria-pressed]="history.preset() === p.id"
            (click)="history.setPreset(p.id)"
          >
            {{ p.label }}
          </button>
        }
      </div>

      <fieldset class="group">
        <legend>Playback</legend>
        <div
          style="padding: 0 8px; font-size: 15px; font-weight: 500;"
          aria-live="polite"
        >
          {{ scrubText() }}
        </div>
        <ap-chart-time-bar
          style="padding: 4px 0 0"
          [min]="axis().min"
          [max]="axis().max"
          [step]="axis().step"
          [position]="head()"
          [loop]="loop()"
          [label]="thumbLabel"
          [names]="handleNames"
          (positionChange)="onScrub($event)"
          (loopChange)="onLoop($event)"
        />
        <div class="controls">
          <button
            mat-icon-button
            aria-label="Step back"
            matTooltip="Step back"
            (click)="step(-1)"
          >
            <mat-icon>navigate_before</mat-icon>
          </button>
          <button
            mat-icon-button
            [attr.aria-label]="playing() ? 'Pause' : 'Play'"
            [matTooltip]="playing() ? 'Pause' : 'Play'"
            (click)="togglePlay()"
          >
            <mat-icon>{{ playing() ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
          <button
            mat-icon-button
            aria-label="Step forward"
            matTooltip="Step forward"
            [disabled]="history.scrubTime() === null"
            (click)="step(1)"
          >
            <mat-icon>navigate_next</mat-icon>
          </button>
          <mat-form-field
            class="_ap-speed"
            appearance="outline"
            subscriptSizing="dynamic"
          >
            <mat-label>Speed</mat-label>
            <mat-select
              [value]="speed()"
              (valueChange)="setSpeed($event)"
              aria-label="Playback speed"
            >
              <mat-option value="slow">Slow</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="fast">Fast</mat-option>
              <mat-option value="xfast">X-fast</mat-option>
            </mat-select>
          </mat-form-field>
          <span style="flex: 1 1 auto"></span>
          <button
            mat-button
            matTooltip="Return to the vessels' current positions"
            [disabled]="history.scrubTime() === null"
            (click)="goLive()"
          >
            NOW
          </button>
        </div>
      </fieldset>

      <div class="status">
        @if (history.pending() > 0) {
          <mat-spinner diameter="12"></mat-spinner>
          <span>Loading…</span>
        } @else {
          <span>{{ statusText() }}</span>
        }
      </div>
    </div>
  `
})
export class TrackHistoryDialog {
  protected data = inject<TrackHistoryDialogData>(MAT_DIALOG_DATA);
  protected history = this.data.history;

  protected presets: { id: HistoryPreset; label: string }[] = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: 'all', label: 'All' }
  ];
  protected handleNames = { start: 'From', end: 'To' };
  protected thumbLabel = (t: number) =>
    chartTimeShortLabel(new Date(t).toISOString());
  protected initialPosition: PalettePosition = this.data.position ?? {
    x: 0,
    y: 0
  };

  private now = signal(Date.now());

  /** The bar spans the earliest record of any shown vessel up to now. */
  protected axis = computed(() => {
    const froms = [...this.history.spans().values()].map((s) => s.from);
    return historyAxis(
      froms.length ? Math.min(...froms) : undefined,
      this.now()
    );
  });

  protected loop = computed(() =>
    rangeToLoop(this.history.range(), this.axis())
  );

  /** The playhead: the scrubbed time, or the end of the bar (now) when live. */
  protected head = computed(() => this.history.scrubTime() ?? this.axis().max);

  protected scrubText = computed(() => {
    const t = this.history.scrubTime();
    return t === null ? 'Now' : this.thumbLabel(t);
  });

  protected rangeText = computed(() => {
    const r = this.history.range();
    if (r.from === null && r.to === null) {
      return 'All recorded history';
    }
    const from = r.from === null ? 'Start of record' : this.thumbLabel(r.from);
    const to = r.to === null ? 'Now' : this.thumbLabel(r.to);
    return `${from} – ${to}`;
  });

  protected statusText = computed(() => {
    const tracks = [...this.history.tracks().values()];
    if (tracks.length === 0) {
      return 'No recorded track in this area and time range';
    }
    const points = tracks.reduce(
      (n, t) => n + t.lines.reduce((m, l) => m + l.length, 0),
      0
    );
    return `${points} points shown`;
  });

  protected playing = signal(false);
  protected speed = signal<ChartTimePlaybackSpeed>('medium');
  private playTimer?: ReturnType<typeof setInterval>;

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.stopPlayback();
    });
  }

  /** Scrub from the bar; the end of the bar (now) is live. */
  protected onScrub(t: number) {
    this.history.setScrub(t >= this.axis().max ? null : t);
  }

  protected step(direction: -1 | 1) {
    this.history.setScrub(
      stepScrubTime(this.history.scrubTime(), direction, this.axis())
    );
  }

  protected goLive() {
    this.stopPlayback();
    this.history.setScrub(null);
  }

  protected togglePlay() {
    if (this.playing()) {
      this.stopPlayback();
      return;
    }
    this.playing.set(true);
    this.tick();
    this.startTimer();
  }

  protected setSpeed(speed: ChartTimePlaybackSpeed) {
    this.speed.set(speed);
    // a running playback picks the new pace up at once
    if (this.playing()) {
      clearInterval(this.playTimer);
      this.startTimer();
    }
  }

  private startTimer() {
    this.playTimer = setInterval(
      () => this.tick(),
      CHART_TIME_PLAYBACK_MS[this.speed()]
    );
  }

  /** One step of playback through the selected range. */
  private tick() {
    this.history.setScrub(
      nextPlaybackTime(this.history.scrubTime(), this.loop(), this.axis().step)
    );
  }

  private stopPlayback() {
    clearInterval(this.playTimer);
    this.playTimer = undefined;
    this.playing.set(false);
  }

  protected onLoop(loop: ChartTimeLoop) {
    this.history.setRange(loopToRange(loop, this.axis()));
  }

  protected onDragEnded(e: CdkDragEnd) {
    this.data.onMoved?.(e.source.getFreeDragPosition());
  }
}
