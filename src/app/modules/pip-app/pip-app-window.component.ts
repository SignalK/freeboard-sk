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
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DEFAULT_LIMITS,
  GestureMode,
  PxRect,
  boundedGesture,
  clampToViewport,
  fromFractions,
  toFractions
} from './geometry';
import { PipAppPopoutService } from './pip-app-popout.service';
import { PipAppService } from './pip-app.service';
import { PipAppDef } from './types';

/** Title bar plus the 1px top and bottom border. */
const COLLAPSED_HEIGHT = DEFAULT_LIMITS.barH + 2;

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
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fb-pip-app__bar"
      [class.front]="front()"
      (pointerdown)="startGesture($event, 'move')"
      (dblclick)="onBarDoubleClick($event)"
    >
      <span class="fb-pip-app__title" [title]="def().title">{{
        def().title
      }}</span>
      <button
        mat-icon-button
        class="fb-pip-app__btn"
        [matTooltip]="def().collapsed ? 'Expand' : 'Collapse'"
        [attr.aria-label]="def().collapsed ? 'Expand' : 'Collapse'"
        (click)="toggleCollapsed()"
      >
        <mat-icon>{{
          def().collapsed ? 'expand_more' : 'expand_less'
        }}</mat-icon>
      </button>
      <button
        mat-icon-button
        class="fb-pip-app__btn"
        matTooltip="More"
        aria-label="More"
        [matMenuTriggerFor]="moremenu"
      >
        <mat-icon>more_vert</mat-icon>
      </button>
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
    <mat-menu #moremenu="matMenu" xPosition="before">
      @if (url()) {
        <a
          mat-menu-item
          [href]="url()"
          target="_blank"
          rel="noopener noreferrer"
        >
          <mat-icon>open_in_new</mat-icon>
          <span>Open in new tab</span>
        </a>
        <mat-divider></mat-divider>
      }
      @if (url()) {
        @if (isOut()) {
          <button mat-menu-item (click)="popIn()">
            <mat-icon>open_in_browser</mat-icon>
            <span>Bring back</span>
          </button>
        } @else {
          <button mat-menu-item (click)="popOut()">
            <mat-icon>launch</mat-icon>
            <span>{{
              popout.alwaysOnTop
                ? 'Pop out, always on top'
                : 'Pop out to a window'
            }}</span>
          </button>
        }
        <mat-divider></mat-divider>
      }
      @for (o of opacities; track o) {
        <button
          mat-menu-item
          [attr.aria-checked]="def().opacity === o"
          role="menuitemradio"
          (click)="setOpacity(o)"
        >
          <mat-icon>{{
            def().opacity === o
              ? 'radio_button_checked'
              : 'radio_button_unchecked'
          }}</mat-icon>
          <span>Opacity {{ o * 100 }}%</span>
        </button>
      }
    </mat-menu>
    <div class="fb-pip-app__body">
      @if (isOut()) {
        <div class="fb-pip-app__out">
          @if (outMode() === 'popup') {
            <p>
              Shown in a separate window. Close that window before bringing the
              app back here.
            </p>
          } @else {
            <p>Shown in a picture-in-picture window.</p>
          }
          <button mat-stroked-button (click)="popIn()">Bring back</button>
        </div>
      } @else if (safeUrl(); as src) {
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
    .fb-pip-app__out {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      box-sizing: border-box;
      text-align: center;
      font-size: 13px;
    }
    .fb-pip-app__error {
      padding: 12px;
      font-size: 13px;
    }
    :host(.collapsed) .fb-pip-app__body {
      visibility: hidden;
    }
    :host(.collapsed) .fb-pip-app__bar {
      border-radius: 6px;
    }
    :host(.collapsed) .fb-pip-app__handle {
      display: none;
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
    '[class.collapsed]': 'def().collapsed',
    '[style.z-index]': 'z()',
    '[style.opacity]': 'def().opacity',
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

  protected readonly opacities = [1, 0.8, 0.6, 0.4];

  private service = inject(PipAppService);
  protected popout = inject(PipAppPopoutService);
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

  /** What is on screen: a collapsed window is only its title bar. */
  private readonly drawn = computed(() => {
    const r = this.rect();
    return this.def().collapsed ? { ...r, h: COLLAPSED_HEIGHT } : r;
  });

  private gesture: ActiveGesture | null = null;
  private frame = 0;

  constructor() {
    // Layout is written straight to the element so a gesture can update it
    // per frame without change detection; between gestures this effect keeps
    // it in step with the stored layout and the viewport.
    effect(() => {
      const r = this.drawn();
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
    const start = this.drawn();
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
      const vp = this.service.viewport();
      const f = toFractions(g.current, vp);
      // A collapsed window only moves; keep the size it expands back to.
      const { w, h } = this.def().collapsed ? this.def().rect : f;
      this.service.setRect(this.def().id, { x: f.x, y: f.y, w, h });
    }
    this.applyRect(commit ? g.current : this.drawn());
  }

  /** True while this window is shown outside the page. */
  protected readonly outMode = computed(() => this.popout.modeOf(this.def()));
  protected readonly isOut = computed(() => !!this.outMode());

  protected popOut() {
    const r = this.rect();
    this.popout.popOut(this.def(), { w: r.w, h: r.h });
  }

  protected popIn() {
    this.popout.popIn(this.def().id);
  }

  protected toggleCollapsed() {
    this.service.setCollapsed(this.def().id, !this.def().collapsed);
  }

  protected setOpacity(o: number) {
    this.service.setOpacity(this.def().id, o);
  }

  protected onBarDoubleClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a, button')) return;
    this.toggleCollapsed();
  }

  private applyRect(r: PxRect) {
    this.el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)`;
    this.el.style.width = `${Math.round(r.w)}px`;
    this.el.style.height = `${Math.round(r.h)}px`;
  }
}
