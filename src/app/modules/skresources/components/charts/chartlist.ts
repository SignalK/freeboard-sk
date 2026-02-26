import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  effect,
  signal,
  input
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { ChartLayers } from './chart-layers.component';
import { ChartPropertiesDialog } from './chart-properties-dialog';
import { FBCharts, FBChart } from 'src/app/types';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WMTSDialog } from './wmts-dialog';
import { WMSDialog } from './wms-dialog';
import { JsonMapSourceDialog } from './jsonmapsource-dialog';
import { SignalKClient } from 'signalk-client-angular';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { ResourceListBase } from '../resource-list-baseclass';
import { FBMapInteractService } from 'src/app/modules/map/fbmap-interact.service';
import { SingleSelectListDialog } from 'src/app/lib/components';
import { SKResourceGroupService } from '../groups/groups.service';
import { SKChart } from '../../resource-classes';
import {
  ChartOpacityDialog,
  ChartOpacityDialogResult
} from './chart-opacity-dialog';

@Component({
  selector: 'chart-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chartlist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    MatInputModule,
    ScrollingModule,
    MatSlideToggle,
    MatMenuModule,
    MatProgressBarModule,
    ChartLayers
  ]
})
export class ChartListComponent extends ResourceListBase {
  @Output() closed: EventEmitter<void> = new EventEmitter();

  selectedCharts = input<string[]>();

  protected override fullList: FBCharts = [];
  protected override filteredList = signal<FBCharts>([]);

  displayChartLayers = false;

  constructor(
    protected app: AppFacade,
    private dialog: MatDialog,
    private signalk: SignalKClient,
    protected override skres: SKResourceService,
    private worker: SKWorkerService,
    private mapInteract: FBMapInteractService,
    protected skgroups: SKResourceGroupService
  ) {
    super('charts', skres);
    // selection.charts changed
    effect(() => {
      if (this.selectedCharts()) {
        this.externalSelection();
      }
    });
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.charts')) {
        this.initItems(true);
      }
    });
  }

  ngOnInit() {
    this.app.data.chartBounds.show = false;
    this.app.data.chartBounds.charts = [];
    this.initItems();
  }

  /**
   * @description Close chart list
   */
  protected close() {
    this.app.data.chartBounds.show = false;
    this.app.data.chartBounds.charts = [];
    this.closed.emit();
  }

  /**
   * @description Initialise the chart list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBChart>(
        this.collection as SKResourceType
      );
      this.fullList = this.skres.appendOSM(this.fullList);
      this.app.sIsFetching.set(false);
      this.doFilter();
      this.skres.selectionClean(
        this.collection,
        this.fullList.map((i) => i[0])
      );
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      this.fullList = [];
    }
  }

  /**
   * @description Returns icon to display to indicate chart is served from local server.
   * @param url Chart url
   */
  protected isLocal(url: string): string {
    return url && url.indexOf(this.app.hostDef.name) !== -1
      ? 'map'
      : 'language';
  }

  /** Handle selection change triggered externally */
  protected externalSelection() {
    this.fullList.forEach(
      (cht: FBChart) => (cht[2] = this.selectedCharts().includes(cht[0]))
    );
    this.doFilter();
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected override toggleAll(checked: boolean) {
    super.toggleAll(checked);
    if (checked) {
      this.skres.chartAddFromServer();
    } else {
      this.skres.chartRemove();
    }
  }

  /**
   * @description Handle chart entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Chart identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update cache
    if (idx !== -1) {
      if (checked) {
        this.skres.chartAdd([this.filteredList()[idx]]);
      } else {
        this.skres.chartRemove([this.filteredList()[idx][0]]);
      }
    }
  }

  /**
   * @description Show chart properties
   * @param id Chart identifier
   */
  protected itemProperties(id: string) {
    this.skres.editChartInfo(id);
  }

  /**
   * @description Show delete chart dialog
   * @param id Chart identifier
   */
  protected itemDelete(id: string) {
    this.skres.deleteChart(id);
  }

  protected openOpacityDialog(chart: FBChart) {
    const opacityPercent = this.opacityToPercent(chart[1]?.defaultOpacity);
    const originalOpacity = chart[1]?.defaultOpacity ?? 1;
    
    this.dialog
      .open(ChartOpacityDialog, {
        disableClose: false,
        data: {
          name: chart[1]?.name ?? chart[0],
          opacityPercent: opacityPercent,
          // Live preview: update opacity while slider moves
          onOpacityChange: (percent: number) => {
            const opacity = this.clampPercent(percent) / 100;
            this.updateOpacityLocal(chart[0], opacity);
          }
        }
      })
      .afterClosed()
      .subscribe((result: ChartOpacityDialogResult) => {
        if (!result || !result.save) {
          // Cancel: restore original opacity
          this.updateOpacityLocal(chart[0], originalOpacity);
          return;
        }
        // Apply: keep the current opacity in session only
        const percent = this.clampPercent(result.opacityPercent);
        const opacity = percent / 100;
        this.updateOpacityLocal(chart[0], opacity);
      });
  }

  private updateOpacityLocal(id: string, opacity: number) {
    this.fullList = this.fullList.map((c: FBChart) => {
      if (c[0] !== id) {
        return c;
      }
      const updated = new SKChart(c[1] as any);
      updated.defaultOpacity = opacity;
      return [c[0], updated, c[2]];
    });
    this.doFilter();
    this.skres.updateChartOpacityCache(id, opacity);
  }


  private opacityToPercent(value?: number) {
    const opacity = typeof value === 'number' ? value : 1;
    return this.clampPercent(Math.round(opacity * 100));
  }

  private clampPercent(value?: number) {
    const v = typeof value === 'number' ? value : 100;
    return Math.min(100, Math.max(0, Math.round(v)));
  }

  /**
   * @description Show chart boundaries on map.
   */
  toggleChartBoundaries() {
    this.app.data.chartBounds.show = !this.app.data.chartBounds.show;
    if (this.app.data.chartBounds.show) {
      this.app.data.chartBounds.charts = this.fullList;
    }
  }

  /**
   * @description Add new chart source to resources
   * */
  addChartSource(type: 'wms' | 'wmts' | 'json') {
    let dref: MatDialogRef<WMTSDialog | WMSDialog | JsonMapSourceDialog>;

    if (type === 'wmts') {
      dref = this.dialog.open(WMTSDialog, {
        disableClose: true,
        data: { format: 'chartprovider' }
      });
    }
    if (type === 'wms') {
      dref = this.dialog.open(WMSDialog, {
        disableClose: true,
        data: { format: 'chartprovider' }
      });
    }
    if (type === 'json') {
      dref = this.dialog.open(JsonMapSourceDialog, {
        disableClose: true,
        data: { format: 'chartprovider' }
      });
    }
    if (!dref) {
      this.app.showAlert(
        'Message',
        `Invalid Chart source type (${type}) provided! `
      );
      return;
    }
    dref.afterClosed().subscribe((sources) => {
      if (sources && sources.length !== 0) {
        if (['wmts', 'wms'].includes(type)) {
          sources[0].source = 'resources-provider';
          this.skres.newChart(sources[0]);
          return;
        }
        if (['json'].includes(type)) {
          sources[0].source = 'resources-provider';
          const c = new SKChart(sources[0]);
          c.source = 'resources-provider';
          this.skres.newChart(c);
          return;
        }
      }
    });
  }

  /**
   * @description Control the display of the re-order chart screen
   * @param show Display Chart Order component when true
   */
  showChartLayers(show = false) {
    this.displayChartLayers = show;
  }

  /**
   * @description Trigger select area interaction
   * @param id Chart identifier
   *
   */
  selectCacheArea(id: string) {
    const cht = this.fullList.find((cht: FBChart) => cht[0] === id);
    this.app.data.chartBounds.charts = [cht];
    this.app.data.chartBounds.show = true;
    this.mapInteract.startBoxSelection('seedChart', cht);
  }

  /**
   * @description Show select Group dialog
   * @param id region identifier
   */
  protected async itemAddToGroup(id: string) {
    try {
      const groups = await this.skgroups.listFromServer();
      const glist = groups.map((g) => {
        return { id: g[0], name: g[1].name };
      });
      this.dialog
        .open(SingleSelectListDialog, {
          data: {
            title: 'Select Group',
            icon: { name: 'category' },
            items: glist
          }
        })
        .afterClosed()
        .subscribe(async (selGrp) => {
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'chart', id);
              this.app.showMessage(`Chart added to group.`);
            } catch (err) {
              this.app.parseHttpErrorResponse(err);
            }
          }
        });
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }
}
