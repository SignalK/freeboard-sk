import { Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { AppFacade } from 'src/app/app.facade';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { ChartTimeDimension } from 'src/app/types';
import { CoordsPipe } from 'src/app/lib/pipes';
import {
  chartDescriptionFromAbstract,
  chartTimeFromLayers,
  getLayerNodeByName,
  isPlaceholderChartName,
  LayerNode,
  WMSCapabilitiesDef,
  wmsCapabilitiesInWorker,
  WMTSCapabilitiesDef,
  wmtsCapabilitiesInWorker,
  WMTSLayerDef
} from './maplib';
import {
  isWholeMinutes,
  refreshIntervalFromMinutes,
  refreshIntervalMinutes
} from 'src/app/lib/chart-refresh';
import { defaultChartRefreshIntervalMs } from 'src/app/lib/chart-time';
import { NodeTreeSelect } from './node-tree-select';
import { NodeListSelect } from './node-list-select';

@Component({
  selector: 'ap-chartproperties',
  imports: [
    FormsModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatInputModule,
    CoordsPipe,
    NodeTreeSelect,
    NodeListSelect
  ],
  template: `
    <div class="_ap-chartinfo">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"
          ><mat-icon>{{ isLocal(data['url']) }}</mat-icon></span
        >
        <span style="flex: 1 1 auto; text-align: center">Chart Properties</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <div style="display:flex;flex-direction: column;">
          <div style="display:flex;">
            <div class="key-label">Name:</div>
            <div style="flex: 1 1 auto;">
              <mat-form-field floatLabel="always" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  #inpname="ngModel"
                  type="text"
                  required
                  [readonly]="!isEditable()"
                  [(ngModel)]="data.name"
                />
                @if (inpname.invalid && (inpname.dirty || inpname.touched)) {
                  <mat-error> Please enter a name.</mat-error>
                }
              </mat-form-field>
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Description:</div>
            <div style="flex: 1 1 auto;">
              <mat-form-field floatLabel="always" style="width:100%">
                <mat-label>Description</mat-label>
                <input
                  matInput
                  #inpdesc="ngModel"
                  type="text"
                  [readonly]="!isEditable()"
                  [(ngModel)]="data.description"
                />
              </mat-form-field>
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Scale:</div>
            <div style="flex: 1 1 auto;">{{ data.scale }}</div>
          </div>
          @if (data.defaultOpacity) {
            <div style="display:flex;">
              <div class="key-label">Opacity:</div>
              <div style="flex: 1 1 auto;">{{ data.defaultOpacity }}</div>
            </div>
          }
          @if (isEditable() && supportsRefresh()) {
            <div style="display:flex;">
              <div class="key-label">Auto refresh:</div>
              <div style="flex: 1 1 auto;">
                <mat-form-field floatLabel="always" style="width:100%">
                  <mat-label>Refresh interval (minutes)</mat-label>
                  <input
                    matInput
                    #inprefresh="ngModel"
                    type="number"
                    min="0"
                    step="1"
                    [(ngModel)]="refreshMinutes"
                    (ngModelChange)="refreshEdited = true"
                  />
                  <mat-hint>0 = never refresh</mat-hint>
                  @if (inprefresh.invalid) {
                    <mat-error>Enter 0 or a whole number of minutes.</mat-error>
                  }
                </mat-form-field>
              </div>
            </div>
          } @else if (refreshMinutes > 0) {
            <div style="display:flex;">
              <div class="key-label">Auto refresh:</div>
              <div style="flex: 1 1 auto;">every {{ refreshMinutes }} min</div>
            </div>
          }
          <div style="display:flex;">
            <div class="key-label">Zoom:</div>
            <div style="flex: 1 1 auto;">
              <div style="flex: 1 1 auto;">
                <u><i>Min: </i></u>
                {{ data.minZoom }},
                <u><i>Max: </i></u>
                {{ data.maxZoom }}
              </div>
            </div>
          </div>
          @if (data.bounds) {
            <div style="display:flex;">
              <div class="key-label">Bounds:</div>
              <div
                style="flex: 1 1 auto; border: gray 1px solid;
                                  max-width: 220px;font-size: 10pt;"
              >
                <div style="text-align:right;">
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="data.bounds[3] | coords: 'HDd' : true"
                  >
                  </span
                  ><br />
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="data.bounds[2] | coords: 'HDd'"
                  >
                  </span>
                </div>
                <div>
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="data.bounds[1] | coords: 'HDd' : true"
                  >
                  </span
                  ><br />
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="data.bounds[0] | coords: 'HDd'"
                  >
                  </span>
                </div>
              </div>
            </div>
          }
          <div style="display:flex;">
            <div class="key-label">Format:</div>
            <div style="flex: 1 1 auto;">{{ data.format }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Type:</div>
            <div style="flex: 1 1 auto;">
              {{ data.type }}
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">URL:</div>
            <div style="flex: 1 1 auto;overflow-x: auto;">
              {{ data.url }}
            </div>
          </div>
          @if (data.style) {
            <div style="display:flex;">
              <div class="key-label">Style:</div>
              <div style="flex: 1 1 auto;overflow-x: auto;">
                {{ data.style }}
              </div>
            </div>
          }
          @if (data.source) {
            <div style="display:flex;">
              <div class="key-label">Source:</div>
              <div style="flex: 1 1 auto;overflow-x: auto;">
                {{ data.source }}
              </div>
            </div>
          }
          @if (
            isEditable() && ['wms', 'wmts'].includes(data.type.toLowerCase())
          ) {
            <div style="">
              <div class="key-label">Layers:</div>
              <div style="flex: 1 1 auto;">
                @if (capabilitiesResource.isLoading()) {
                  <mat-progress-bar mode="query"></mat-progress-bar>
                } @else {
                  @if (layerErrorText.length) {
                    <div style="display:flex;">
                      <div class="key-label"></div>
                      <div style="flex: 1 1 auto;">
                        {{ data.layers }}
                      </div>
                    </div>
                  } @else if (data.type.toLowerCase() === 'wms') {
                    <node-tree-select
                      [layers]="wmsLayers()"
                      [preSelect]="data.layers"
                      [expand]="true"
                      (selected)="handleLayerSelection($event)"
                    >
                    </node-tree-select>
                  } @else if (data.type.toLowerCase() === 'wmts') {
                    <node-list-select
                      [layers]="wmtsLayers()"
                      [preSelect]="data.layers"
                      (selected)="handleLayerSelection($event)"
                    >
                    </node-list-select>
                  }
                }
              </div>
            </div>
          } @else if (data.layers.length) {
            <div style="display:flex;">
              <div class="key-label">Layers:</div>
              <div style="flex: 1 1 auto;">
                {{ data.layers }}
              </div>
            </div>
          }
        </div>
      </mat-dialog-content>
      @if (isEditable()) {
        <mat-dialog-actions align="right">
          <button
            mat-flat-button
            [disabled]="
              inpname.invalid ||
              refreshInvalid() ||
              (['wms', 'wmts'].includes(data.type.toLowerCase()) &&
                data.layers.length === 0)
            "
            (click)="handleClose(true)"
          >
            SAVE
          </button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [
    `
      ._ap-chartinfo {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-chartinfo .key-label {
        width: 150px;
        font-weight: 500;
      }

      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
        .ap-confirm-icon {
          min-width: 25%;
          max-width: 25%;
        }
      }
    `
  ]
})
export class ChartPropertiesDialog {
  protected icon: string;
  protected wmsLayers = signal<LayerNode[]>([]);
  protected wmtsLayers = signal<WMTSLayerDef[]>([]);
  protected isEditable = signal<boolean>(false);
  // Auto-refresh cadence as the user edits it. The resource stores
  // milliseconds; the field is in whole minutes, 0 meaning never.
  protected refreshMinutes = 0;
  // Set once the user touches the refresh field: from then on it is theirs,
  // whatever it holds (a typed 0 is a decision, not the initial blank).
  protected refreshEdited = false;
  // What the last layer pick filled in on the user's behalf (#808). A field
  // still holding its pre-filled value is re-filled by the next pick; one the
  // user has since edited is left alone.
  private autoFilled: {
    name?: string;
    description?: string;
    refreshMinutes?: number;
  } = {};
  protected layerErrorText = '';
  private capabilities!: WMTSCapabilitiesDef | WMSCapabilitiesDef;

  protected capabilitiesParam = signal<{ url: string; type: string }>({
    url: null,
    type: null
  });

  protected capabilitiesResource = resource({
    params: () => this.capabilitiesParam(),
    loader: ({ params }) => this.fetchCapabilities(params.url, params.type)
  });

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<ChartPropertiesDialog>);
  protected data = inject<SKChart>(MAT_DIALOG_DATA);

  constructor() {
    if (this.data.source?.toLowerCase() === 'resources-provider') {
      this.isEditable.set(true);
    }
    this.refreshMinutes = refreshIntervalMinutes(this.data.refreshInterval);
  }

  /**
   * Only raster charts are auto-refreshed (see `ChartResource.refreshInterval`),
   * so a Mapbox-style vector source gets no interval field.
   */
  protected supportsRefresh(): boolean {
    return this.data.type?.toLowerCase() !== 'mapstylejson';
  }

  /** A blank field means never; anything else must be whole, non-negative minutes. */
  protected refreshInvalid(): boolean {
    return !isWholeMinutes(this.refreshMinutes);
  }

  ngOnInit() {
    if (['wms', 'wmts'].includes(this.data.type?.toLowerCase())) {
      this.capabilitiesParam.update(() => {
        return {
          url: this.data.url,
          type: this.data.type.toLowerCase()
        };
      });
    }
  }

  isLocal(url: string) {
    return url && url.indexOf('signalk') !== -1 ? 'map' : 'language';
  }

  /**
   * Fetch capabilities from map server
   * @param url Chart url
   * @param chartType wms | wmts
   */
  private async fetchCapabilities(url: string, chartType: string) {
    if (!url) return;
    try {
      if (chartType === 'wms') {
        this.capabilities = await wmsCapabilitiesInWorker(url);
        this.wmsLayers.update(() => this.capabilities.layers as LayerNode[]);
      } else if (chartType === 'wmts') {
        this.capabilities = await wmtsCapabilitiesInWorker(url);
        this.wmtsLayers.update(
          () => this.capabilities.layers as WMTSLayerDef[]
        );
      }
    } catch {
      this.layerErrorText = 'Error retrieving layers.';
    }
  }

  protected handleLayerSelection(e: string[]) {
    // The time dimension follows the selected layer(s): a chart re-pointed at a
    // layer without one stops being time-varying.
    let picked: { title: string; description: string } | undefined;
    if (this.data.type?.toLowerCase() === 'wmts') {
      const l: WMTSLayerDef = (this.capabilities.layers as WMTSLayerDef[]).find(
        (i: WMTSLayerDef) => i.id === e[0]
      );
      if (l) {
        this.data.format = l.format ? l.format : this.data.format;
        this.data.bounds = l.bounds ? l.bounds : this.data.bounds;
        picked = { title: l.name, description: l.description };
      }
    } else {
      const node = getLayerNodeByName(
        e[0],
        this.capabilities.layers as LayerNode[]
      );
      if (node) {
        picked = {
          title: node.title ?? node.name,
          description: node.description
        };
      }
    }
    const time = chartTimeFromLayers(this.capabilities, e);
    if (time) {
      this.data.time = time;
    } else {
      delete this.data.time;
    }
    this.data.layers = e;
    if (picked) {
      this.fillFromLayer(picked, time);
    }
  }

  /**
   * Fill in what the picked layer can tell us, without touching anything the
   * user has typed (#808): a chart still carrying its placeholder name takes
   * the layer's title and the first clause of its abstract, and one pointed
   * at a time-varying layer with no refresh interval gets a sensible cadence,
   * since *never* is almost always wrong for a radar or satellite product.
   * Each value is remembered so a later pick can replace it -- but not a
   * value the user has changed.
   * @param layer Title / abstract of the (first) selected layer
   * @param time The chart's time dimension after this pick, if any
   */
  private fillFromLayer(
    layer: { title: string; description: string },
    time?: ChartTimeDimension
  ) {
    const nameIsOurs =
      isPlaceholderChartName(this.data.name) ||
      (this.autoFilled.name !== undefined &&
        this.data.name === this.autoFilled.name);
    if (nameIsOurs && layer.title?.trim()) {
      this.data.name = this.autoFilled.name = layer.title.trim();
      const descriptionIsOurs =
        !this.data.description?.trim() ||
        this.data.description === this.autoFilled.description;
      if (descriptionIsOurs) {
        this.data.description = this.autoFilled.description =
          chartDescriptionFromAbstract(layer.description);
      }
    }
    const refreshIsOurs =
      !this.refreshEdited &&
      (!this.refreshMinutes ||
        this.refreshMinutes === this.autoFilled.refreshMinutes);
    if (!refreshIsOurs) {
      return;
    }
    if (time) {
      this.refreshMinutes = this.autoFilled.refreshMinutes =
        refreshIntervalMinutes(defaultChartRefreshIntervalMs(time));
    } else if (this.autoFilled.refreshMinutes !== undefined) {
      // The cadence was for a time-varying layer; this one is static.
      this.refreshMinutes = 0;
      delete this.autoFilled.refreshMinutes;
    }
  }

  protected handleClose(save: boolean) {
    if (save && this.isEditable() && this.supportsRefresh()) {
      // Leave the key off the resource when the chart does not refresh, the
      // same as a provider that never declared one.
      const iv = refreshIntervalFromMinutes(this.refreshMinutes);
      if (iv === undefined) {
        delete this.data.refreshInterval;
      } else {
        this.data.refreshInterval = iv;
      }
    }
    this.dialogRef.close({
      save: save,
      chart: this.data
    });
  }
}
