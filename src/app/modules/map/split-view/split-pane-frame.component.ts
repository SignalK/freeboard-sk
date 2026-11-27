import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  input
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import { PaneChoice } from 'src/app/modules/plotterext/types';
import { SplitViewService } from './split-view.service';

/**
 * An extension's panel shown in the split view's second pane (capability
 * `panes`): loaded while it is shown, on the bus as a panel.
 */
@Component({
  selector: 'fb-split-pane-frame',
  template: `
    <iframe
      #frame
      [src]="url"
      sandbox="allow-scripts allow-same-origin allow-forms"
      [title]="choice().panel.title"
    ></iframe>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: none;
      }
    `
  ]
})
export class SplitPaneFrameComponent implements OnInit, OnDestroy {
  readonly choice = input.required<PaneChoice>();

  @ViewChild('frame', { static: true })
  private frame!: ElementRef<HTMLIFrameElement>;
  protected url?: SafeResourceUrl;
  private detach: (() => void) | null = null;
  private service = inject(PlotterExtensionService);
  private split = inject(SplitViewService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit() {
    const { extension, panel } = this.choice();
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.service.resolveAssetUrl(panel.url ?? '')
    );
    this.detach = this.service.attachPanel(this.frame.nativeElement, {
      extension,
      panel,
      close: () => this.split.close()
    });
  }

  ngOnDestroy() {
    this.detach?.();
  }
}
