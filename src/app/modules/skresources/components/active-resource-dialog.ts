import { Component, OnInit, Inject } from '@angular/core';
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
import { SKResources } from '../resources.service';

/********* ActiveResourcePropertiesModal **********
	data: {
        title: "<string>" title text,
        type: 'dest' | 'route' resource type,
        resource: "<SKWaypoint | SKRoute>" active resource info
        skres: pointer to SKResources service
    }
***********************************/
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
            @if(showClearButton) {
            <button
              mat-button
              (click)="deactivate()"
              [matTooltip]="clearButtonText"
            >
              <mat-icon>clear_all</mat-icon>
              Clear
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
          @for(pt of points; track pt; let i = $index) {
          <mat-card cdkDrag [cdkDragDisabled]="readOnly">
            <mat-card-content style="padding:3px;">
              <div class="point-drop-placeholder" *cdkDragPlaceholder></div>

              <div
                style="display:flex;"
                (click)="selectPoint(i)"
                [style.cursor]="
                  points.length > 1 && selIndex !== -1 ? 'pointer' : 'initial'
                "
              >
                <div style="width:35px;">
                  @if(selIndex === i) {
                  <mat-icon class="icon-warn"> flag </mat-icon>
                  }
                </div>
                <div style="flex: 1 1 auto;">
                  <div style="display:flex;">
                    <div class="key-label">
                      <mat-icon> text_fields </mat-icon>
                    </div>
                    <div
                      style="flex: 1 1 auto;"
                      [innerText]="pointMeta[i].name"
                    ></div>
                  </div>

                  @if(pointMeta[i].description) {
                  <div style="display:flex;">
                    <div class="key-label">Desc:</div>
                    <div
                      style="flex: 1 1 auto;"
                      [innerText]="pointMeta[i].description"
                    ></div>
                  </div>
                  }

                  <div style="display:flex;">
                    <div class="key-label">
                      <mat-icon [ngClass]="{ 'icon-primary': i === 0 }"
                        >square_foot</mat-icon
                      >
                    </div>
                    <div style="flex: 1 1 auto;">
                      <span [innerText]="legs[i].bearing"></span>
                      &nbsp;
                      <span [innerText]="legs[i].distance"></span>
                    </div>
                  </div>
                </div>
                @if(!readOnly && data.type === 'route') {
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
        width: 50px;
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
        box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
          0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
      }
    `
  ]
})
export class ActiveResourcePropertiesModal implements OnInit {
  protected points: Array<Position> = [];
  protected pointMeta: Array<{ name: string; description: string }> = [];
  protected legs: { bearing: string; distance: string }[] = [];
  protected selIndex = -1;
  protected clearButtonText = 'Clear';
  protected showClearButton = false;
  protected readOnly: boolean;

  constructor(
    public app: AppFacade,
    public modalRef: MatBottomSheetRef<ActiveResourcePropertiesModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      type: string;
      resource: SKWaypoint | SKRoute;
      skres: SKResources;
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
          this.selIndex = this.app.data.navData.pointIndex;
          this.showClearButton = true;
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
          const wpt = this.data.skres.fromCache('waypoints', id[0]);
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

  selectPoint(idx: number) {
    if (this.points.length < 2 || this.selIndex < 0) {
      return;
    }
    this.selIndex = idx;
    if (this.data.skres) {
      this.data.skres.coursePointIndex(this.selIndex);
    }
  }

  drop(e: CdkDragDrop<{ previousIndex: number; currentIndex: number }>) {
    if (this.data.type === 'route') {
      const selPosition = this.points[this.selIndex];
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
      this.data.skres.updateRouteCoords(
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
        this.selIndex = idx;
      }
      idx++;
    });
  }

  close() {
    this.modalRef.dismiss();
  }

  // ** deactivate route / clear destination
  deactivate() {
    this.modalRef.dismiss(true);
  }
}
