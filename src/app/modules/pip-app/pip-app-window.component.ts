import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  GestureMode,
  PxRect,
  boundedGesture,
  clampToViewport,
  fromFractions,
  toFractions
} from './geometry';
import { PipAppService } from './pip-app.service';
import { PipAppDef } from './types';

interface ActiveGesture {
  pointerId: number;
  mode: GestureMode;
  startX: number;
  startY: number;
  start: PxRect;
  current: PxRect;
  target: HTMLElement;
}

/**
 * One PiP App window: a title bar to drag, eight resize handles and the
 * embedded app. The iframe is created once per source and never re-parented
 * or re-bound while the window moves, resizes or restacks, so the embedded
 * app keeps running (and keeps its state) throughout.
 */
@Component({
  selector: 'fb-pip-app',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fb-pip-app__bar"
      [class.front]="front()"
      (pointerdown)="startGesture($event, 'move')"
    >
      <span class="fb-pip-app__title" [title]="def().title">{{
        def().title
      }}</span>
      @if (url()) {
        <a
          mat-icon-button
          class="fb-pip-app__btn"
          [href]="url()"
          target="_blank"
          rel="noopener noreferrer"
          matTooltip="Open in new tab"
          aria-label="Open in new tab"
        >
          <mat-icon>open_in_new</mat-icon>
        </a>
      }
      <button
        mat-icon-button
        class="fb-pip-app__btn"
        matTooltip="Close"
        aria-label="Close"
        (click)="closed.emit(def().id)"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <div class="fb-pip-app__body">
      @if (safeUrl(); as src) {
        <iframe
          [src]="src"
          [title]="def().title"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allow="fullscreen"
        ></iframe>
      } @else {
        <div class="fb-pip-app__error">This address cannot be shown.</div>
      }
    </div>
    @for (m of resizeModes; track m) {
      <div
        class="fb-pip-app__handle"
        [attr.data-mode]="m"
        (pointerdown)="startGesture($event, m)"
      ></div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      box-sizing: border-box;
      background: #fafafa;
      border: 1px solid rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      overflow: visible;
    }
    :host-context(.dark-theme) {
      background: #303030;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .fb-pip-app__bar {
      flex: 0 0 32px;
      height: 32px;
      display: flex;
      align-items: center;
      gap: 2px;
      padding-left: 8px;
      cursor: grab;
      touch-action: none;
      user-select: none;
      border-radius: 6px 6px 0 0;
      background: #e0e0e0;
      color: rgba(0, 0, 0, 0.87);
    }
    .fb-pip-app__bar.front {
      background: #c5cae9;
    }
    :host-context(.dark-theme) .fb-pip-app__bar {
      background: #424242;
      color: #fff;
    }
    :host-context(.dark-theme) .fb-pip-app__bar.front {
      background: #3949ab;
    }
    .fb-pip-app__title {
      flex: 1 1 auto;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
      font-weight: 500;
    }
    .fb-pip-app__btn {
      --mat-icon-button-state-layer-size: 28px;
      width: 28px;
      height: 28px;
      padding: 2px;
      cursor: pointer;
    }
    .fb-pip-app__btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .fb-pip-app__body {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    .fb-pip-app__body iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    .fb-pip-app__error {
      padding: 12px;
      font-size: 13px;
    }
    .fb-pip-app__handle {
      position: absolute;
      touch-action: none;
      --edge: 10px;
    }
    @media (pointer: coarse) {
      .fb-pip-app__handle {
        --edge: 16px;
      }
    }
    .fb-pip-app__handle[data-mode='n'],
    .fb-pip-app__handle[data-mode='s'] {
      left: var(--edge);
      right: var(--edge);
      height: var(--edge);
      cursor: ns-resize;
    }
    .fb-pip-app__handle[data-mode='e'],
    .fb-pip-app__handle[data-mode='w'] {
      top: var(--edge);
      bottom: var(--edge);
      width: var(--edge);
      cursor: ew-resize;
    }
    .fb-pip-app__handle[data-mode='n'] {
      top: calc(var(--edge) / -2);
    }
    .fb-pip-app__handle[data-mode='s'] {
      bottom: calc(var(--edge) / -2);
    }
    .fb-pip-app__handle[data-mode='e'] {
      right: calc(var(--edge) / -2);
    }
    .fb-pip-app__handle[data-mode='w'] {
      left: calc(var(--edge) / -2);
    }
    .fb-pip-app__handle[data-mode='ne'],
    .fb-pip-app__handle[data-mode='nw'],
    .fb-pip-app__handle[data-mode='se'],
    .fb-pip-app__handle[data-mode='sw'] {
      width: calc(var(--edge) * 1.5);
      height: calc(var(--edge) * 1.5);
    }
    .fb-pip-app__handle[data-mode='ne'] {
      top: calc(var(--edge) / -2);
      right: calc(var(--edge) / -2);
      cursor: nesw-resize;
    }
    .fb-pip-app__handle[data-mode='sw'] {
      bottom: calc(var(--edge) / -2);
      left: calc(var(--edge) / -2);
      cursor: nesw-resize;
    }
    .fb-pip-app__handle[data-mode='nw'] {
      top: calc(var(--edge) / -2);
      left: calc(var(--edge) / -2);
      cursor: nwse-resize;
    }
    .fb-pip-app__handle[data-mode='se'] {
      bottom: calc(var(--edge) / -2);
      right: calc(var(--edge) / -2);
      cursor: nwse-resize;
    }
  `,
  host: {
    class: 'fb-pip-app',
    '[attr.data-pip-id]': 'def().id',
    '[style.z-index]': 'z()',
    '(pointerdown)': 'focused.emit(def().id)'
  }
})
export class PipAppWindowComponent implements OnDestroy {
  readonly def = input.required<PipAppDef>();
  readonly z = input(1);
  readonly front = input(false);
  readonly focused = output<string>();
  readonly closed = output<string>();

  protected readonly resizeModes: GestureMode[] = [
    'n',
    's',
    'e',
    'w',
    'ne',
    'nw',
    'se',
    'sw'
  ];

  private service = inject(PipAppService);
  private sanitizer = inject(DomSanitizer);
  private zone = inject(NgZone);
  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

  /** Absolute URL, compared by value so layout changes never reload it. */
  protected readonly url = computed(() =>
    this.service.resolveUrl(this.def().source)
  );
  protected readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    const u = this.url();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  /** Stored layout in pixels, kept inside the current viewport. */
  readonly rect = computed(() => {
    const vp = this.service.viewport();
    return clampToViewport(fromFractions(this.def().rect, vp), vp);
  });

  private gesture: ActiveGesture | null = null;
  private frame = 0;

  constructor() {
    // Layout is written straight to the element so a gesture can update it
    // per frame without change detection; between gestures this effect keeps
    // it in step with the stored layout and the viewport.
    effect(() => {
      const r = this.rect();
      if (!this.gesture) this.applyRect(r);
    });
  }

  ngOnDestroy() {
    this.endGesture();
  }

  protected startGesture(e: PointerEvent, mode: GestureMode) {
    if (this.gesture) return;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const target = e.currentTarget as HTMLElement;
    if (mode === 'move' && (e.target as HTMLElement).closest('a, button')) {
      return;
    }
    e.preventDefault();
    const start = this.rect();
    this.gesture = {
      pointerId: e.pointerId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start,
      current: start,
      target
    };
    target.setPointerCapture?.(e.pointerId);
    this.service.gestureActive.set(true);
    this.zone.runOutsideAngular(() => {
      target.addEventListener('pointermove', this.onMove);
      target.addEventListener('pointerup', this.onEnd);
      target.addEventListener('pointercancel', this.onEnd);
      target.addEventListener('lostpointercapture', this.onEnd);
    });
  }

  private onMove = (e: PointerEvent) => {
    const g = this.gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    g.current = boundedGesture(
      g.start,
      g.mode,
      e.clientX - g.startX,
      e.clientY - g.startY,
      this.service.viewport()
    );
    if (!this.frame) {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        if (this.gesture) this.applyRect(this.gesture.current);
      });
    }
  };

  private onEnd = (e: PointerEvent) => {
    if (this.gesture && e.pointerId === this.gesture.pointerId) {
      this.zone.run(() => this.endGesture(true));
    }
  };

  private endGesture(commit = false) {
    const g = this.gesture;
    if (!g) return;
    this.gesture = null;
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    g.target.removeEventListener('pointermove', this.onMove);
    g.target.removeEventListener('pointerup', this.onEnd);
    g.target.removeEventListener('pointercancel', this.onEnd);
    g.target.removeEventListener('lostpointercapture', this.onEnd);
    if (g.target.hasPointerCapture?.(g.pointerId)) {
      g.target.releasePointerCapture(g.pointerId);
    }
    this.service.gestureActive.set(false);
    if (commit && g.current !== g.start) {
      this.service.setRect(
        this.def().id,
        toFractions(g.current, this.service.viewport())
      );
    }
    this.applyRect(commit ? g.current : this.rect());
  }

  private applyRect(r: PxRect) {
    this.el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)`;
    this.el.style.width = `${Math.round(r.w)}px`;
    this.el.style.height = `${Math.round(r.h)}px`;
  }
}
