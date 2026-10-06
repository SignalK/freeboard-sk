import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  inject,
  output
} from '@angular/core';
import { PipAppWindowComponent } from './pip-app-window.component';
import { PipAppService } from './pip-app.service';

/** Class on <body> while a window is moved or resized (see styles.scss). */
export const PIP_APP_GESTURE_CLASS = 'fb-pip-app-gesture';

/**
 * Full-viewport layer the PiP App windows float in. It never takes pointer
 * events itself; only the windows do.
 */
@Component({
  selector: 'fb-pip-app-host',
  imports: [PipAppWindowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (w of service.windows(); track w.id) {
      <fb-pip-app [def]="w" (closed)="close($event)"></fb-pip-app>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 4850;
      pointer-events: none;
      overflow: hidden;
    }
  `,
  host: {
    '(window:resize)': 'onResize()',
    '(window:blur)': 'onWindowBlur()'
  }
})
export class PipAppHostComponent {
  /** Emits after a window is closed, so the map can take focus back. */
  readonly closed = output<void>();

  protected service = inject(PipAppService);
  private document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      this.document.body.classList.toggle(
        PIP_APP_GESTURE_CLASS,
        this.service.gestureActive()
      );
    });
  }

  private resizeFrame = 0;

  /** One viewport update per frame, however many resize events arrive. */
  protected onResize() {
    if (this.resizeFrame) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.service.updateViewport();
    });
  }

  protected close(id: string) {
    this.service.close(id);
    this.closed.emit();
  }

  /**
   * A click inside an embedded app never reaches this document, but it does
   * move focus into that app's iframe, which blurs this window. Use that to
   * bring the clicked window to the front.
   */
  protected onWindowBlur() {
    // activeElement only points at the iframe after the blur has finished.
    setTimeout(() => {
      const active = this.document.activeElement;
      if (active?.tagName !== 'IFRAME') return;
      const id = active.closest('[data-pip-id]')?.getAttribute('data-pip-id');
      if (id) this.service.focus(id);
    });
  }
}
