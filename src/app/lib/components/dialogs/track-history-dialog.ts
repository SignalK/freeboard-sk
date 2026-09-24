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
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';

import { ChartTimeBar, ChartTimeLoop } from './chart-time-bar';
import { chartTimeShortLabel } from './chart-time-dialog';
import { PalettePosition } from 'src/app/types';
// type-only: the service opens this palette, so a value import would be a cycle
import type { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import {
  HistoryPreset,
  historyAxis,
  loopToRange,
  rangeToLoop
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
 * whose history is shown, and the one time range shown for all of them, as
 * quick choices and as a from/to range bar over the whole recorded span.
 * Closing it hides every history layer.
 */
@Component({
  selector: 'ap-track-history-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ChartTimeBar,
    CdkDrag,
    CdkDragHandle
  ],
  styles: `
    .presets {
      display: flex;
      gap: 4px;
      padding: 4px 12px 0;
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
      padding: 6px 12px 0;
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

      <div
        style="padding: 0 16px; font-size: 12px; opacity: 0.8;"
        aria-live="polite"
      >
        {{ rangeText() }}
      </div>

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

      <ap-chart-time-bar
        style="padding: 4px 4px 0"
        [min]="axis().min"
        [max]="axis().max"
        [step]="axis().step"
        [position]="null"
        [loop]="loop()"
        [label]="thumbLabel"
        [names]="handleNames"
        (loopChange)="onLoop($event)"
      />

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

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected onLoop(loop: ChartTimeLoop) {
    this.history.setRange(loopToRange(loop, this.axis()));
  }

  protected onDragEnded(e: CdkDragEnd) {
    this.data.onMoved?.(e.source.getFreeDragPosition());
  }
}
