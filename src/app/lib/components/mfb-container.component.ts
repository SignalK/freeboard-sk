import { Component, input } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { MFBAction } from 'src/app/types';
import { POBButtonComponent } from './pob-button.component';
import { WptButtonComponent } from './wpt-button.component';
import { AutopilotButtonComponent } from './autopilot-button.component';

@Component({
  selector: 'mfb-container',
  standalone: true,
  imports: [POBButtonComponent, WptButtonComponent, AutopilotButtonComponent],
  template: `
    <div class="mfb-container">
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
  protected action = input<MFBAction>();
  constructor(protected app: AppFacade) {}
}
