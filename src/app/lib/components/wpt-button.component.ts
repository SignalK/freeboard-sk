import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SKResourceService } from 'src/app/modules';
import { Position } from 'src/app/types';

@Component({
  selector: 'wpt-button',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      class="button-toolbar"
      mat-fab
      [disabled]="!active()"
      (click)="dropWaypoint()"
      matTooltip="Mark Vessel Position"
      matTooltipPosition="above"
    >
      <mat-icon>add_location</mat-icon>
    </button>
  `,
  styles: []
})
export class WptButtonComponent {
  protected position = input<Position>([0, 0]);
  protected active = input<boolean>(false);

  constructor(private skres: SKResourceService) {}

  protected dropWaypoint() {
    this.skres.newWaypointAt(this.position());
  }
}
