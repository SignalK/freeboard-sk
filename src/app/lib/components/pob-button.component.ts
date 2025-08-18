import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationManager } from 'src/app/modules';

@Component({
  selector: 'pob-button',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      class="button-warn"
      mat-fab
      (click)="raiseAlarm()"
      matTooltip="Raise POB Alarm"
      matTooltipPosition="top"
    >
      <mat-icon class="ob" svgIcon="alarm-mob"></mat-icon>
    </button>
  `,
  styles: []
})
export class POBButtonComponent {
  constructor(private notiMgr: NotificationManager) {}

  protected raiseAlarm() {
    this.notiMgr.raiseServerAlarm('mob', 'Person Overboard!');
  }
}
