import { Component, Inject } from '@angular/core';
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
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { AppFacade } from 'src/app/app.facade';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChartProvider } from 'src/app/types';
import { SKInfoLayer } from '../../custom-resource-classes';
import { WMTSCapabilities } from 'ol/format';

/********* WMTSDialog **********
	data: <WMTSCapabilities.xml>
***********************************/
@Component({
  selector: 'wmts-dialog',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatInputModule,
    MatListModule
  ],
  template: `
    <div class="_ap-wmts">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>public</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Add WMTS Source</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        @if (true) {
        <mat-form-field floatLabel="always" style="width:100%">
          <mat-label> WMTS host. </mat-label>
          <input matInput #txturl type="url" required [(value)]="hostUrl" />
          @if (txturl) {
          <button
            matSuffix
            mat-icon-button
            [disabled]="txturl.value.length === 0"
            (click)="wmtsGetCapabilities(txturl.value)"
          >
            <mat-icon>arrow_forward</mat-icon>
          </button>
          }
          <mat-hint> Enter url of the WMTS host. </mat-hint>
          @if (txturl.invalid) {
          <mat-error>WMTS host is required!</mat-error>
          }
        </mat-form-field>
        } @if (isFetching) {
        <mat-progress-bar mode="query"></mat-progress-bar>
        } @else { @if (errorMsg) {
        <mat-error>Error retrieving capabilities from server!</mat-error>
        } @else {
        <div>
          @if (wmtsLayers.length > 0) {
          <div style="height: 200px;overflow-x: hidden;overflow-y: auto;">
            <mat-selection-list
              #wlayers
              (selectionChange)="handleSelection($event)"
            >
              @for(layer of wmtsLayers; track layer; let idx = $index) {
              <mat-list-option [value]="idx">
                <span matListItemTitle>{{ layer.name }}</span>
                <span
                  style="flex: 1 1 auto;white-space: pre; overflow:hidden;text-overflow:elipsis;"
                  >{{ layer.description }}</span
                >
              </mat-list-option>
              }
            </mat-selection-list>
          </div>
          <p>
            Selected: {{ wlayers.selectedOptions.selected.length }} of
            {{ wmtsLayers.length }}
          </p>
          }
        </div>
        } }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button
          mat-raised-button
          [disabled]="selections.length === 0"
          (click)="handleSave()"
        >
          Save
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-wmts {
      }
      ._ap-wmts .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class WMTSDialog {
  protected isFetching = false;
  protected fetchError = false;
  protected errorMsg = '';
  protected wmtsLayers: Array<ChartProvider | SKInfoLayer> = [];
  protected selections: Array<number> = [];
  protected selectionInfo: Array<{ name: string; description: string }> = [];
  protected hostUrl = '';

  constructor(
    public app: AppFacade,
    public dialogRef: MatDialogRef<WMTSDialog>,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: SKChart
  ) {}

  handleSelection(e: MatSelectionListChange) {
    this.selections = e.source.selectedOptions.selected.map((opt) => opt.value);
  }

  handleSave() {
    const sources: Array<ChartProvider | SKInfoLayer> = this.selections.map(
      (layerIdx) => this.wmtsLayers[layerIdx]
    );
    this.dialogRef.close(sources);
  }

  /** Make requests to WMTS server */
  wmtsGetCapabilities(wmtsHost: string) {
    this.selections = [];
    this.selectionInfo = [];
    this.wmtsLayers = [];
    this.errorMsg = '';

    const url = wmtsHost + `?request=GetCapabilities&service=wmts`;
    this.isFetching = true;
    this.http.get(url, { responseType: 'text' }).subscribe(
      (res: string) => {
        this.isFetching = false;
        if (res.indexOf('<Capabilities') !== -1) {
          const parser = new WMTSCapabilities();
          const r = parser.read(res);
          if (r.Contents?.Layer) {
            this.wmtsLayers = this.getWMTSLayers(
              r.Contents?.Layer,
              wmtsHost
            ).sort((a, b) => (a.name < b.name ? -1 : 1));
          }
        } else {
          this.errorMsg = 'Invalid response received!';
        }
      },
      (err: HttpErrorResponse) => {
        this.isFetching = false;
        this.fetchError = true;
        this.errorMsg = err.message;
      }
    );
  }

  /** Retrieve the available layers from WMTS Capabilities metadata */
  getWMTSLayers(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layers: { [key: string]: any },
    urlBase: string
  ): Array<ChartProvider | SKInfoLayer> {
    const maps: Array<ChartProvider | SKInfoLayer> = [];
    if (!layers) {
      return maps;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layers.forEach((layer: any) => {
      const ch = this.parseLayerEntry(layer, urlBase);
      if (ch) {
        maps.push(ch);
      }
    });
    return maps;
  }

  /** Parse WMTS layer entry */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseLayerEntry(
    layer: any,
    urlBase: string
  ): ChartProvider | SKInfoLayer | null {
    if (layer.Identifier) {
      if (this.data.format === 'infolayer') {
        const l = new SKInfoLayer();
        l.name = layer.Title ?? 'Untitled layer';
        l.description = layer.Abstract ?? '';
        l.values.layers = [layer.Identifier];
        l.values.url = urlBase;
        l.values.sourceType = 'WMTS';
        return l;
      } else {
        const l: ChartProvider = {
          name: layer.Title ?? 'Untitled layer',
          description: layer.Abstract ?? '',
          type: 'WMTS',
          url: urlBase,
          layers: [layer.Identifier]
        };
        if (
          Array.isArray(layer.WGS84BoundingBox) &&
          layer.WGS84BoundingBox.length > 0
        ) {
          l.bounds = layer.WGS84BoundingBox;
        }
        if (Array.isArray(layer.Format) && layer.Format.length > 0) {
          const f = layer.Format[0];
          l.format = f.includes('jpg') ? 'jpg' : 'png';
        } else {
          l.format = 'png';
        }
        return l;
      }
    } else {
      return null;
    }
  }
}
