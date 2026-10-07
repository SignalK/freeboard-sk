import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlotterExtensionService } from '../plotterext.service';
import {
  DEFAULT_LIMITS,
  GestureMode,
  PxRect,
  boundedGesture
} from './geometry';
import { ExtWindowService } from './window.service';
import { ExtWindow } from './types';

const COLLAPSED_HEIGHT = DEFAULT_LIMITS.barH;

/**
 * How long an auto-hiding title bar stays after it was last used: long enough
 * to read the title and reach a button, the same idle time video players and
 * full-screen system bars use before getting out of the way.
 */
export const BAR_HIDE_DELAY_MS = 3000;
/** Grace after a mouse leaves the bar, so a pass over its edge does not flicker. */
export const BAR_LEAVE_DELAY_MS = 1000;

/** What keeps an auto-hiding title bar shown. */
type BarHold = 'hover' | 'gesture' | 'menu' | 'focus';

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
 * One extension window: a title bar the host owns, the extension's panel as a
 * bus-connected `window` context, and eight resize handles. The close control
 * always works, whatever the extension does, so a broken extension can still
 * be closed (or hidden, when it asked for `userClose: 'hide'`). With
 * `titleBar: 'autoHide'` the bar floats over the panel and fades when idle; a
 * grip at the top brings it back.
 *
 * The iframe is created once and never re-parented or re-bound while the
 * window moves, resizes, restacks, collapses or hides, so the panel keeps
 * running (and keeps its state) throughout.
 */
@Component({
  selector: 'fb-pe-window',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (autoHide()) {
      <button
        class="fb-pe-window__grip"
        aria-label="Show title bar"
        [attr.tabindex]="barShown() ? -1 : 0"
        (pointerenter)="onHoverReveal($event)"
        (pointerdown)="revealBar(); startGesture($event, 'move')"
        (click)="revealBar()"
      ></button>
    }
    <div
      class="fb-pe-window__bar"
      [class.front]="front()"
      (pointerenter)="onBarEnter($event)"
      (pointerleave)="onBarLeave($event)"
      (pointerdown)="revealBar(); startGesture($event, 'move')"
      (dblclick)="onBarDoubleClick($event)"
    >
      <span class="fb-pe-window__title" [title]="def().title">{{
        def().title
      }}</span>
      @if (!def().modal) {
        <button
          mat-icon-button
          class="fb-pe-window__btn"
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
          class="fb-pe-window__btn"
          matTooltip="More"
          aria-label="More"
          [matMenuTriggerFor]="moremenu"
          (menuOpened)="holdBar('menu')"
          (menuClosed)="releaseBar('menu')"
        >
          <mat-icon>more_vert</mat-icon>
        </button>
      }
      <button
        mat-icon-button
        class="fb-pe-window__btn"
        [matTooltip]="hides() ? 'Hide' : 'Close'"
        [attr.aria-label]="hides() ? 'Hide' : 'Close'"
        (click)="windows.userClose(def().id)"
      >
        <mat-icon>{{ hides() ? 'remove' : 'close' }}</mat-icon>
      </button>
    </div>
    <mat-menu #moremenu="matMenu" xPosition="before">
      @for (o of opacities; track o) {
        <button
          mat-menu-item
          [attr.aria-checked]="def().opacity === o"
          role="menuitemradio"
          (click)="windows.setOpacity(def().id, o)"
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
    <div class="fb-pe-window__body">
      <iframe
        #frame
        [src]="src"
        [title]="def().title"
        sandbox="allow-scripts allow-same-origin allow-forms"
      ></iframe>
    </div>
    @if (resizable()) {
      @for (m of resizeModes; track m) {
        <div
          class="fb-pe-window__handle"
          [attr.data-mode]="m"
          (pointerenter)="m.includes('n') && onHoverReveal($event)"
          (pointerdown)="startGesture($event, m)"
        ></div>
      }
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
    .fb-pe-window__bar {
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
    .fb-pe-window__bar.front {
      background: #c5cae9;
    }
    :host-context(.dark-theme) .fb-pe-window__bar {
      background: #424242;
      color: #fff;
    }
    :host-context(.dark-theme) .fb-pe-window__bar.front {
      background: #3949ab;
    }
    .fb-pe-window__title {
      flex: 1 1 auto;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
      font-weight: 500;
    }
    .fb-pe-window__btn {
      --mat-icon-button-state-layer-size: 28px;
      width: 28px;
      height: 28px;
      padding: 2px;
      cursor: pointer;
    }
    .fb-pe-window__btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .fb-pe-window__body {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    .fb-pe-window__body iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    :host(.bar-overlay) .fb-pe-window__bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2;
      transition:
        opacity 150ms ease-out,
        transform 150ms ease-out;
    }
    :host(.bar-overlay) .fb-pe-window__body {
      border-radius: 6px;
    }
    :host(.bar-hidden) .fb-pe-window__bar {
      opacity: 0;
      transform: translateY(-6px);
      visibility: hidden;
      transition:
        opacity 300ms ease-in,
        transform 300ms ease-in,
        visibility 0s linear 300ms;
    }
    .fb-pe-window__grip {
      position: absolute;
      top: 0;
      left: 50%;
      z-index: 1;
      width: 64px;
      height: 16px;
      margin: 0 0 0 -32px;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: grab;
      touch-action: none;
      transition: opacity 150ms ease-out;
    }
    .fb-pe-window__grip::before {
      content: '';
      position: absolute;
      top: 5px;
      left: 14px;
      right: 14px;
      height: 5px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.45);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
    }
    :host(:not(.bar-hidden)) .fb-pe-window__grip {
      opacity: 0;
    }
    @media (pointer: coarse) {
      .fb-pe-window__grip {
        width: 96px;
        height: 24px;
        margin-left: -48px;
      }
      .fb-pe-window__grip::before {
        top: 9px;
        left: 24px;
        right: 24px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .fb-pe-window__bar,
      .fb-pe-window__grip {
        transition: none !important;
      }
    }
    :host(.collapsed) .fb-pe-window__body {
      visibility: hidden;
    }
    :host(.collapsed) .fb-pe-window__bar {
      border-radius: 6px;
    }
    :host(.collapsed) .fb-pe-window__handle {
      display: none;
    }
    /* Handles straddle the border: each letter of the mode names an edge. */
    .fb-pe-window__handle {
      position: absolute;
      z-index: 3;
      touch-action: none;
      --edge: 10px;
      --out: calc(var(--edge) / -2);
    }
    @media (pointer: coarse) {
      .fb-pe-window__handle {
        --edge: 16px;
      }
    }
    .fb-pe-window__handle[data-mode*='n'] {
      top: var(--out);
    }
    .fb-pe-window__handle[data-mode*='s'] {
      bottom: var(--out);
    }
    .fb-pe-window__handle[data-mode*='e'] {
      right: var(--out);
    }
    .fb-pe-window__handle[data-mode*='w'] {
      left: var(--out);
    }
    .fb-pe-window__handle[data-mode='n'],
    .fb-pe-window__handle[data-mode='s'] {
      left: var(--edge);
      right: var(--edge);
      height: var(--edge);
      cursor: ns-resize;
    }
    .fb-pe-window__handle[data-mode='e'],
    .fb-pe-window__handle[data-mode='w'] {
      top: var(--edge);
      bottom: var(--edge);
      width: var(--edge);
      cursor: ew-resize;
    }
    .fb-pe-window__handle[data-mode='ne'],
    .fb-pe-window__handle[data-mode='nw'],
    .fb-pe-window__handle[data-mode='se'],
    .fb-pe-window__handle[data-mode='sw'] {
      width: calc(var(--edge) * 1.5);
      height: calc(var(--edge) * 1.5);
    }
    .fb-pe-window__handle[data-mode='ne'],
    .fb-pe-window__handle[data-mode='sw'] {
      cursor: nesw-resize;
    }
    .fb-pe-window__handle[data-mode='nw'],
    .fb-pe-window__handle[data-mode='se'] {
      cursor: nwse-resize;
    }
    :host(.hidden) {
      display: none;
    }
    :host(.sheet),
    :host(.fullscreen) {
      border-radius: 0;
    }
    :host(.sheet) .fb-pe-window__bar,
    :host(.fullscreen) .fb-pe-window__bar,
    :host(.sheet) .fb-pe-window__body,
    :host(.fullscreen) .fb-pe-window__body {
      border-radius: 0;
      cursor: default;
    }
    :host(.fixed-place) .fb-pe-window__bar {
      cursor: default;
    }
  `,
  host: {
    class: 'fb-pe-window',
    '[attr.data-window-id]': 'def().id',
    '[class.collapsed]': 'def().collapsed',
    '[class.hidden]': '!def().visible',
    '[class.modal]': 'def().modal',
    '[class.sheet]': "presentation() === 'sheet'",
    '[class.fullscreen]': "presentation() === 'fullscreen'",
    '[class.fixed-place]': '!movable()',
    '[class.bar-overlay]': 'autoHide()',
    '[class.bar-hidden]': 'autoHide() && !barShown()',
    '[style.z-index]': 'z()',
    '[style.opacity]': 'def().opacity',
    '(pointerdown)': 'windows.focus(def().id)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'releaseBar("focus")'
  }
})
export class ExtWindowComponent implements OnInit, OnDestroy {
  readonly def = input.required<ExtWindow>();

  @ViewChild('frame', { static: true })
  private frame: ElementRef<HTMLIFrameElement>;

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

  protected windows = inject(ExtWindowService);
  private host = inject(PlotterExtensionService);
  private sanitizer = inject(DomSanitizer);
  private zone = inject(NgZone);
  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

  protected src: SafeResourceUrl;
  private detach: (() => void) | null = null;

  /**
   * Stacking position: even numbers from 2 at the back, leaving the odd one
   * below each window for a modal backdrop. The front window gets the active
   * colour.
   */
  protected readonly z = computed(
    () => (this.windows.zOrder().indexOf(this.def().id) + 1) * 2
  );
  protected readonly front = computed(
    () => this.windows.zOrder().at(-1) === this.def().id
  );
  protected readonly presentation = computed(() =>
    this.windows.presentation(this.def(), this.windows.area())
  );
  private readonly floating = computed(
    () => this.presentation() === 'floating'
  );
  protected readonly movable = computed(
    () => this.floating() && this.def().movable
  );
  protected readonly resizable = computed(
    () => this.floating() && this.def().resizable && !this.def().collapsed
  );
  protected readonly hides = computed(
    () => this.def().userClose === 'hide' && !this.def().modal
  );

  /** Where the window is, in px of the window area. */
  readonly rect = computed(() =>
    this.windows.rectOf(this.def(), this.windows.area())
  );

  /** What is on screen: a collapsed window is only its title bar. */
  private readonly drawn = computed(() => {
    const r = this.rect();
    return this.def().collapsed ? { ...r, h: COLLAPSED_HEIGHT } : r;
  });

  /** Hide the title bar when idle: only while the panel itself is shown. */
  protected readonly autoHide = computed(
    () =>
      this.def().titleBar === 'autoHide' &&
      !this.def().collapsed &&
      this.floating()
  );

  protected readonly barShown = signal(true);
  private barHolds = new Set<BarHold>();
  private barTimer: ReturnType<typeof setTimeout> | undefined;

  private gesture: ActiveGesture | null = null;
  private frameReq = 0;

  constructor() {
    // Show the bar whenever auto-hide starts (a window opens or expands), so
    // the user sees it before it gets out of the way.
    effect(() => {
      if (this.autoHide()) untracked(() => this.revealBar());
    });

    // Layout is written straight to the element so a gesture can update it
    // per frame without change detection; between gestures this effect keeps
    // it in step with the window's geometry and the window area.
    effect(() => {
      const r = this.drawn();
      if (!this.gesture) this.applyRect(r);
    });
  }

  ngOnInit() {
    const url = this.def().panel.url;
    this.src = this.sanitizer.bypassSecurityTrustResourceUrl(
      url ? this.host.resolveAssetUrl(url) : 'about:blank'
    );
    this.detach = this.host.attachWindow(this.frame.nativeElement, this.def());
    // Escape dismisses a modal window even while focus is inside its panel,
    // where the key never reaches the host document. Panels are same-origin,
    // so the host can listen in each page the frame loads.
    this.frame.nativeElement.addEventListener('load', this.watchEscape);
  }

  private watchEscape = () => {
    try {
      this.frame.nativeElement.contentWindow?.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if (e.key === 'Escape' && this.def().modal) {
            this.zone.run(() => this.windows.close(this.def().id, 'user'));
          }
        }
      );
    } catch {
      // A page that is not same-origin: Escape works from the host only.
    }
  };

  ngOnDestroy() {
    this.frame.nativeElement.removeEventListener('load', this.watchEscape);
    this.endGesture();
    clearTimeout(this.barTimer);
    this.detach?.();
    this.detach = null;
  }

  /** Show the title bar, then hide it again once it has been idle a while. */
  protected revealBar() {
    this.barShown.set(true);
    this.scheduleBarHide(BAR_HIDE_DELAY_MS);
  }

  protected holdBar(reason: BarHold) {
    this.barHolds.add(reason);
    clearTimeout(this.barTimer);
    this.barShown.set(true);
  }

  protected releaseBar(reason: BarHold, delay = BAR_HIDE_DELAY_MS) {
    if (!this.barHolds.delete(reason)) return;
    this.scheduleBarHide(delay);
  }

  private scheduleBarHide(delay: number) {
    clearTimeout(this.barTimer);
    if (this.barHolds.size) return;
    this.barTimer = setTimeout(() => this.barShown.set(false), delay);
  }

  /** Hover is a mouse thing: on touch, enter and leave wrap every tap. */
  private isHover(e: PointerEvent) {
    return e.pointerType === 'mouse' || e.pointerType === 'pen';
  }

  protected onHoverReveal(e: PointerEvent) {
    if (this.autoHide() && this.isHover(e)) this.revealBar();
  }

  protected onBarEnter(e: PointerEvent) {
    if (this.isHover(e)) this.holdBar('hover');
  }

  protected onBarLeave(e: PointerEvent) {
    if (this.isHover(e)) this.releaseBar('hover', BAR_LEAVE_DELAY_MS);
  }

  /**
   * Keep the bar while keyboard focus is in it. Only keyboard focus counts: a
   * clicked button keeps focus too, and must not pin the bar.
   */
  protected onFocusIn(e: FocusEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.fb-pe-window__bar, .fb-pe-window__grip')) return;
    if (t.matches(':focus-visible')) this.holdBar('focus');
  }

  protected startGesture(e: PointerEvent, mode: GestureMode) {
    if (this.gesture) return;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (mode === 'move' ? !this.movable() : !this.resizable()) return;
    const target = e.currentTarget as HTMLElement;
    // A press on a bar button is a click; the grip is a button that drags.
    const control = (e.target as HTMLElement).closest('a, button');
    if (mode === 'move' && control && control !== target) return;
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
    target.setPointerCapture(e.pointerId);
    this.holdBar('gesture');
    this.windows.gestureActive.set(true);
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
      this.windows.area()
    );
    if (!this.frameReq) {
      this.frameReq = requestAnimationFrame(() => {
        this.frameReq = 0;
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
    if (this.frameReq) {
      cancelAnimationFrame(this.frameReq);
      this.frameReq = 0;
    }
    g.target.removeEventListener('pointermove', this.onMove);
    g.target.removeEventListener('pointerup', this.onEnd);
    g.target.removeEventListener('pointercancel', this.onEnd);
    g.target.removeEventListener('lostpointercapture', this.onEnd);
    if (g.target.hasPointerCapture(g.pointerId)) {
      g.target.releasePointerCapture(g.pointerId);
    }
    this.windows.gestureActive.set(false);
    this.releaseBar('gesture');
    if (commit && g.current !== g.start) {
      // A collapsed window only moves; keep the size it expands back to.
      const { w, h } = this.def().collapsed ? this.rect() : g.current;
      this.windows.setRectFromGesture(this.def().id, {
        x: g.current.x,
        y: g.current.y,
        w,
        h
      });
    }
    this.applyRect(commit ? g.current : this.drawn());
  }

  protected toggleCollapsed() {
    this.windows.setCollapsed(this.def().id, !this.def().collapsed);
  }

  protected onBarDoubleClick(e: MouseEvent) {
    if (this.def().modal) return;
    if ((e.target as HTMLElement).closest('a, button')) return;
    this.toggleCollapsed();
  }

  private applyRect(r: PxRect) {
    this.el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)`;
    this.el.style.width = `${Math.round(r.w)}px`;
    this.el.style.height = `${Math.round(r.h)}px`;
  }
}
