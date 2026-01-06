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
import { AppFacade } from 'src/app/app.facade';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { ChartProvider } from 'src/app/types';
import { SKInfoLayer } from '../../custom-resource-classes';
import { WMSGetCapabilities, LayerNode, parseWMSCapabilities } from './wmslib';
import { NodeTreeSelect } from './node-tree-select';

/********* WMSDialog **********
	data: SKChart
***********************************/
@Component({
  selector: 'wms-dialog',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatInputModule,
    NodeTreeSelect
  ],
  template: `
    <div class="_ap-wms">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>public</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Add WMS Source</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        @if (true) {
          <mat-form-field floatLabel="always" style="width:100%">
            <mat-label> WMS host. </mat-label>
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
            <mat-hint> Enter url of the WMS host. </mat-hint>
            @if (txturl.invalid) {
              <mat-error>WMS host is required!</mat-error>
            }
          </mat-form-field>
        }
        @if (isFetching) {
          <mat-progress-bar mode="query"></mat-progress-bar>
        } @else {
          @if (errorMsg) {
            <mat-error>Error retrieving capabilities from server!</mat-error>
          } @else {
            <node-tree-select
              [layers]="dataSource"
              (selected)="handleLayerSelection()"
            >
            </node-tree-select>
          }
        }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button
          mat-raised-button
          [disabled]="this.selections.length === 0"
          (click)="handleSave()"
        >
          Save
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-wms {
      }
      ._ap-wms .key-label {
        width: 150px;
        font-weight: 500;
      }
      .wms-tree .mat-nested-tree-node div[role='group'] {
        padding-left: 20px;
      }
      .wms-tree div[role='group'] > .mat-tree-node {
        padding-left: 20px;
      }
      .wms-tree .tree-invisible {
        display: none;
      }
    `
  ]
})
export class WMSDialog {
  protected isFetching = false;
  protected fetchError = false;
  protected errorMsg = '';
  protected selections: Array<string> = [];
  protected wmsBase: ChartProvider;
  protected wmsSources: { [key: string]: ChartProvider | SKInfoLayer } = {};
  protected hostUrl = '';

  protected dataSource: LayerNode[] = [];

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WMSDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: SKChart) {}

  /**
   * Handle layer selections and build WMS source objects
   */
  protected handleLayerSelection() {
    this.selections = [];
    this.wmsSources = {};
    this.dataSource.forEach((l: LayerNode) => {
      this.parseSelections(l);
    });
  }

  /**
   * Parse selections under the supplied layer node
   * @param node Parent layer
   */
  private parseSelections(node: LayerNode) {
    const selNode = (n: LayerNode) => {
      if (n.selected) {
        if (!this.selections.includes(n.name)) {
          this.selections.push(n.name);
          this.wmsSources[n.name] = this.buildSource(n);
        } else {
          if (
            this.wmsSources[n.name].description === this.wmsSources[n.name].name
          ) {
            this.wmsSources[n.name].description = n.description;
          }
        }
      }
    };
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => this.parseSelections(c));
    } else {
      selNode(node);
    }
  }

  /**
   *
   * @param l Build and return the WMS source object
   * @returns WMS source object
   */
  private buildSource(l: LayerNode): ChartProvider | SKInfoLayer {
    if (this.data.format === 'infolayer') {
      const s = new SKInfoLayer();
      s.name = l.name;
      s.description = l.description;
      s.values.layers = [l.name];
      s.values.time = l.time;
      s.values.url = this.wmsBase.url;
      s.values.sourceType = 'WMS';
      return s;
    } else {
      const s = Object.assign({}, this.wmsBase);
      s.name = l.name;
      s.description = l.description;
      s.layers = [l.name];
      return s;
    }
  }

  /**
   * Close and return WMS objects
   */
  protected handleSave() {
    this.dialogRef.close(Object.values(this.wmsSources));
  }

  /**
   * Retrieve and process capabilities from WMS server
   * @param wmsHost WMS server host url (without parameters)
   */
  protected async getCapabilities(wmsHost: string) {
    this.selections = [];
    this.errorMsg = '';
    try {
      this.isFetching = true;
      const capabilities = await WMSGetCapabilities(wmsHost);
      this.isFetching = false;
      this.dataSource = [];
      if (capabilities && capabilities.Capability) {
        this.wmsBase = {
          name: '',
          description: '',
          type: 'WMS',
          url: wmsHost,
          layers: []
        };
        parseWMSCapabilities(capabilities, this.dataSource);
      } else {
        this.errorMsg = 'Invalid response received!';
      }
    } catch (err) {
      this.isFetching = false;
      this.fetchError = true;
      this.errorMsg = err.message;
    }
  }
}
