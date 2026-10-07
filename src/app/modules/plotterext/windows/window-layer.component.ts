import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ExtWindowComponent } from './window.component';
import { ExtWindowService } from './window.service';

/** Class on <body> while a window is moved or resized (see styles.scss). */
export const WINDOW_GESTURE_CLASS = 'fb-pe-window-gesture';

/**
 * The window area: a layer over the chart that the extension windows float
 * in. It takes no pointer events itself, only the windows (and, while a modal
 * window is open, the backdrop that blocks the chart) do. It sits inside the
 * chart's stacking context, below the host's own alarm and alert UI, and is
 * inset clear of the toolbar columns, so no extension window (nor a modal
 * backdrop) can cover the host's controls.
 */
@Component({
  selector: 'fb-pe-window-layer',
  imports: [ExtWindowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (backdropZ(); as z) {
      <div
        class="fb-pe-window-backdrop"
        [style.z-index]="z"
        (pointerdown)="$event.stopPropagation()"
      ></div>
    }
    @for (w of service.windows(); track w.id) {
      <fb-pe-window [def]="w"></fb-pe-window>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 4850;
      pointer-events: none;
      overflow: hidden;
    }
    .fb-pe-window-backdrop {
      position: absolute;
      inset: 0;
      pointer-events: auto;
      background: rgba(0, 0, 0, 0.32);
    }
  `,
  host: {
    '[style.left.px]': 'inset()',
    '[style.right.px]': 'inset()',
    '(window:blur)': 'onWindowBlur()',
    '(document:keydown.escape)': 'onEscape($event)'
  }
})
export class ExtWindowLayerComponent implements AfterViewInit, OnDestroy {
  /** Keep this many px clear at the left and right: the host's toolbar columns. */
  readonly inset = input(0);

  protected service = inject(ExtWindowService);
  private overlays = inject(OverlayContainer);
  private document = inject(DOCUMENT);
  private el: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private zone = inject(NgZone);
  private observer: ResizeObserver | null = null;

  /** Just below the active modal window, so it blocks the chart and the rest. */
  protected readonly backdropZ = computed(() => {
    const modal = this.service.activeModal();
    if (!modal) return 0;
    return (this.service.zOrder().indexOf(modal.id) + 1) * 2 - 1;
  });

  constructor() {
    effect(() => {
      this.document.body.classList.toggle(
        WINDOW_GESTURE_CLASS,
        this.service.gestureActive()
      );
    });
  }

  ngAfterViewInit() {
    this.measure();
    if (typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() =>
      this.zone.run(() => this.measure())
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private measure() {
    const r = this.el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      this.service.setArea({ w: r.width, h: r.height });
    }
  }

  /**
   * Escape dismisses the active modal window, like any dialog, unless it is
   * meant for one of the host's own menus or dialogs open above it.
   */
  protected onEscape(e: Event) {
    if (e.defaultPrevented) return;
    if (
      this.overlays.getContainerElement().querySelector('.cdk-overlay-pane')
    ) {
      return;
    }
    const modal = this.service.activeModal();
    if (modal) this.service.close(modal.id, 'user');
  }

  /**
   * A click inside a window's panel never reaches this document, but it does
   * move focus into that panel's iframe, which blurs this window. Use that to
   * bring the clicked window to the front.
   */
  protected onWindowBlur() {
    // activeElement only points at the iframe after the blur has finished.
    setTimeout(() => {
      const active = this.document.activeElement;
      if (active?.tagName !== 'IFRAME') return;
      const id = active
        .closest('[data-window-id]')
        ?.getAttribute('data-window-id');
      if (id) this.service.focus(id);
    });
  }
}
