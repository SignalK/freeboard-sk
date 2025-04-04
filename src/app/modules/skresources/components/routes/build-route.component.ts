/***********************************
Build Route from  waypoints, locations component
    <route-builder>
***********************************/
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import {
  CdkDragDrop,
  moveItemInArray,
  copyArrayItem,
  CdkDrag,
  CdkDropList
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'route-builder',
  imports: [
    MatTooltipModule,
    CommonModule,
    CdkDrag,
    CdkDropList,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    FormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./build-route.component.css'],
  template: `
    <mat-card>
      <div class="rte-builder mat-app-background" cdkDrag>
        <div class="title" cdkDragHandle>
          <div>
            <button
              mat-icon-button
              matTooltip="Refresh Waypoint list"
              (click)="getWaypoints()"
            >
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
          <div
            style="flex: 1 1 auto;
            font-size: 14pt;
            line-height: 2.5em;
            text-align: center;
            cursor: grab;"
          >
            Build Route:
          </div>
          <div>
            <button mat-icon-button (click)="handleClose()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="content">
          <div style="display:flex;">
            <div class="wptlist-container">Waypoints</div>
            <div class="wptlist-container">Route</div>
          </div>

          <div class="wptlists">
            <div class="wptlist-container">
              <div
                class="wpt-list"
                id="wpt-list"
                cdkDropList
                #wptList="cdkDropList"
                [cdkDropListData]="wpts"
                [cdkDropListConnectedTo]="[rteptList]"
                (cdkDropListDropped)="dropEventHandler($event)"
              >
                @for(item of wpts; track item) {
                <div class="wpt-box" cdkDrag>
                  <div style="width:40px;">
                    <mat-icon>room</mat-icon>
                  </div>
                  <div class="wpt-text" [matTooltip]="item.name">
                    {{ item.name }}
                  </div>
                </div>
                }
              </div>
            </div>

            <div class="wptlist-container">
              <div
                class="wpt-list"
                id="rte-list"
                cdkDropList
                #rteptList="cdkDropList"
                [cdkDropListData]="rtepts"
                (cdkDropListDropped)="dropEventHandler($event)"
              >
                @for(item of rtepts; track item; let idx = $index) {
                <div class="wpt-box" mat-background cdkDrag>
                  <div style="width:40px;">
                    <mat-icon>room</mat-icon>
                  </div>
                  <div class="wpt-text" [matTooltip]="item.name">
                    {{ item.name }}
                  </div>
                  <div style="width:40px;">
                    <button mat-icon-button (click)="deleteFromRoute(idx)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div style="text-align:center;padding: 5px;">
          <button
            mat-raised-button
            [disabled]="rtepts.length < 2"
            (click)="doSave()"
          >
            <mat-icon>save</mat-icon>&nbsp;Save
          </button>
        </div>
      </div>
    </mat-card>
  `
})
export class BuildRouteComponent {
  wpts = [];
  rtepts = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() save: EventEmitter<any> = new EventEmitter();

  constructor(
    protected app: AppFacade,
    private signalk: SignalKClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit() {
    this.getWaypoints();
    this.cdr.detectChanges();
  }

  getWaypoints() {
    this.wpts = this.app.data.waypoints.map((i) => {
      return {
        id: i[0],
        name: i[1].name,
        position: i[1].feature.geometry.coordinates,
        href: `/resources/waypoints/${i[0]}`
      };
    });
  }

  deleteFromRoute(index: number) {
    this.rtepts.splice(index, 1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropEventHandler(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      copyArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  handleClose() {
    if (this.rtepts.length !== 0) {
      this.app
        .showConfirm(
          'Changes have not been saved.\nDo you want to save?',
          'Unsaved Changes'
        )
        .subscribe((res: boolean) => {
          if (res) {
            this.doSave();
          } else {
            this.app.data.buildRoute.show = false;
          }
        });
    } else {
      this.app.data.buildRoute.show = false;
    }
  }

  doSave() {
    const rte = {
      coordinates: [],
      meta: []
    };

    this.rtepts.forEach((pt) => {
      rte.coordinates.push(pt.position);
      if (pt.href) {
        rte.meta.push({ href: pt.href });
      } else {
        rte.meta.push({ name: pt.name });
      }
    });

    this.save.emit(rte);
  }
}
