import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { CoordsPipe } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';
import { ActiveRoutePoint } from '../route-point-pick';

@Component({
  selector: 'route-point-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CoordsPipe,
    PopoverComponent
  ],
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
      @if (point().position) {
        <div style="display:flex;">
          <div style="font-weight:bold;">Latitude:</div>
          <div
            style="flex: 1 1 auto;text-align:right;"
            [innerText]="
              point().position[1]
                | coords: app.config.units.positionFormat : true
            "
          ></div>
        </div>
        <div style="display:flex;">
          <div style="font-weight:bold;">Longitude:</div>
          <div
            style="flex: 1 1 auto;text-align:right;"
            [innerText]="
              point().position[0]
                | coords: app.config.units.positionFormat : false
            "
          ></div>
        </div>
      }
      <div style="display:flex; flex-wrap: wrap;">
        <div style="flex:1 1 auto;">&nbsp;</div>
        <div class="popover-action-button">
          <button
            mat-button
            (click)="rejoin.emit(point().index)"
            matTooltip="Go straight to this point, then follow the route on"
            matTooltipPosition="after"
          >
            <mat-icon>near_me</mat-icon>
            REJOIN HERE
          </button>
        </div>
        @if (canSkip()) {
          <div class="popover-action-button">
            <button
              mat-button
              (click)="skip.emit(point().index)"
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
  /** Emits the point's index, in the order the route is followed. */
  rejoin = output<number>();
  /** Emits the index of the point to skip, as shown. */
  skip = output<number>();
  closed = output<void>();

  protected app = inject(AppFacade);
  protected readonly icon = { class: 'icon-route', name: 'location_on' };

  /** Skip applies to the point being headed for, when another follows it. */
  protected canSkip() {
    return this.point().isNext && this.point().index < this.point().total - 1;
  }
}
