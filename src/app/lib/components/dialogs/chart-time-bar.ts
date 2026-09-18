import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output
} from '@angular/core';

/** Loop bounds on the bar, as positions on its axis. */
export interface ChartTimeLoop {
  min: number;
  max: number;
}

/** Which handle a pointer gesture is moving. */
type BarHandle = 'head' | 'start' | 'end';

/** Height of the playhead lane; pointers below it work the loop handles. */
const HEAD_LANE_PX = 30;

/**
 * Snap a position to the `min + n·step` grid the axis is drawn on, clamped
 * into `[min, max]`.
 */
export function snapBarPosition(
  position: number,
  min: number,
  max: number,
  step: number
): number {
  const snapped = min + Math.round((position - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/**
 * The loop after one of its handles is dragged to `position`: the handles
 * cannot cross, so a start dragged past the end pushes the end along, and
 * vice versa.
 */
export function moveLoopHandle(
  loop: ChartTimeLoop,
  handle: 'start' | 'end',
  position: number
): ChartTimeLoop {
  return handle === 'start'
    ? { min: position, max: Math.max(loop.max, position) }
    : { min: Math.min(loop.min, position), max: position };
}

/**
 * Scrub-and-loop bar for a time-varying chart: one axis (the slider window)
 * carrying the playhead on its upper lane and the loop-edge handles on its
 * lower lane, with the loop shaded between them. Dragging in the upper lane
 * scrubs; dragging in the lower lane moves the nearer loop handle. The
 * playhead is free to leave the loop — the loop only says where playback
 * cycles. Positions are whatever the parent's axis uses (ms, or frame index);
 * `label` renders one for the tooltips.
 */
@Component({
  selector: 'ap-chart-time-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bar"
      role="group"
      aria-label="Time scrub and loop bar"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
    >
      <div class="axis">
        <div class="track"></div>
        <div
          class="band"
          [style.left.%]="loopPct().min"
          [style.width.%]="loopPct().max - loopPct().min"
        ></div>
        <div
          class="edge"
          [style.left.%]="loopPct().min"
          [title]="'Loop start: ' + label()(loop().min)"
        >
          <div class="knob"></div>
        </div>
        <div
          class="edge"
          [style.left.%]="loopPct().max"
          [title]="'Loop end: ' + label()(loop().max)"
        >
          <div class="knob"></div>
        </div>
        <div
          class="head"
          [style.left.%]="headPct()"
          [title]="label()(position())"
        >
          <div class="knob"></div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      --bar-track: rgba(0, 0, 0, 0.18);
      --bar-band: rgba(79, 148, 212, 0.28);
      --bar-head: #1f4e8c;
      --bar-edge: #f2b84b;
      --bar-knob-shadow: rgba(0, 0, 0, 0.35);
    }
    :host-context(.dark-theme) {
      --bar-track: rgba(255, 255, 255, 0.22);
      --bar-band: rgba(127, 212, 255, 0.24);
      --bar-head: #3b7ddb;
      --bar-knob-shadow: rgba(0, 0, 0, 0.6);
    }
    .bar {
      position: relative;
      height: 52px;
      user-select: none;
      touch-action: none;
      cursor: pointer;
    }
    /* Inset so a handle at either end stays inside the host. */
    .axis {
      position: absolute;
      inset: 0 12px;
    }
    .track {
      position: absolute;
      left: 0;
      right: 0;
      top: 13px;
      height: 4px;
      border-radius: 2px;
      background: var(--bar-track);
    }
    /* From the top of the playhead lane down to the bottom of the loop knobs. */
    .band {
      position: absolute;
      top: 4px;
      height: 48px;
      background: var(--bar-band);
      border-radius: 3px;
      pointer-events: none;
    }
    /* Loop edge: a line from the track down to a draggable knob on the lower
       lane, drawn like the playhead so it reads as something to move. */
    .edge {
      position: absolute;
      top: 13px;
      height: 30px;
      width: 2px;
      margin-left: -1px;
      background: var(--bar-edge);
      pointer-events: none;
    }
    .edge .knob {
      top: auto;
      bottom: -9px;
      background: var(--bar-edge);
    }
    .head {
      position: absolute;
      top: 0;
      height: 30px;
      width: 2px;
      margin-left: -1px;
      background: var(--bar-head);
      pointer-events: none;
    }
    .knob {
      position: absolute;
      top: 6px;
      left: 50%;
      width: 18px;
      height: 18px;
      margin-left: -9px;
      border-radius: 50%;
      background: var(--bar-head);
      box-shadow: 0 1px 4px var(--bar-knob-shadow);
    }
  `
})
export class ChartTimeBar {
  /** Axis range (the slider window) and the grid it snaps to. */
  min = input.required<number>();
  max = input.required<number>();
  step = input.required<number>();
  /** Playhead position on the axis. */
  position = input.required<number>();
  /** Loop bounds on the axis. */
  loop = input.required<ChartTimeLoop>();
  /** Label for a position, for the handle tooltips. */
  label = input<(position: number) => string>(() => '');

  positionChange = output<number>();
  loopChange = output<ChartTimeLoop>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private dragging: BarHandle | null = null;

  protected headPct = computed(() => this.pct(this.position()));
  protected loopPct = computed(() => ({
    min: this.pct(this.loop().min),
    max: this.pct(this.loop().max)
  }));

  private pct(position: number): number {
    const span = this.max() - this.min();
    if (span <= 0) {
      return 0;
    }
    const f = (position - this.min()) / span;
    return Math.min(100, Math.max(0, f * 100));
  }

  /** Axis position under a pointer, snapped to the grid. */
  private positionAt(e: PointerEvent): number {
    const axis = this.host.nativeElement.querySelector('.axis');
    const rect = (axis ?? this.host.nativeElement).getBoundingClientRect();
    const f = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    const raw =
      this.min() + Math.min(1, Math.max(0, f)) * (this.max() - this.min());
    return snapBarPosition(raw, this.min(), this.max(), this.step());
  }

  protected onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') {
      return;
    }
    const bar = e.currentTarget as HTMLElement;
    const laneY = e.clientY - bar.getBoundingClientRect().top;
    if (laneY < HEAD_LANE_PX) {
      this.dragging = 'head';
    } else {
      // The nearer loop handle takes the gesture.
      const at = this.positionAt(e);
      const { min, max } = this.loop();
      this.dragging =
        Math.abs(at - min) <= Math.abs(at - max) ? 'start' : 'end';
    }
    bar.setPointerCapture(e.pointerId);
    this.apply(e);
    e.preventDefault();
  }

  protected onPointerMove(e: PointerEvent) {
    if (this.dragging) {
      this.apply(e);
    }
  }

  protected onPointerUp(e: PointerEvent) {
    if (!this.dragging) {
      return;
    }
    this.dragging = null;
    const bar = e.currentTarget as HTMLElement;
    if (bar.hasPointerCapture(e.pointerId)) {
      bar.releasePointerCapture(e.pointerId);
    }
  }

  private apply(e: PointerEvent) {
    const at = this.positionAt(e);
    if (this.dragging === 'head') {
      if (at !== this.position()) {
        this.positionChange.emit(at);
      }
      return;
    }
    if (this.dragging) {
      const next = moveLoopHandle(this.loop(), this.dragging, at);
      const current = this.loop();
      if (next.min !== current.min || next.max !== current.max) {
        this.loopChange.emit(next);
      }
    }
  }
}
