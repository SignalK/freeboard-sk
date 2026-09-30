import {
  Component,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopoverComponent } from './popover.component';
import { ActiveRoutePoint } from '../route-point-pick';

@Component({
  selector: 'route-point-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, MatIconModule, PopoverComponent],
  template: `
    <ap-popover
      [title]="point().name || 'Route point'"
      [canClose]="canClose()"
      [icon]="icon"
      (closed)="closed.emit()"
    >
      <div style="display:flex;">
        <div style="font-weight:bold;">Point:</div>
        <div style="flex: 1 1 auto;text-align:right;">
          {{ point().index + 1 }} of {{ point().total }}
          @if (point().isNext) {
            (next)
          }
        </div>
      </div>
      <div style="display:flex; flex-wrap: wrap;">
        <div style="flex:1 1 auto;">&nbsp;</div>
        <div class="popover-action-button">
          <button
            mat-button
            (click)="navigate.emit(point().index)"
            matTooltip="Go straight to this point, then follow the route on"
            matTooltipPosition="after"
          >
            <mat-icon>near_me</mat-icon>
            NAVIGATE FROM HERE
          </button>
        </div>
        @if (canSkip()) {
          <div class="popover-action-button">
            <button
              mat-button
              (click)="skip.emit()"
              matTooltip="Go straight to the point after this one"
              matTooltipPosition="after"
            >
              <mat-icon>skip_next</mat-icon>
              SKIP
            </button>
          </div>
        }
      </div>
    </ap-popover>
  `
})
export class RoutePointPopoverComponent {
  point = input.required<ActiveRoutePoint>();
  canClose = input<boolean>();
  navigate = output<number>();
  skip = output<void>();
  closed = output<void>();

  protected readonly icon = { class: 'icon-route', name: 'location_on' };

  /** Skip applies to the point being headed for, when another follows it. */
  protected canSkip() {
    return this.point().isNext && this.point().index < this.point().total - 1;
  }
}
