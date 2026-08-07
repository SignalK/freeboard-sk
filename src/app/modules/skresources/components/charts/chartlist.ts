import {
  Component,
  ChangeDetectionStrategy,
  effect,
  signal,
  input,
  inject,
  output,
  untracked,
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
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray
} from '@angular/cdk/drag-drop';

import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { FBCharts, FBChart } from 'src/app/types';
import { WMTSDialog } from './wmts-dialog';
import { WMSDialog } from './wms-dialog';
import { JsonMapSourceDialog } from './jsonmapsource-dialog';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { ResourceListBase } from '../resource-list-baseclass';
import { FBMapInteractService } from 'src/app/modules/map/fbmap-interact.service';
import {
  displayMinZoomLabel,
  SingleSelectListDialog,
  SliderInputDialog,
  SliderInputDialogResult
} from 'src/app/lib/components';
import {
  isChartInView,
  isZoomWithinLayerRange,
  resolveLayerZoomRange
} from 'src/app/modules/map/ol/lib/charts/chart-utils';
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
    DragDropModule
  ]
})
export class ChartListComponent extends ResourceListBase {
  closed = output<void>();

  selectedCharts = input<string[]>();

  protected override fullList: FBCharts = [];
  protected override filteredList = signal<FBCharts>([]);

  protected inViewOnly = false;

  protected app = inject(AppFacade);
  private worker = inject(SKWorkerService);
  private dialog = inject(MatDialog);
  private skgroups = inject(SKResourceGroupService);
  private mapInteract = inject(FBMapInteractService);
  private destroyRef = inject(DestroyRef);

  constructor(protected override skres: SKResourceService) {
    super('charts', skres);
    // selection.charts changed
    //
    // Both this effect and the map-view one below end in doFilter(), which
    // writes the filteredList signal and then reads it back (alignSelections).
    // Tracked, that read makes each effect a dependent of the other's write, so
    // with the in-view filter on, one map move ping-pongs them forever (#617).
    // Their triggers are the signals read outside untracked(); the rest is
    // side effect.
    effect(() => {
      if (this.selectedCharts()) {
        untracked(() => this.externalSelection());
      }
    });
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.charts')) {
        this.initItems(true);
      }
    });
    // re-apply the filter as the map view changes while the in-view filter is on
    effect(() => {
      this.app.mapExtent();
      if (this.inViewOnly) {
        untracked(() => this.doFilter());
      }
    });
  }

  ngOnInit() {
    this.app.data.chartBounds.show = false;
    this.app.data.chartBounds.charts = [];
    this.initItems();
  }

  /**
   * @description True when rows may be dragged to re-order the chart layers.
   * A filtered list shows a subset, and dropping a row within a subset has no
   * unambiguous meaning in the full order -- charts hidden between the drag
   * source and its target would move unpredictably.
   */
  protected canReorder(): boolean {
    return !this.filterText && !this.inViewOnly;
  }

  /**
   * @description Re-order the chart layers from a dropped row.
   * @param e Drop event
   */
  protected drop(e: CdkDragDrop<FBCharts>) {
    if (!this.canReorder() || e.previousIndex === e.currentIndex) {
      return;
    }
    const ordered = this.filteredList().slice();
    moveItemInArray(ordered, e.previousIndex, e.currentIndex);
    // The list reads top layer first, which is what setChartsOrder() takes. It
    // keeps ids the list does not carry -- charts from a provider that is down
    // this session still hold their place in the stack.
    this.skres.setChartsOrder(ordered.map((c) => c[0]));
    this.doFilter();
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

  /**
   * @description Compact label for a chart's configured display minimum zoom.
   * @param chart Chart entry
   */
  protected minZoomLabelFor(chart: FBChart): string {
    // Only the raster layers honour a display minimum, so only they may claim
    // one -- the control is likewise offered on `isImageLayer` charts alone.
    return this.isImageLayer(chart)
      ? displayMinZoomLabel(chart[1]?.displayMinZoom)
      : '';
  }

  /**
   * @description True when a selected chart is not drawn at the current map
   * zoom. Only charts carrying a display minimum are marked, since the notice
   * hangs off that label -- but the test is the layer's whole resolved range,
   * so a chart held back by its own declared bounds still reports itself
   * hidden rather than appearing to be on. Resolved the way the map layer
   * resolves it, so the list cannot claim a chart is showing when it is not.
   * @param chart Chart entry
   */
  protected isBoundedOut(chart: FBChart): boolean {
    if (
      !chart[2] ||
      !this.isImageLayer(chart) ||
      typeof chart[1]?.displayMinZoom !== 'number'
    ) {
      return false;
    }
    return !isZoomWithinLayerRange(
      resolveLayerZoomRange(
        chart[1],
        this.app.MAP_ZOOM_EXTENT.max,
        this.app.config.map.overZoomTiles
      ),
      this.app.mapZoom()
    );
  }

  protected itemDisplayMinZoom(chart: FBChart) {
    // The list stays open: balancing an overlapping set means moving between
    // charts, and the list is where their levels and hidden state are shown --
    // so the applied value has to land on the list's own copy of the chart, or
    // the row keeps reporting the state from before the edit.
    this.skres.openDisplayMinZoom(chart, (value?: number) => {
      chart[1].displayMinZoom = value;
      this.updateFullList(chart);
    });
  }

  protected itemImageAdjustment(chart: FBChart) {
    // The palette is modeless and owned by the service, and the list stays open
    // beside it: adjusting one chart of a stack usually means adjusting more.
    this.skres.openImageAdjustment(chart);
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
   * @description Toggle filtering of the chart list to the current map view.
   */
  protected toggleInViewOnly(checked: boolean) {
    this.inViewOnly = checked;
    this.doFilter();
  }

  /**
   * @description Order charts to match the Re-order (Chart Order) screen — top
   * layer first — additionally restricting the list to charts visible in the
   * current map view when the in-view filter is on.
   */
  protected override doFilter() {
    const text = this.filterText?.toLowerCase() ?? '';
    const extent = this.app.mapExtent();
    const useExtent =
      this.inViewOnly && Array.isArray(extent) && extent.length === 4;
    // Present the list in the user-chosen layer order (top layer first), the
    // same ordering the Re-order screen uses, so the two screens agree.
    const ordered = this.skres
      .arrangeChartLayers(this.fullList.slice())
      .reverse();
    const fl = ordered.filter((item) => {
      if (text && !item[1].name?.toLowerCase().includes(text)) {
        return false;
      }
      return useExtent ? isChartInView(item[1].bounds, extent) : true;
    });
    this.filteredList.update(() => fl.slice(0));
    this.alignSelections();
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
