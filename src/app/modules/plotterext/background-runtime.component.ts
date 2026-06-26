// Headless background runtimes: hidden iframes loaded while their providing
// extension is present in the plotterExtensions collection. No UI — each runs
// the same bus client as a widget/panel and may call the host API (state,
// signalk, resources/filters, map). The host element is always mounted (placed
// once in the app shell) so a runtime's lifecycle follows extension presence,
// not the visibility of any panel.
//
// The sandbox set matches the widget/panel baseline (fault containment, not a
// security boundary): scripts + same-origin for Signal K API access + forms;
// navigation/popups/modals deliberately withheld.

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
import { PlotterExtensionService } from './plotterext.service';
import { BackgroundContribution } from './types';

interface RuntimeEntry {
  key: string;
  extension: string;
  extensionName: string;
  runtime: BackgroundContribution;
}

// One background runtime iframe. Attaches on init, detaches on destroy — so
// when its entry leaves backgroundRuntimes() (extension disabled) Angular
// removes the element and the bus connection is closed.
@Component({
  selector: 'fb-plotterext-runtime',
  imports: [],
  template: `
    <iframe
      #frame
      [src]="url"
      sandbox="allow-scripts allow-same-origin allow-forms"
      [title]="entry().runtime.id"
      aria-hidden="true"
    ></iframe>
  `,
  styles: [
    `
      :host {
        display: none;
      }
    `
  ]
})
export class PlotterBackgroundFrame implements OnInit, OnDestroy {
  entry = input.required<RuntimeEntry>();

  @ViewChild('frame', { static: true })
  frame: ElementRef<HTMLIFrameElement>;

  url: SafeResourceUrl;
  private detach: (() => void) | null = null;

  constructor(
    private service: PlotterExtensionService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const { extension, runtime } = this.entry();
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
      runtime.url ? this.service.resolveAssetUrl(runtime.url) : 'about:blank'
    );
    // Attach immediately: the bus handshake tolerates either side being ready
    // first, so there is no load-order race with the iframe.
    this.detach = this.service.attachBackground(this.frame.nativeElement, {
      extension,
      runtime
    });
  }

  ngOnDestroy() {
    this.detach?.();
    this.detach = null;
  }
}

// Always-mounted host that renders one hidden iframe per background runtime.
@Component({
  selector: 'fb-plotterext-runtimes',
  imports: [PlotterBackgroundFrame],
  template: `
    @for (entry of service.backgroundRuntimes(); track entry.key) {
      <fb-plotterext-runtime [entry]="entry"></fb-plotterext-runtime>
    }
  `,
  styles: [
    `
      :host {
        display: none;
      }
    `
  ]
})
export class PlotterBackgroundHost {
  protected service = inject(PlotterExtensionService);
}
