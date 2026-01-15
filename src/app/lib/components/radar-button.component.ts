import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'radar-button',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      [ngClass]="{
        'button-primary': app.data.vessels.self.autopilot.enabled,
        'button-toolbar':
          !app.data.vessels.self.radar.enabled ||
          !app.featureFlags().radarApi ||
          !app.data.vessels.self.radar.default
      }"
      mat-fab
      [disabled]="!active()"
      (click)="handleClick()"
      matTooltip="Radar Overlay"
      matTooltipPosition="above"
    >
      <mat-icon class="ob" svgIcon="radar-iec"></mat-icon>
    </button>
  `,
  styles: []
})
export class RadarButtonComponent {
  protected active = input<boolean>(false);

  constructor(protected app: AppFacade) {}

  handleClick() {
    this.app.uiCtrl.update((current) => {
      const show = !current.radarLayer;
      return Object.assign({}, current, { radarLayer: show });
    });
  }
}
