// One placed widget instance: a sandboxed iframe wired to a HostConnection.
// The sandbox set follows the spec baseline (fault containment, not a
// security boundary): scripts + same-origin for Signal K API access + forms;
// navigation/popups/modals deliberately withheld.

import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  input
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlotterExtensionService } from './plotterext.service';
import { PlacedWidget } from './types';

@Component({
  selector: 'fb-plotterext-widget',
  imports: [],
  template: `
    <iframe
      #frame
      [src]="url"
      sandbox="allow-scripts allow-same-origin allow-forms"
      [title]="placed().widget"
      (load)="onFrameLoad()"
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
        background: transparent;
      }
    `
  ]
})
export class PlotterWidgetFrame implements OnInit, OnDestroy {
  placed = input.required<PlacedWidget>();

  @ViewChild('frame', { static: true })
  frame: ElementRef<HTMLIFrameElement>;

  url: SafeResourceUrl;
  private detach: (() => void) | null = null;

  constructor(
    private service: PlotterExtensionService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const def = this.service.widgetDef(
      this.placed().extension,
      this.placed().widget
    );
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
      def?.url ? this.service.resolveAssetUrl(def.url) : 'about:blank'
    );
    // Attach immediately: the bus handshake tolerates either side being
    // ready first, so there is no load-order race with the iframe.
    this.detach = this.service.attachWidget(
      this.frame.nativeElement,
      this.placed()
    );
  }

  onFrameLoad() {
    // No-op: connection already attached; extension retries bus.ready.
  }

  ngOnDestroy() {
    this.detach?.();
    this.detach = null;
  }
}
