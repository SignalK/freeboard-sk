import { Component, computed, inject, input, output } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { MFBAction } from 'src/app/types';
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
            app.data.vessels.self.autopilot.default
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
    `
  ]
})
export class MFBContainerComponent {
  action = input<MFBAction>();
  radarClick = output<void>();

  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);
  private plotterExt = inject(PlotterExtensionService);

  // sit above any plotter-extension widgets in the bottom-right corner
  protected bottomOffset = computed(() => {
    const lift = this.plotterExt.actionButtonLift();
    return lift > 0 ? lift : 23;
  });

  constructor() {}
}
