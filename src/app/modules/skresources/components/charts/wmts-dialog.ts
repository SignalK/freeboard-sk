import { Component, inject, Inject } from '@angular/core';
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
import { ChartProvider } from 'src/app/types';
import { SKInfoLayer } from '../../custom-resource-classes';
import { WMTSLayerDef } from './maplib';
import { wmtsCapabilitiesInWorker } from './maplib';

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
                (click)="getCapabilities(txturl.value)"
              >
                <mat-icon>arrow_forward</mat-icon>
              </button>
            }
            <mat-hint> Enter url of the WMTS host. </mat-hint>
            @if (txturl.invalid) {
              <mat-error>WMTS host is required!</mat-error>
            }
          </mat-form-field>
        }
        @if (isFetching) {
          <mat-progress-bar mode="query"></mat-progress-bar>
        } @else {
          @if (errorMsg) {
            <mat-error>Error retrieving capabilities from server!</mat-error>
          } @else {
            <div>
              @if (wmtsLayers.length > 0) {
                <div style="height: 200px;overflow-x: hidden;overflow-y: auto;">
                  <mat-selection-list
                    #wlayers
                    [multiple]="false"
                    (selectionChange)="handleSelection($event)"
                  >
                    @for (layer of wmtsLayers; track layer; let idx = $index) {
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
              }
            </div>
          }
        }
      </mat-dialog-content>
      @if (data.format !== 'chartprovider') {
        <mat-dialog-actions>
          <button
            mat-raised-button
            [disabled]="selections.length === 0"
            (click)="handleSave()"
          >
            Save
          </button>
        </mat-dialog-actions>
      }
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
  protected wmtsLayers: WMTSLayerDef[] = [];
  protected selections: Array<number> = [];
  protected selectionInfo: Array<{ name: string; description: string }> = [];
  protected hostUrl = '';

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WMTSDialog>);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      format: 'chartprovider' | 'infolayer';
    }
  ) {}

  handleSelection(e: MatSelectionListChange) {
    this.selections = e.source.selectedOptions.selected.map((opt) => opt.value);
  }

  handleSave() {
    let l: SKInfoLayer;
    const layer = this.wmtsLayers[this.selections[0]];
    l = new SKInfoLayer();
    l.name = layer.name ?? 'Untitled layer';
    l.description = layer.description ?? '';
    l.values.layers = [layer.id];
    l.values.url = this.hostUrl;
    l.values.sourceType = 'WMTS';
    if (layer.time) {
      l.values.time = layer.time;
    }
    this.dialogRef.close([l]);
  }

  /**
   * Retrieve and process capabilities from WMS server
   * @param wmtsHost WMTS server host url (without parameters)
   */
  async getCapabilities(wmtsHost: string) {
    this.selections = [];
    this.selectionInfo = [];
    this.wmtsLayers = [];
    this.errorMsg = '';
    this.hostUrl = wmtsHost;
    try {
      if (this.data.format === 'chartprovider') {
        this.dialogRef.close([
          {
            name: 'New WMTS Chart',
            description: '',
            type: 'WMTS',
            url: wmtsHost,
            format: 'png',
            layers: []
          }
        ]);
        return;
      }
      this.isFetching = true;
      const capabilities = await wmtsCapabilitiesInWorker(wmtsHost);
      this.isFetching = false;
      this.wmtsLayers = capabilities.layers;
    } catch (err) {
      this.isFetching = false;
      this.fetchError = true;
      this.errorMsg = err.message;
    }
  }
}
