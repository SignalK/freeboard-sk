import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  inject,
  input
} from '@angular/core';
import {
  PanelArea,
  PanelPlacement,
  clampPosition,
  loadPlacement,
  placementFromRect,
  positionFromPlacement,
  savePlacement
} from '../movable-panel';

/** Mouse / pen travel (px) before a press becomes a move rather than a click. */
export const DRAG_THRESHOLD = 4;
/** How long a finger must rest on the panel before it can move it. */
export const LONG_PRESS_MS = 350;
/** Finger travel (px) that turns a pending long-press into a scroll. */
export const TOUCH_SLOP = 8;

/** Presses that start on these keep their own behaviour. */
const CONTROLS =
  'button, a, input, select, textarea, [role="button"], [role="slider"]';

type GestureState = 'pending' | 'pressing' | 'dragging';

interface Gesture {
  state: GestureState;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  /** Where the drag has the panel's top-left, in px of the area. */
  x: number;
  y: number;
  /** The panel has left where the drag found it. */
  moved: boolean;
  touch: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Lets the user move an absolutely positioned panel by pressing anywhere on it
 * that isn't a control, and remembers where it was left on this device under
 * the given key.
 *
 * Touch needs a long-press first, so a quick swipe still scrolls a panel whose
 * content overflows it. Until the user moves it the panel stays where its own
 * CSS puts it.
 */
@Directive({
  selector: '[fbMovablePanel]'
})
export class MovablePanelDirective implements OnDestroy {
  /** The localStorage key the panel's placement is remembered under. */
  readonly fbMovablePanel = input.required<string>();

  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private zone = inject(NgZone);

  private placement: PanelPlacement | null = null;
  private gesture: Gesture | null = null;
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      const s = this.el.style;
      s.setProperty('cursor', 'grab');
      // Holding a finger on the panel must not select text or call up iOS's
      // link / image menu.
      s.setProperty('user-select', 'none');
      s.setProperty('-webkit-user-select', 'none');
      s.setProperty('-webkit-touch-callout', 'none');
      this.placement = loadPlacement(this.fbMovablePanel());
      this.place();
      this.zone.runOutsideAngular(() => {
        this.el.addEventListener('pointerdown', this.onDown);
        // Non-passive so a drag can stop the page scrolling under the finger.
        this.el.addEventListener('touchmove', this.onTouchMove, {
          passive: false
        });
        this.el.addEventListener('contextmenu', this.onContextMenu);
        window.addEventListener('resize', this.place);
        if (typeof ResizeObserver !== 'undefined') {
          // Content and area changes move the panel away from its corner.
          this.resizeObserver = new ResizeObserver(() => this.place());
          this.resizeObserver.observe(this.el);
          const parent = this.el.offsetParent;
          if (parent) {
            this.resizeObserver.observe(parent);
          }
        }
      });
    });
  }

  ngOnDestroy() {
    this.endGesture();
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('touchmove', this.onTouchMove);
    this.el.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('resize', this.place);
    this.resizeObserver?.disconnect();
  }

  private area(): PanelArea | null {
    const parent = this.el.offsetParent as HTMLElement | null;
    return parent ? { w: parent.clientWidth, h: parent.clientHeight } : null;
  }

  private size(): PanelArea {
    return { w: this.el.offsetWidth, h: this.el.offsetHeight };
  }

  /**
   * Put the panel at its remembered placement, kept inside the area. It is
   * pinned by the CSS offsets of its own corner: a panel's shrink-to-fit width
   * depends on its `left`, so a right-hand panel placed by `left` would size
   * itself to the space left of that point.
   */
  private place = () => {
    const area = this.area();
    if (!this.placement || !area || this.gesture?.state === 'dragging') {
      return;
    }
    const size = this.size();
    const pos = positionFromPlacement(this.placement, size, area);
    const right = this.placement.corner.endsWith('right');
    const bottom = this.placement.corner.startsWith('bottom');
    const s = this.el.style;
    s.left = right ? 'auto' : `${pos.x}px`;
    s.right = right ? `${area.w - size.w - pos.x}px` : 'auto';
    s.top = bottom ? 'auto' : `${pos.y}px`;
    s.bottom = bottom ? `${area.h - size.h - pos.y}px` : 'auto';
  };

  private onDown = (e: PointerEvent) => {
    if (this.gesture || !e.isPrimary) {
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }
    const control = (e.target as Element | null)?.closest(CONTROLS);
    if (control && this.el.contains(control)) {
      return;
    }
    if (this.onScrollbar(e)) {
      return;
    }
    const touch = e.pointerType === 'touch';
    this.gesture = {
      state: touch ? 'pressing' : 'pending',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: this.el.offsetLeft,
      originY: this.el.offsetTop,
      x: this.el.offsetLeft,
      y: this.el.offsetTop,
      moved: false,
      touch
    };
    if (touch) {
      this.gesture.timer = setTimeout(() => this.startDrag(), LONG_PRESS_MS);
    }
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onEnd);
    window.addEventListener('pointercancel', this.onEnd);
  };

  /**
   * A press on the panel's own scrollbar scrolls it. Chrome sends no pointer
   * events for one, but other browsers deliver it to the panel.
   */
  private onScrollbar(e: PointerEvent): boolean {
    if (e.target !== this.el) {
      return false;
    }
    const r = this.el.getBoundingClientRect();
    return (
      e.clientY - r.top - this.el.clientTop >= this.el.clientHeight ||
      e.clientX - r.left - this.el.clientLeft >= this.el.clientWidth
    );
  }

  private startDrag() {
    const g = this.gesture;
    if (!g) {
      return;
    }
    g.state = 'dragging';
    // Lift the panel so a finger that has held long enough knows it can move.
    this.el.style.setProperty('cursor', 'grabbing');
    this.el.style.setProperty('box-shadow', '0 4px 16px rgba(0, 0, 0, 0.45)');
    if (g.touch) {
      navigator.vibrate?.(10);
    }
    try {
      this.el.setPointerCapture(g.pointerId);
    } catch {
      // The pointer is already gone; pointerup / pointercancel will end it.
    }
  }

  private onMove = (e: PointerEvent) => {
    const g = this.gesture;
    if (!g || e.pointerId !== g.pointerId) {
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const travel = Math.hypot(dx, dy);
    if (g.state === 'pressing') {
      if (travel > TOUCH_SLOP) {
        // A swipe, not a long-press: leave it to the browser to scroll.
        this.endGesture();
      }
      return;
    }
    if (g.state === 'pending') {
      if (travel < DRAG_THRESHOLD) {
        return;
      }
      this.startDrag();
    }
    const area = this.area();
    if (area) {
      // A transform moves the panel without touching its layout, so its size
      // holds steady under the pointer.
      const pos = clampPosition(
        { x: g.originX + dx, y: g.originY + dy },
        this.size(),
        area
      );
      g.x = pos.x;
      g.y = pos.y;
      g.moved ||= pos.x !== g.originX || pos.y !== g.originY;
      this.el.style.transform = `translate(${pos.x - g.originX}px, ${pos.y - g.originY}px)`;
    }
  };

  private onEnd = (e: PointerEvent) => {
    const g = this.gesture;
    if (!g || e.pointerId !== g.pointerId) {
      return;
    }
    // A long-press lifted without moving leaves the panel to its own CSS.
    if (g.state === 'dragging' && g.moved) {
      this.drop(g);
    }
    this.endGesture();
    this.place();
  };

  /** Remember where the panel was dropped, against its nearest corner. */
  private drop(g: Gesture) {
    const area = this.area();
    if (!area) {
      return;
    }
    this.placement = placementFromRect(
      { x: g.x, y: g.y, ...this.size() },
      area
    );
    savePlacement(this.fbMovablePanel(), this.placement);
    // The release lands a click on whatever is under it; it ended a move.
    this.el.addEventListener('click', this.swallowClick, {
      capture: true,
      once: true
    });
    setTimeout(
      () => this.el.removeEventListener('click', this.swallowClick, true),
      0
    );
  }

  private swallowClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.gesture?.state === 'dragging' && e.cancelable) {
      e.preventDefault();
    }
  };

  private onContextMenu = (e: Event) => {
    // A long-press would otherwise open the browser's menu over the panel.
    if (this.gesture) {
      e.preventDefault();
    }
  };

  private endGesture() {
    const g = this.gesture;
    if (!g) {
      return;
    }
    clearTimeout(g.timer);
    this.gesture = null;
    this.el.style.transform = '';
    this.el.style.setProperty('cursor', 'grab');
    this.el.style.removeProperty('box-shadow');
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onEnd);
    window.removeEventListener('pointercancel', this.onEnd);
  }
}
