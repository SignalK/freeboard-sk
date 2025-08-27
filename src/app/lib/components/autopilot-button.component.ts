import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'autopilot-button',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      [ngClass]="{
        'button-primary': app.data.vessels.self.autopilot.enabled,
        'button-toolbar':
          !app.data.vessels.self.autopilot.enabled ||
          !app.featureFlags().autopilotApi ||
          !app.data.vessels.self.autopilot.default
      }"
      mat-fab
      [disabled]="!active()"
      (click)="handleClick()"
      matTooltip="Autopilot Console"
      matTooltipPosition="above"
    >
      <mat-icon>alt_route</mat-icon>
    </button>
  `,
  styles: []
})
export class AutopilotButtonComponent {
  protected active = input<boolean>(false);

  constructor(protected app: AppFacade) {}

  handleClick() {
    this.app.uiCtrl.update((current) => {
      const show = !current.autopilotConsole;
      return Object.assign({}, current, { autopilotConsole: show });
    });
  }
}
