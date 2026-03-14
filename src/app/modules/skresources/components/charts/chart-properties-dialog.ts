import { Component, inject, Inject, resource, signal } from '@angular/core';
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
import { CoordsPipe } from 'src/app/lib/pipes';
import {
  LayerNode,
  WMSCapabilitiesDef,
  wmsCapabilitiesInWorker,
  WMTSCapabilitiesDef,
  wmtsCapabilitiesInWorker,
  WMTSLayerDef
} from './maplib';
import { NodeTreeSelect } from './node-tree-select';
import { NodeListSelect } from './node-list-select';

/********* ChartPropertiesDialog **********
	data: <SKChart>
***********************************/
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
        <mat-dialog-actions>
          <div style="text-align:center;width:100%;">
            <button
              mat-raised-button
              [disabled]="
                inpname.invalid ||
                (['wms', 'wmts'].includes(data.type.toLowerCase()) &&
                  data.layers.length === 0)
              "
              (click)="handleClose(true)"
            >
              SAVE
            </button>
          </div>
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
  protected wmtsLayers = signal<
    Array<{
      name: string;
      description: string;
      format?: string;
      bounds?: [number, number, number, number];
    }>
  >([]);
  protected isEditable = signal<boolean>(false);
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

  constructor(@Inject(MAT_DIALOG_DATA) public data: SKChart) {
    if (data.source?.toLowerCase() === 'resources-provider') {
      this.isEditable.set(true);
    }
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
        this.wmtsLayers.update(() => this.capabilities.layers);
      }
    } catch (err) {
      this.layerErrorText = 'Error retrieving layers.';
    }
  }

  protected handleLayerSelection(e: string[]) {
    if (this.data.type?.toLowerCase() === 'wmts') {
      const l: WMTSLayerDef = (this.capabilities.layers as WMTSLayerDef[]).find(
        (i: WMTSLayerDef) => i.id === e[0]
      );
      if (l) {
        this.data.format = l.format ? l.format : this.data.format;
        this.data.bounds = l.bounds ? l.bounds : this.data.bounds;
      }
    }
    this.data.layers = e;
  }

  protected handleClose(save: boolean) {
    this.dialogRef.close({
      save: save,
      chart: this.data
    });
  }
}
