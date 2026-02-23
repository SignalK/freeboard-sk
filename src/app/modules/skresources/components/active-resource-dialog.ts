import { Component, OnInit, Inject, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDrag,
  CdkDropList
} from '@angular/cdk/drag-drop';
import { Position } from 'src/app/types';
import { AppFacade } from 'src/app/app.facade';

import { SKWaypoint, SKRoute } from '../resource-classes';
import { GeoUtils } from 'src/app/lib/geoutils';
import { SKResourceService } from '../resources.service';
import { CourseService } from '../../course';
import { Convert } from 'src/app/lib/convert';

/** 
  @description ActiveResourcePropertiesModal 
	@param data: {
        title: "<string>" title text,
        type: 'dest' | 'route' resource type,
        resource: "<SKWaypoint | SKRoute>" active resource info
    }
*/
@Component({
  selector: 'ap-dest-modal',
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    CdkDrag,
    CdkDropList
  ],
  template: `
    <div class="_ap-dest" style="display:flex;flex-direction:column;">
      <div>
        <mat-toolbar style="background-color: transparent">
          <span>
            @if (showClearButton()) {
              <button
                mat-button
                (click)="deactivate()"
                [matTooltip]="clearButtonText"
              >
                <mat-icon>clear_all</mat-icon>
                Clear
              </button>
            } @else {
              <button
                mat-raised-button
                (click)="startAt()"
                matTooltip="Start at nearest point."
              >
                <mat-icon>near_me</mat-icon>
                Start
              </button>
            }
          </span>
          <span
            style="flex: 1 1 auto; padding-left:20px;text-align:center;text-overflow: ellipsis;white-space: nowrap; overflow: hidden;"
          >
            {{ data.title }}
          </span>
          <span>
            <button
              mat-icon-button
              (click)="close()"
              matTooltip="Close"
              matTooltipPosition="below"
            >
              <mat-icon>keyboard_arrow_down</mat-icon>
            </button>
          </span>
        </mat-toolbar>
      </div>

      <div
        style="flex: 1 1 auto;position:relative;overflow:hidden;min-height:200px;"
      >
        <div
          style="top:0;left:0;right:0;bottom:0;position:absolute;
                    overflow:auto;"
          cdkDropList
          (cdkDropListDropped)="drop($event)"
        >
          @for (pt of points; track pt; let i = $index) {
            <mat-card cdkDrag [cdkDragDisabled]="readOnly">
              <mat-card-content style="padding:3px;">
                <div class="point-drop-placeholder" *cdkDragPlaceholder></div>

                <div
                  style="display:flex;"
                  [style.cursor]="
                    points.length > 1 && selIndex() !== -1
                      ? 'pointer'
                      : 'initial'
                  "
                >
                  <div style="width:35px;">
                    @if (selIndex() === i) {
                      <mat-icon class="icon-warn"> flag </mat-icon>
                    } @else {
                      <button
                        mat-icon-button
                        matTooltip="Go to"
                        (click)="startAt(i)"
                      >
                        <mat-icon> near_me </mat-icon>
                      </button>
                    }
                  </div>
                  <div style="flex: 1 1 auto;">
                    <div style="display:flex;">
                      <div class="key-label"></div>
                      <div
                        style="flex: 1 1 auto;font-weight:bold;"
                        [innerText]="pointMeta[i].name"
                      ></div>
                    </div>

                    @if (pointMeta[i].description) {
                      <div style="display:flex;">
                        <div class="key-label">Desc:</div>
                        <div
                          style="flex: 1 1 auto;"
                          [innerText]="pointMeta[i].description"
                        ></div>
                      </div>
                    }

                    <div style="display:flex;">
                      <div class="key-label"></div>
                      <div style="flex: 1 1 auto;font-style:italic">
                        <span [innerText]="legs[i].bearing"></span>
                        &nbsp;
                        <span [innerText]="legs[i].distance"></span>
                      </div>
                    </div>
                  </div>
                  @if (!readOnly && data.type === 'route') {
                    <div cdkDragHandle matTooltip="Drag to re-order points">
                      <mat-icon>drag_indicator</mat-icon>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-dest {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-dest .key-label {
        width: 20px;
        font-weight: bold;
      }
      ._ap-dest .selected {
        background-color: silver;
      }
      .point-drop-placeholder {
        background: #ccc;
        border: dotted 3px #999;
        min-height: 60px;
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drag-preview {
        box-sizing: border-box;
        border-radius: 4px;
        box-shadow:
          0 5px 5px -3px rgba(0, 0, 0, 0.2),
          0 8px 10px 1px rgba(0, 0, 0, 0.14),
          0 3px 14px 2px rgba(0, 0, 0, 0.12);
      }
    `
  ]
})
export class ActiveResourcePropertiesModal implements OnInit {
  protected points: Array<Position> = [];
  protected pointMeta: Array<{ name: string; description: string }> = [];
  protected legs: { bearing: string; distance: string }[] = [];
  protected selIndex = signal<number>(-1);
  protected clearButtonText = 'Clear';
  protected showClearButton = signal<boolean>(false);
  protected readOnly: boolean;
  protected closestPoint = signal<number>(-1);

  protected app = inject(AppFacade);
  protected modalRef = inject(MatBottomSheetRef<ActiveResourcePropertiesModal>);
  protected course = inject(CourseService);
  protected skres = inject(SKResourceService);

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      type: string;
      resource: SKWaypoint | SKRoute;
    }
  ) {}

  ngOnInit() {
    if (
      this.data.resource[1].feature &&
      this.data.resource[1].feature.geometry.coordinates
    ) {
      if (this.data.type === 'route') {
        this.points = [].concat(
          this.data.resource[1].feature.geometry.coordinates
        );
        this.legs = this.getLegs();

        this.data.title = this.data.resource[1].name
          ? `${this.data.resource[1].name} Points`
          : 'Route Points';

        if (this.data.resource[0] === this.app.data.activeRoute) {
          this.selIndex.update(() => this.course.courseData().pointIndex);
          this.showClearButton.set(true);
        }
        this.readOnly =
          this.data.resource[1].feature.properties?.readOnly ?? false;
        this.pointMeta = this.getPointsMeta();
      }
    }
  }

  getLegs() {
    const pos = this.app.data.vessels.self.position;
    return GeoUtils.routeLegs(this.points, pos).map((l) => {
      return {
        bearing: this.app.formatValueForDisplay(l.bearing, 'deg'),
        distance: this.app.formatValueForDisplay(l.distance, 'm')
      };
    });
  }

  getPointsMeta() {
    if (
      this.data.resource[1].feature.properties.coordinatesMeta &&
      Array.isArray(this.data.resource[1].feature.properties.coordinatesMeta)
    ) {
      const pointsMeta =
        this.data.resource[1].feature.properties.coordinatesMeta;
      let idx = 0;
      return pointsMeta.map((pt) => {
        idx++;
        if (pt.href) {
          const id = pt.href.split('/').slice(-1);
          const wpt = this.skres.fromCache('waypoints', id[0]);
          return wpt
            ? {
                name: `* ${wpt[1].name}`,
                description: `* ${wpt[1].description}`
              }
            : {
                name: '!wpt reference!',
                description: ''
              };
        } else {
          return {
            name: pt.name ?? `RtePt-${('000' + String(idx)).slice(-3)}`,
            description: pt.description ?? ``
          };
        }
      });
    } else {
      let idx = 0;
      return this.points.map(() => {
        return {
          name: `RtePt-${('000' + String(++idx)).slice(-3)}`,
          description: ''
        };
      });
    }
  }

  drop(e: CdkDragDrop<{ previousIndex: number; currentIndex: number }>) {
    if (this.data.type === 'route') {
      const selPosition = this.points[this.selIndex()];
      moveItemInArray(this.points, e.previousIndex, e.currentIndex);
      this.legs = this.getLegs();
      if (this.data.resource[1].feature.properties.coordinatesMeta) {
        moveItemInArray(
          this.data.resource[1].feature.properties.coordinatesMeta,
          e.previousIndex,
          e.currentIndex
        );
      }
      moveItemInArray(this.pointMeta, e.previousIndex, e.currentIndex);

      this.updateFlag(selPosition);
      this.skres.updateRouteCoords(
        this.data.resource[0],
        this.points,
        this.data.resource[1].feature.properties.coordinatesMeta
      );
    }
  }

  updateFlag(selPosition: Position) {
    if (!selPosition) {
      return;
    }
    let idx = 0;
    this.points.forEach((p: Position) => {
      if (p[0] === selPosition[0] && p[1] === selPosition[1]) {
        this.selIndex.set(idx);
      }
      idx++;
    });
  }

  close() {
    this.modalRef.dismiss();
  }

  /** Activate route starting at nearest point */
  startAt(idx: number = -1) {
    if (this.points.length < 2) {
      return;
    }
    if (idx === -1) {
      const cpi = GeoUtils.closestForwardPoint(
        this.data.resource[1].feature.geometry.coordinates,
        this.app.data.vessels.self.position,
        Convert.radiansToDegrees(this.app.data.vessels.self.heading)
      );
      if (cpi === -1) {
        this.app.showAlert('Start Route', 'Closest point is behind vessel!');
        return;
      }
      idx = cpi;
    }
    this.selIndex.update(() => idx);
    this.showClearButton.set(true);
    this.course.activateRoute(this.data.resource[0], idx);
  }

  /** deactivate route / clear destination */
  deactivate() {
    this.selIndex.set(-1);
    this.showClearButton.set(false);
    this.course.clearCourse();
  }
}
