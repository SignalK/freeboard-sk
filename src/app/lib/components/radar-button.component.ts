import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';

@Component({
  selector: 'radar-button',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      [ngClass]="{
        'button-primary': radarApi.defaultRadar() && app.uiCtrl().radarLayer,
        'button-toolbar':
          !app.featureFlags().radarApi || !app.uiCtrl().radarLayer
      }"
      mat-fab
      [disabled]="!active()"
      (click)="handleClick()"
      matTooltip="Radar Overlay"
      matTooltipPosition="above"
    >
      @if (app.uiCtrl().radarLayer) {
        <mat-icon class="ob" svgIcon="chart-radar-overlay-iec"></mat-icon>
      } @else {
        <mat-icon class="ob" svgIcon="radar-iec"></mat-icon>
      }
    </button>
  `,
  styles: []
})
export class RadarButtonComponent {
  protected active = input<boolean>(false);

  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);

  constructor() {}

  handleClick() {
    this.app.uiCtrl.update((current) => {
      const show = !current.radarLayer;
      return Object.assign({}, current, { radarLayer: show });
    });
  }
}
