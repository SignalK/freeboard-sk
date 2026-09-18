import {
  Component,
  OnDestroy,
  Signal,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';

import { ChartTimeBar, ChartTimeLoop } from './chart-time-bar';

import {
  ChartTimeDimension,
  ChartTimeLoopOffsets,
  PalettePosition
} from 'src/app/types';
import {
  ChartTimeline,
  chartTimeMs,
  chartTimeline,
  chartTimelineInstant,
  chartTimelinePosition,
  nextChartPlaybackTime,
  stepChartTime
} from 'src/app/lib/chart-time';

export interface ChartTimeDialogData {
  text: string;
  dimension?: ChartTimeDimension;
  // The instant the chart is showing, read live: it can move under the
  // palette (an extension retargeting the chart) and the readout follows.
  value: Signal<string | null>;
  onChange: (value: string | null) => void;
  // Remembered loop range for this chart, and where the palette was dragged.
  loop?: ChartTimeLoopOffsets | null;
  onLoopChange?: (loop: ChartTimeLoopOffsets) => void;
  position?: PalettePosition | null;
  onMoved?: (position: PalettePosition) => void;
}

/** Playback speeds, as the delay between frames. */
export const CHART_TIME_PLAYBACK_MS = {
  slow: 1400,
  medium: 700,
  fast: 350,
  xfast: 150
} as const;
export type ChartTimePlaybackSpeed = keyof typeof CHART_TIME_PLAYBACK_MS;

/**
 * How much of the timeline the bar spans at once: the last 12 hours of
 * frames. A timeline can run for decades (IEM NEXRAD advertises 1995 onwards
 * at 5 minutes), which no slider can scrub; the bar shows a window of it
 * instead, which follows the shown instant as it is stepped past either end.
 */
export const CHART_TIME_WINDOW_MS = 12 * 3600000;

/**
 * The window's length in timeline positions when it ends at `end`: whole
 * steps of a range, or the number of explicit frames that fall in the last
 * {@link CHART_TIME_WINDOW_MS} before that frame (at least one step either way).
 */
export function chartTimeWindowSpan(
  timeline: ChartTimeline,
  end: number
): number {
  if (!timeline.frames) {
    return Math.max(
      timeline.step,
      Math.floor(CHART_TIME_WINDOW_MS / timeline.step) * timeline.step
    );
  }
  const endIndex = Math.min(
    timeline.max,
    Math.max(timeline.min, Math.round(end))
  );
  const startMs = chartTimeMs(timeline.frames[endIndex]) - CHART_TIME_WINDOW_MS;
  let startIndex = endIndex;
  while (
    startIndex > 0 &&
    chartTimeMs(timeline.frames[startIndex - 1]) >= startMs
  ) {
    startIndex--;
  }
  return Math.max(1, endIndex - startIndex);
}

/**
 * The bar's window over a timeline: {@link CHART_TIME_WINDOW_MS} of frames
 * ending at `end` (a timeline position), never past the timeline.
 */
export function chartTimeWindow(
  timeline: ChartTimeline,
  end: number
): { min: number; max: number } {
  const span = chartTimeWindowSpan(timeline, end);
  const max = Math.min(timeline.max, Math.max(timeline.min + span, end));
  return { min: Math.max(timeline.min, max - span), max };
}

/**
 * Where the bar's window ends when the palette opens: at the newest frame
 * (which the remembered loop is anchored to) when the shown instant lies
 * within one window of it, so playhead and loop are both on the bar;
 * otherwise -- the chart scrubbed deep into an archive -- at the shown instant.
 */
export function initialChartTimeWindowEnd(
  timeline: ChartTimeline,
  position: number
): number {
  const newest = chartTimelinePosition(timeline, null);
  const span = chartTimeWindowSpan(timeline, newest);
  return newest - position <= span ? Math.max(newest, position) : position;
}

/**
 * Where the window ends after the shown instant moved to `position`: it stays
 * put while the instant is inside it, and follows the instant out either end.
 */
export function chartTimeWindowEnd(
  timeline: ChartTimeline,
  end: number,
  position: number
): number {
  const window = chartTimeWindow(timeline, end);
  if (position > window.max) {
    return position;
  }
  if (position < window.min) {
    return Math.min(
      timeline.max,
      position + chartTimeWindowSpan(timeline, position)
    );
  }
  return end;
}

/** The loop a chart opens with: the last hour of frames up to the newest. */
export const DEFAULT_CHART_TIME_LOOP: ChartTimeLoopOffsets = {
  start: 3600000,
  end: 0
};

/**
 * Loop bounds on the timeline for offsets before `latest` (an instant, in
 * ms): each end lands on the frame at (or nearest) that time, and never
 * outside `window`.
 */
export function chartTimeLoopFromOffsets(
  timeline: ChartTimeline,
  window: { min: number; max: number },
  latest: number,
  offsets: ChartTimeLoopOffsets
): { min: number; max: number } {
  const at = (before: number) => {
    const raw = chartTimelinePosition(
      timeline,
      new Date(latest - before).toISOString()
    );
    // Through the instant and back, so a range position lands on the grid.
    const snapped = chartTimelinePosition(
      timeline,
      chartTimelineInstant(timeline, raw)
    );
    return Math.min(window.max, Math.max(window.min, snapped));
  };
  const min = at(Math.max(0, offsets.start));
  const max = at(Math.max(0, offsets.end));
  if (min < max) {
    return { min, max };
  }
  // The remembered range lies clear of this window (both ends clamped onto
  // the same edge): fall back to the window's own last hour.
  const end = chartTimeMs(chartTimelineInstant(timeline, window.max));
  const start = chartTimelinePosition(
    timeline,
    chartTimelineInstant(
      timeline,
      chartTimelinePosition(
        timeline,
        new Date(end - DEFAULT_CHART_TIME_LOOP.start).toISOString()
      )
    )
  );
  return { min: Math.max(window.min, start), max: window.max };
}

/** Offsets before `latest` for loop bounds on the timeline. */
export function chartTimeLoopToOffsets(
  timeline: ChartTimeline,
  latest: number,
  loop: { min: number; max: number }
): ChartTimeLoopOffsets {
  const ms = (position: number) =>
    chartTimeMs(chartTimelineInstant(timeline, position));
  return {
    start: Math.max(0, latest - ms(loop.min)),
    end: Math.max(0, latest - ms(loop.max))
  };
}

/**
 * The frames playback loops over: the chosen loop bounds (timeline positions,
 * either unset) clamped into the slider window, or the whole window when they
 * are unset or the window has moved clear of them.
 */
export function chartTimeLoopRange(
  window: { min: number; max: number },
  loopStart: number | null,
  loopEnd: number | null
): { min: number; max: number } {
  const start = loopStart ?? window.min;
  const end = loopEnd ?? window.max;
  if (start > window.max || end < window.min || start > end) {
    return window;
  }
  return {
    min: Math.max(window.min, start),
    max: Math.min(window.max, end)
  };
}

/** Compact label for a frame cadence in ms, e.g. "5 min", "1 h", "6 h 30 min". */
export function chartTimeStepLabel(stepMs: number): string {
  const minutes = Math.round(stepMs / 60000);
  if (minutes < 1) {
    return `${Math.round(stepMs / 1000)} s`;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) {
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} d ${rh} h` : `${d} d`;
}

/**
 * Readout for an instant: local date and time to the minute, or "Live" for
 * the live frame. `dateStyle` picks the spelled-out ("Sep 18, 2026") form for
 * the playhead readout, or the region's short numeric one ("9/18/26") for
 * everything else.
 */
export function chartTimeLabel(
  time: string | null,
  dateStyle: 'medium' | 'short' = 'medium'
): string {
  if (time === null) {
    return 'Live';
  }
  const d = new Date(time);
  if (!Number.isFinite(d.valueOf())) {
    return time;
  }
  return d.toLocaleString(undefined, { dateStyle, timeStyle: 'short' });
}

/** Short-form {@link chartTimeLabel}, for range captions and tooltips. */
export function chartTimeShortLabel(time: string | null): string {
  return chartTimeLabel(time, 'short');
}

/**
 * Modeless, draggable time control for a time-varying chart: scrub over the
 * frames the chart's time dimension describes, step and play through them,
 * and return to the live frame. Every move is applied to the map as it
 * happens; the selection is session state, so closing the palette leaves the
 * chart on the frame it was scrubbed to (the chart list marks it as not
 * live) and only stops playback.
 */
@Component({
  selector: 'ap-chart-time-dialog',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    ChartTimeBar,
    CdkDrag,
    CdkDragHandle
  ],
  styles: `
    /* Compact select: the palette is 320px wide and this shares a row.
       ::ng-deep reaches the form field's own DOM, as the Feature Browser's
       search field does. */
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
  `,
  template: `
    <div
      class="_ap-chart-time"
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
        <mat-icon style="opacity:0.6;">schedule</mat-icon>
        <div
          style="
            flex: 1 1 auto;
            min-width: 0;
            padding-left: 8px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          "
          [title]="data.text"
        >
          {{ data.text }}
        </div>
        <button mat-icon-button aria-label="Close" (click)="handleClose()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div
        style="padding: 0 16px; font-size: 12px; opacity: 0.7; margin-top: -4px;"
      >
        {{ rangeText() }}
      </div>

      <div
        style="padding: 6px 16px 0; font-size: 15px; font-weight: 500;"
        aria-live="polite"
      >
        {{ valueText() }}
      </div>

      @if (timeline) {
        <ap-chart-time-bar
          style="padding: 4px 4px 0"
          [min]="window().min"
          [max]="window().max"
          [step]="timeline.step"
          [position]="position()"
          [loop]="loopRange()"
          [label]="thumbLabel"
          (positionChange)="onScrub($event)"
          (loopChange)="onLoop($event)"
        />
        <div
          style="display: flex; align-items: center; gap: 6px; padding: 2px 16px 0 12px; font-size: 11px;"
        >
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
              panelClass="_ap-speed-panel"
            >
              <mat-option value="slow">Slow</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="fast">Fast</mat-option>
              <mat-option value="xfast">X-fast</mat-option>
            </mat-select>
          </mat-form-field>
          <span style="flex: 1 1 auto; text-align: right; opacity: 0.7">{{
            loopText()
          }}</span>
        </div>
      }

      <mat-dialog-actions style="min-height: 38px; padding: 0 8px 2px;">
        <button
          mat-icon-button
          aria-label="Previous frame"
          matTooltip="Previous frame"
          [disabled]="!timeline"
          (click)="step(-1)"
        >
          <mat-icon>navigate_before</mat-icon>
        </button>
        <button
          mat-icon-button
          [attr.aria-label]="playing() ? 'Pause' : 'Play'"
          [matTooltip]="playing() ? 'Pause' : 'Play'"
          [disabled]="!timeline"
          (click)="togglePlay()"
        >
          <mat-icon>{{ playing() ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>
        <button
          mat-icon-button
          aria-label="Next frame"
          matTooltip="Next frame"
          [disabled]="!timeline || (data.value() === null && current)"
          (click)="step(1)"
        >
          <mat-icon>navigate_next</mat-icon>
        </button>
        <span style="flex: 1 1 auto"></span>
        @if (current) {
          <button
            mat-button
            matTooltip="Return to the live frame"
            [disabled]="data.value() === null"
            (click)="goLive()"
          >
            NOW
          </button>
        }
      </mat-dialog-actions>
    </div>
  `
})
export class ChartTimeDialog implements OnDestroy {
  protected dialogRef = inject(MatDialogRef<ChartTimeDialog, void>);
  protected data = inject<ChartTimeDialogData>(MAT_DIALOG_DATA);

  protected readonly timeline: ChartTimeline | null = chartTimeline(
    this.data.dimension
  );
  // Whether the source serves a live frame, so "live" is somewhere to go.
  protected readonly current = this.data.dimension?.current !== false;

  protected playing = signal(false);
  protected speed = signal<ChartTimePlaybackSpeed>('medium');
  private playTimer?: ReturnType<typeof setInterval>;

  protected position = computed(() =>
    this.timeline ? chartTimelinePosition(this.timeline, this.data.value()) : 0
  );

  // Timeline position the bar's window ends at. It opens at the newest frame
  // when the shown instant is near it (else at the shown instant) and follows
  // the instant when it leaves the window -- by stepping, playback or an
  // extension retargeting it.
  private windowEnd = signal(
    this.timeline
      ? initialChartTimeWindowEnd(this.timeline, this.position())
      : 0
  );

  protected window = computed(() =>
    this.timeline
      ? chartTimeWindow(this.timeline, this.windowEnd())
      : { min: 0, max: 0 }
  );

  // Stable reference so cdkDragFreeDragPosition isn't re-applied (and the
  // palette reset to origin) on every change-detection pass.
  protected initialPosition: PalettePosition = this.data.position ?? {
    x: 0,
    y: 0
  };

  // The newest frame when the palette opened, in ms: what the remembered loop
  // offsets are measured back from -- never the shown instant, or reopening
  // while scrubbed would shift the remembered range.
  private latestMs = this.timeline
    ? chartTimeMs(
        chartTimelineInstant(
          this.timeline,
          chartTimelinePosition(this.timeline, null)
        )
      )
    : 0;

  // Loop bounds as timeline positions, opening on the remembered range (the
  // last hour by default) measured back from the newest frame.
  private loopStart = signal<number | null>(this.initialLoop().min);
  private loopEnd = signal<number | null>(this.initialLoop().max);

  protected loopRange = computed(() =>
    chartTimeLoopRange(this.window(), this.loopStart(), this.loopEnd())
  );
  protected loopText = computed(() => {
    const range = this.loopRange();
    return this.timeline
      ? `${chartTimeShortLabel(chartTimelineInstant(this.timeline, range.min))} → ` +
          chartTimeShortLabel(chartTimelineInstant(this.timeline, range.max))
      : '';
  });

  protected valueText = computed(() => chartTimeLabel(this.data.value()));

  protected thumbLabel = (position: number): string =>
    this.timeline
      ? chartTimeShortLabel(chartTimelineInstant(this.timeline, position))
      : '';

  constructor() {
    // The trigger is the shown instant; moving the window is the side effect
    // (see the lessons log on effects that write and read the same signal).
    effect(() => {
      const position = this.position();
      untracked(() => {
        if (this.timeline) {
          this.windowEnd.set(
            chartTimeWindowEnd(this.timeline, this.windowEnd(), position)
          );
        }
      });
    });
  }

  ngOnDestroy() {
    this.stopPlayback();
  }

  /** The frame cadence, for the caption; the range itself is on the bar. */
  protected rangeText(): string {
    if (!this.timeline) {
      return 'no frames advertised';
    }
    if (this.timeline.frames) {
      return `${this.timeline.frames.length} frames`;
    }
    return `every ${chartTimeStepLabel(this.timeline.step)}`;
  }

  protected onScrub(position: number) {
    if (!this.timeline) {
      return;
    }
    this.stopPlayback();
    this.data.onChange(chartTimelineInstant(this.timeline, position));
  }

  protected step(direction: -1 | 1) {
    if (!this.timeline) {
      return;
    }
    this.stopPlayback();
    this.data.onChange(
      stepChartTime(this.timeline, this.data.value(), direction, this.current)
    );
  }

  protected onLoop(loop: ChartTimeLoop) {
    this.loopStart.set(loop.min);
    this.loopEnd.set(loop.max);
    if (this.timeline && typeof this.data.onLoopChange === 'function') {
      this.data.onLoopChange(
        chartTimeLoopToOffsets(this.timeline, this.latestMs, loop)
      );
    }
  }

  protected onDragEnded(e: CdkDragEnd) {
    if (typeof this.data?.onMoved === 'function') {
      this.data.onMoved(e.source.getFreeDragPosition());
    }
  }

  /** The remembered (or default) loop for the window the palette opened on. */
  private initialLoop(): { min: number; max: number } {
    return this.timeline
      ? chartTimeLoopFromOffsets(
          this.timeline,
          this.window(),
          this.latestMs,
          this.data.loop ?? DEFAULT_CHART_TIME_LOOP
        )
      : { min: 0, max: 0 };
  }

  protected goLive() {
    this.stopPlayback();
    this.data.onChange(null);
  }

  protected togglePlay() {
    if (this.playing()) {
      this.stopPlayback();
      return;
    }
    if (!this.timeline) {
      return;
    }
    this.playing.set(true);
    this.tick();
    this.startTimer();
  }

  protected setSpeed(speed: ChartTimePlaybackSpeed) {
    this.speed.set(speed);
    // A running loop picks the new pace up at once, without skipping a frame.
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

  /** One playback step over the loop (by default the frames the bar shows). */
  private tick() {
    if (this.timeline) {
      this.data.onChange(
        nextChartPlaybackTime(
          this.timeline,
          this.data.value(),
          this.loopRange()
        )
      );
    }
  }

  private stopPlayback() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = undefined;
    }
    this.playing.set(false);
  }

  protected handleClose() {
    this.dialogRef.close();
  }
}
