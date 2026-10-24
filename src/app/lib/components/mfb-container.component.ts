import { Component, computed, inject, input, output } from '@angular/core';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppFacade } from 'src/app/app.facade';
import { MFBAction } from 'src/app/types';
import {
  ToolbarItem,
  toolbarBadgeText,
  toolbarButtonClass,
  toolbarMenuLabel
} from './map-toolbar/map-toolbar';
import { POBButtonComponent } from './pob-button.component';
import { WptButtonComponent } from './wpt-button.component';
import { AutopilotButtonComponent } from './autopilot-button.component';
import { RadarButtonComponent } from './radar-button.component';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';

@Component({
  selector: 'mfb-container',
  standalone: true,
  imports: [
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    POBButtonComponent,
    WptButtonComponent,
    AutopilotButtonComponent,
    RadarButtonComponent
  ],
  template: `
    <div class="mfb-container" [style.bottom.px]="bottomOffset()">
      @if (action() === 'wpt') {
        <wpt-button
          [position]="app.data.vessels.self.position"
          [active]="app.data.vessels.showSelf"
        ></wpt-button>
      }
      @if (action() === 'pob') {
        <pob-button></pob-button>
      }
      @if (action() === 'autopilot') {
        <autopilot-button
          [active]="
            app.featureFlags().autopilotApi &&
            !!app.data.vessels.self.autopilot.default
          "
        ></autopilot-button>
      }
      @if (action() === 'radar') {
        <radar-button
          [active]="
            app.featureFlags().radarApi && radarApi.radarId().length !== 0
          "
          (click)="radarClick.emit()"
        ></radar-button>
      }
      @if (extensionButton(); as item) {
        <button
          mat-fab
          data-action-button="extension"
          [class]="buttonClass(item)"
          [class.custom-bg]="!!item.colors?.bg"
          [class.custom-fg]="!!item.colors?.fg"
          [style.--toolbar-button-bg]="item.colors?.bg ?? null"
          [style.--toolbar-button-fg]="item.colors?.fg ?? null"
          [disabled]="item.disabled"
          [matTooltip]="item.tooltip"
          matTooltipPosition="above"
          [attr.aria-label]="label(item)"
          [attr.aria-pressed]="item.pressed ? 'true' : null"
          [matBadge]="badgeText(item)"
          matBadgeOverlap="true"
          [matBadgeHidden]="!item.badge"
          (click)="item.action?.()"
        >
          <mat-icon>{{ item.icon || 'extension' }}</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .mfb-container {
        position: absolute;
        bottom: 23px;
        right: 5px;
        z-index: 5000;
      }
      /* Beat the theme's !important button classes, as the toolbar does. */
      .custom-bg {
        background-color: var(--toolbar-button-bg) !important;
      }
      .custom-fg {
        color: var(--toolbar-button-fg) !important;
      }
    `
  ]
})
export class MFBContainerComponent {
  action = input<MFBAction>();
  /**
   * The extension button the `action` setting names, as the toolbar would
   * draw it. Undefined while that button is not available, which leaves the
   * corner empty.
   */
  extensionButton = input<ToolbarItem>();
  radarClick = output<void>();

  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);
  private plotterExt = inject(PlotterExtensionService);

  // sit above any plotter-extension widgets in the bottom-right corner
  protected bottomOffset = computed(() => {
    const lift = this.plotterExt.actionButtonLift();
    return lift > 0 ? lift : 23;
  });

  protected buttonClass = toolbarButtonClass;
  protected badgeText = toolbarBadgeText;
  protected label = toolbarMenuLabel;
}
