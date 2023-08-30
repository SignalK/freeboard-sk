import {
  Component,
  Input,
  Output,
  OnInit,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppInfo } from 'src/app/app.info';
import { ChartInfoDialog } from '../resource-dialogs';
import { FBCharts, FBChart, FBResourceSelect } from 'src/app/types';

@Component({
  selector: 'chart-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chartlist.html',
  styleUrls: ['./resourcelist.css']
})
export class ChartListComponent {
  @Input() charts: FBCharts;
  @Output() select: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() refresh: EventEmitter<void> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() orderChange: EventEmitter<string[]> = new EventEmitter();

  filterList = [];
  filterText = '';
  someSel = false;
  allSel = false;

  displayChartLayers = false;

  constructor(private app: AppInfo, private dialog: MatDialog) {}

  ngOnInit() {
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  initItems() {
    this.checkSelections();
    this.buildFilterList();
  }

  buildFilterList(e?: string) {
    if (typeof e !== 'undefined' || this.filterText) {
      if (typeof e !== 'undefined') {
        this.filterText = e;
      }
      this.filterList = this.charts.filter((i: FBChart) => {
        if (
          i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase()) != -1
        ) {
          return i;
        }
      });
    } else {
      this.filterList = this.charts.slice(0);
    }

    this.checkSelections();

    this.filterList.sort((a, b) => {
      const x = a[1].name.toUpperCase();
      const y = b[1].name.toUpperCase();
      return x <= y ? -1 : 1;
    });
  }

  isLocal(url: string) {
    return url && url.indexOf('signalk') != -1 ? 'map' : 'language';
  }

  checkSelections() {
    let c = false;
    let u = false;
    this.filterList.forEach((i: FBChart) => {
      c = i[2] ? true : c;
      u = !i[2] ? true : u;
    });
    this.allSel = c && !u ? true : false;
    this.someSel = c && u ? true : false;
  }

  selectAll(value: boolean) {
    this.filterList.forEach((i: FBChart) => {
      i[2] = value;
    });
    this.buildFilterList();
    this.someSel = false;
    this.allSel = value ? true : false;
    this.select.emit({ id: 'all', value: value });
  }

  itemSelect(e: boolean, id: string) {
    this.filterList.forEach((i: FBChart) => {
      if (i[0] === id) {
        i[2] = e;
      }
    });
    this.checkSelections();
    this.buildFilterList();
    this.select.emit({ id: id, value: e });
  }

  itemRefresh() {
    this.refresh.emit();
  }

  itemProperties(id: string) {
    const ch = this.charts.filter((c: FBChart) => {
      return c[0] == id ? true : false;
    })[0][1];
    this.dialog.open(ChartInfoDialog, { data: ch });
  }

  showChartLayers(show = false) {
    this.displayChartLayers = show;
  }

  handleOrderChange(e: string[]) {
    this.orderChange.emit(e);
  }
}

/********* ChartLayersList***********/
@Component({
  selector: 'ap-chartlayers',
  template: `
    <div class="_ap-chartlayers">
      <mat-card>
        <mat-card-content>
          <div
            style="display:flex; font-style:italic; border-bottom:gray 1px solid;"
          >
            <div style="flex: 1 1 auto; ">Top Layer</div>
            <div
              style="text-align:center;
              font-size: 10pt;font-style:italic;"
            >
              (drag to re-order)
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <div style="flex: 1 1 auto;position:relative;">
        <div style="overflow:hidden;height:100%;">
          <div
            style="overflow:auto;"
            cdkDropList
            (cdkDropListDropped)="drop($event)"
          >
            <mat-card *ngFor="let ch of chartList; let i = index" cdkDrag>
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
          </div>
        </div>
      </div>

      <mat-card>
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
        border: red 0px solid;
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
  @Output() changed: EventEmitter<string[]> = new EventEmitter();

  constructor(public app: AppInfo) {}

  chartList = [];

  //** lifecycle: events **
  ngOnInit() {
    this.chartList = this.app.data.charts.slice().reverse();
  }

  drop(e: CdkDragDrop<any>) {
    moveItemInArray(this.chartList, e.previousIndex, e.currentIndex);
    // update and save config
    this.app.data.charts = this.chartList.slice().reverse();
    this.app.config.selections.chartOrder = this.app.data.charts.map((i) => {
      return i[0];
    });
    this.app.saveConfig();
    this.changed.emit(this.app.config.selections.chartOrder);
  }

  isLocal(url: string) {
    return url && url.indexOf('signalk') != -1 ? 'map' : 'language';
  }
}
