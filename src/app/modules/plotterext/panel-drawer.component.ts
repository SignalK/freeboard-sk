// Right-side drawer hosting extension panels opened via toolbar buttons or
// ui.openPanel. keepAlive panels stay loaded when hidden (their iframe
// element is preserved — reparenting an iframe would reload it); onOpen
// panels are removed from the registry and destroyed on close.

import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlotterExtensionService } from './plotterext.service';
import { PanelContribution } from './types';

@Component({
  selector: 'fb-plotterext-panel-frame',
  imports: [],
  template: `
    <iframe
      #frame
      [src]="url"
      sandbox="allow-scripts allow-same-origin allow-forms"
      [title]="panel().title"
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
export class PlotterPanelFrame implements OnInit, OnDestroy {
  extension = input.required<string>();
  panel = input.required<PanelContribution>();

  @ViewChild('frame', { static: true })
  frame: ElementRef<HTMLIFrameElement>;

  url: SafeResourceUrl;
  private detach: (() => void) | null = null;
  private service = inject(PlotterExtensionService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit() {
    this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.panel().url ? this.service.resolveAssetUrl(this.panel().url) : 'about:blank'
    );
    this.detach = this.service.attachPanel(this.frame.nativeElement, {
      extension: this.extension(),
      panel: this.panel(),
      close: () => this.service.closeVisiblePanel()
    });
  }

  ngOnDestroy() {
    this.detach?.();
    this.detach = null;
  }
}

@Component({
  selector: 'fb-plotterext-panel-drawer',
  imports: [MatButtonModule, MatIconModule, PlotterPanelFrame],
  host: { '[class.pe-open]': 'isOpen()' },
  // The drawer is an in-flow flex sibling of the map container (not an
  // overlay): when open it widens and pushes the display to the left,
  // mirroring Freeboard's instrument-app sidenav. Panels are kept mounted
  // while hidden (keepAlive) — only the visible one is shown.
  template: `
    <div class="pe-drawer-inner" (transitionend)="onTransitionEnd($event)">
      @if (service.visiblePanel(); as v) {
        <div class="pe-drawer-head">
          <span>{{ v.panel.title }}</span>
          <button
            mat-icon-button
            (click)="service.closeVisiblePanel()"
            aria-label="Close panel"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
      <div class="pe-drawer-bodies">
        @for (entry of service.openPanels(); track entry.key) {
          <div class="pe-drawer-body" [class.pe-body-hidden]="!entry.visible">
            <fb-plotterext-panel-frame
              [extension]="entry.extension"
              [panel]="entry.panel"
            ></fb-plotterext-panel-frame>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        flex: 0 0 auto;
        height: 100%;
        width: 0;
        max-width: 92vw;
        overflow: hidden;
        background: #1d242b;
        color: #e8edf2;
      }
      :host.pe-open {
        width: 390px;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.4);
      }
      .pe-drawer-inner {
        width: 390px;
        max-width: 92vw;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .pe-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 4px 4px 14px;
        font-weight: 600;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        flex: 0 0 auto;
      }
      .pe-drawer-bodies {
        flex: 1;
        min-height: 0;
        position: relative;
      }
      .pe-drawer-body {
        position: absolute;
        inset: 0;
      }
      .pe-body-hidden {
        visibility: hidden;
        pointer-events: none;
      }
    `
  ]
})
export class PlotterPanelDrawer {
  protected service = inject(PlotterExtensionService);

  // host width follows the open state (see host binding above)
  protected isOpen = computed(() => !!this.service.visiblePanel());

  constructor() {
    // resize the OL map as the drawer width animates so the viewport tracks
    let first = true;
    effect(() => {
      this.isOpen();
      if (first) {
        first = false;
        return;
      }
      this.service.pulseMapResize();
    });
  }

  onTransitionEnd(ev: TransitionEvent) {
    if (ev.propertyName === 'width') this.service.pulseMapResize(80);
  }
}
