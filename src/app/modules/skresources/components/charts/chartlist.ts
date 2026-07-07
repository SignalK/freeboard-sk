import {
  Component,
  ChangeDetectionStrategy,
  effect,
  signal,
  input,
  inject,
  output,
  DestroyRef
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
import { FBCharts, FBChart, ChartImageAdjustment } from 'src/app/types';
import { WMTSDialog } from './wmts-dialog';
import { WMSDialog } from './wms-dialog';
import { JsonMapSourceDialog } from './jsonmapsource-dialog';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { ResourceListBase } from '../resource-list-baseclass';
import { FBMapInteractService } from 'src/app/modules/map/fbmap-interact.service';
import {
  SingleSelectListDialog,
  SliderInputDialog,
  SliderInputDialogResult,
  ImageAdjustmentDialog,
  ImageAdjustmentDialogResult
} from 'src/app/lib/components';
import { SKResourceGroupService } from '../groups/groups.service';
import { SKChart } from '../../resource-classes';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  closed = output<void>();

  selectedCharts = input<string[]>();

  protected override fullList: FBCharts = [];
  protected override filteredList = signal<FBCharts>([]);

  displayChartLayers = false;

  protected app = inject(AppFacade);
  private worker = inject(SKWorkerService);
  private dialog = inject(MatDialog);
  private skgroups = inject(SKResourceGroupService);
  private mapInteract = inject(FBMapInteractService);
  private destroyRef = inject(DestroyRef);

  constructor(protected override skres: SKResourceService) {
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
      this.cleanOpacityConfig();
      this.cleanImageAdjustmentConfig();
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
   * Clean orphaned chartOpacity keys from config
   */
  cleanOpacityConfig() {
    const keys = Object.keys(this.app.config.selections.chartOpacity);
    const listIds = this.fullList.map((i) => i[0]);
    keys.forEach((key) => {
      if (!listIds.includes(key)) {
        delete this.app.config.selections.chartOpacity[key];
      }
    });
  }

  /**
   * Clean orphaned chartImageAdjustment keys from config
   */
  cleanImageAdjustmentConfig() {
    const keys = Object.keys(this.app.config.selections.chartImageAdjustment);
    const listIds = this.fullList.map((i) => i[0]);
    keys.forEach((key) => {
      if (!listIds.includes(key)) {
        delete this.app.config.selections.chartImageAdjustment[key];
      }
    });
  }

  /**
   * @description True when a chart renders as a raster image layer (raster tiles,
   * tileJSON, WMS, WMTS) — the layers brightness/contrast adjustment applies to.
   * Vector charts (S-57, mapstyleJSON, MVT/PBF tiles) are excluded.
   * @param chart Chart entry
   */
  protected isImageLayer(chart: FBChart): boolean {
    if (chart[0] === 'openstreetmap') {
      return true;
    }
    const type = chart[1]?.type?.toLowerCase();
    const format = chart[1]?.format?.toLowerCase();
    if (!type) {
      return true;
    }
    if (type === 'tilelayer') {
      return !(format === 'pbf' || format === 'mvt');
    }
    return ['tilejson', 'wms', 'wmts'].includes(type);
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

  protected itemOpacity(chart: FBChart) {
    const toPercent = (value: number) => {
      return Number.isFinite(value)
        ? Math.round(Math.min(100, (value ?? 1) * 100))
        : 100;
    };
    const toRatio = (value: number) => {
      return Number.isFinite(value)
        ? Math.min(100, Math.max(0, Math.round(value))) / 100
        : 1;
    };
    const originalOpacity =
      this.app.config.selections.chartOpacity[chart[0]] ??
      chart[1]?.defaultOpacity ??
      1;

    this.dialog
      .open(SliderInputDialog, {
        disableClose: true,
        backdropClass: 'transparent-backdrop',
        data: {
          resId: chart[0],
          title: 'Set Opacity',
          text: chart[1]?.name ?? '',
          value: toPercent(originalOpacity),
          onChange: (value: number) => {
            const fo = toRatio(value);
            if (fo !== chart[1].defaultOpacity) {
              this.skres.chartSetOpacity(chart[0], fo);
            }
          }
        }
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: SliderInputDialogResult) => {
        if (result?.apply) {
          const op = toRatio(result.value);
          this.app.config.selections.chartOpacity[chart[0]] = op;
          chart[1].defaultOpacity = op;
          this.updateFullList(chart);
          this.app.saveConfig();
        } else {
          // cancelled
          this.skres.chartSetOpacity(chart[0], originalOpacity);
          return;
        }
      });
  }

  protected itemImageAdjustment(chart: FBChart) {
    const original: ChartImageAdjustment = {
      brightness: 1,
      contrast: 1,
      ...(this.app.config.selections.chartImageAdjustment[chart[0]] ??
        chart[1]?.imageAdjustment)
    };

    this.dialog
      .open(ImageAdjustmentDialog, {
        disableClose: true,
        backdropClass: 'transparent-backdrop',
        data: {
          title: 'Image Adjustment',
          text: chart[1]?.name ?? '',
          value: { ...original },
          onChange: (value: ChartImageAdjustment) => {
            this.skres.chartSetImageAdjustment(chart[0], value);
          }
        }
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ImageAdjustmentDialogResult) => {
        if (result?.apply) {
          const adj = result.value;
          this.app.config.selections.chartImageAdjustment[chart[0]] = adj;
          chart[1].imageAdjustment = adj;
          this.updateFullList(chart);
          this.app.saveConfig();
        } else {
          // cancelled - restore the pre-edit adjustment
          this.skres.chartSetImageAdjustment(chart[0], original);
        }
      });
  }

  updateFullList(chart: FBChart) {
    const idx = this.fullList.findIndex((i: FBChart) => chart[0] === i[0]);
    if (idx === -1) {
      return;
    }
    this.fullList[idx] = [chart[0], new SKChart(chart[1]), chart[2]];
    this.doFilter();
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
    dref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sources) => {
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
        .pipe(takeUntilDestroyed(this.destroyRef))
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
