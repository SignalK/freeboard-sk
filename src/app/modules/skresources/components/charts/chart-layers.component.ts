import { Component, Output, OnInit, EventEmitter, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';

import { AppFacade } from 'src/app/app.facade';
import { FBCharts } from 'src/app/types';
import { SKResourceService } from '../../resources.service';

/********* ChartLayersList***********/
@Component({
  selector: 'ap-chartlayers',
  imports: [MatTooltipModule, MatIconModule, MatCardModule, DragDropModule],
  template: `
    <div class="_ap-chartlayers">
      <div style="flex: 1 1 auto;position:relative;">
        <div style="overflow:hidden;height:100%;">
          <div
            style="overflow:auto;"
            cdkDropList
            (cdkDropListDropped)="drop($event)"
          >
            @for(ch of chartList; track ch; let i = $index) {
            <mat-card cdkDrag style="border-radius: unset;">
              <mat-card-content>
                <div class="point-drop-placeholder" *cdkDragPlaceholder></div>

                <div
                  style="display:flex;"
                  [style.cursor]="i > 0 ? 'pointer' : 'initial'"
                >
                  <div style="width:35px;">
                    <mat-icon color="">{{ isLocal(ch[1].url) }}</mat-icon>
                  </div>
                  <div
                    style="flex: 1 1 auto;text-overflow: ellipsis;
                        white-space: pre;overflow-x: hidden;"
                  >
                    {{ ch[1].name }}
                  </div>
                  <div cdkDragHandle matTooltip="Drag to re-order charts">
                    <mat-icon>drag_indicator</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
            }
          </div>
        </div>
      </div>

      <mat-card style="border-radius: unset;">
        <mat-card-content>
          <div
            style="display:flex; font-style:italic; border-top:gray 1px solid;"
          >
            <div style="flex: 1 1 auto; ">Base Layer</div>
            <div
              style="text-align:center;
                font-size: 10pt;font-style:italic;"
            >
              (e.g. World Map)
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      ._ap-chartlayers {
        font-family: roboto;
        display: flex;
        flex-direction: column;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }
      .ap-confirm-icon .mat-icon {
        font-size: 25pt;
      }
      .point-drop-placeholder {
        background: #ccc;
        border: dotted 3px #999;
        min-height: 80px;
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drag-preview {
        background-color: whitesmoke;
        box-sizing: border-box;
        border-radius: 4px;
        box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
          0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
      }
    `
  ]
})
export class ChartLayers implements OnInit {
  charts = input.required<FBCharts>();

  protected chartList = [];

  constructor(public app: AppFacade, private skres: SKResourceService) {}

  //** lifecycle: events **
  ngOnInit() {
    this.chartList = this.skres
      .arrangeChartLayers(this.charts().slice())
      .reverse();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drop(e: CdkDragDrop<any>) {
    moveItemInArray(this.chartList, e.previousIndex, e.currentIndex);
    // update and save config
    const newOrder = this.chartList.map((i) => {
      return i[0];
    });
    this.app.config.selections.chartOrder = newOrder.reverse();
    this.app.saveConfig();
    this.skres.chartReorder();
  }

  isLocal(url: string) {
    return url && url.indexOf('signalk') !== -1 ? 'map' : 'language';
  }
}
