import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject
} from '@angular/core';
import { toolbarReach } from './split-view';
import { SplitViewService } from './split-view.service';

/**
 * Marks a map toolbar that runs down the side of the main chart. It reports
 * how far down it reaches, so a stacked split leaves the main chart room for
 * all its buttons (see SplitViewService.mainMin).
 */
@Directive({ selector: '[fbSplitToolbar]' })
export class SplitToolbarDirective {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private split = inject(SplitViewService);

  constructor() {
    const el = this.host.nativeElement;
    let sized: ResizeObserver | undefined;
    let changed: MutationObserver | undefined;
    const measure = () =>
      this.split.setToolbarReach(
        this,
        toolbarReach(
          el.offsetTop,
          el.children as HTMLCollectionOf<HTMLElement>,
          parseFloat(getComputedStyle(el).paddingBottom) || 0
        )
      );
    // Buttons come and go with plugins and settings, and some are hidden by
    // a media query; the toolbar moves down under a plugin's top bar.
    const watchItems = () => {
      sized?.disconnect();
      sized?.observe(el);
      [...el.children].forEach((item) => sized?.observe(item));
    };
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        sized = new ResizeObserver(measure);
      }
      if (typeof MutationObserver !== 'undefined') {
        changed = new MutationObserver(() => {
          watchItems();
          measure();
        });
        changed.observe(el, {
          childList: true,
          attributes: true,
          attributeFilter: ['style']
        });
      }
      watchItems();
      measure();
    });
    inject(DestroyRef).onDestroy(() => {
      sized?.disconnect();
      changed?.disconnect();
      this.split.setToolbarReach(this, null);
    });
  }
}
