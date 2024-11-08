import { Component, Inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BehaviorSubject, of as observableOf } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { AppInfo } from 'src/app/app.info';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { PipesModule } from 'src/app/lib/pipes';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { parseString } from 'xml2js';
import { ChartProvider } from 'src/app/types';

interface LayerNode {
  name: string;
  title?: string;
  description: string;
  children?: LayerNode[];
  selected: boolean;
  parent: LayerNode;
}

/********* WMSDialog **********
	data: <WMSCapabilities.xml>
***********************************/
@Component({
  selector: 'wms-dialog',
  standalone: true,
  imports: [
    MatTreeModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatInputModule,
    PipesModule
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
            (click)="wmsGetCapabilities(txturl.value)"
          >
            <mat-icon>arrow_forward</mat-icon>
          </button>
          }
          <mat-hint> Enter url of the WMS host. </mat-hint>
          @if (txturl.invalid) {
          <mat-error>WMS host is required!</mat-error>
          }
        </mat-form-field>
        } @if (isFetching) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        } @else { @if (errorMsg) {
        <mat-error>Error retrieving capabilities from server!</mat-error>
        } @else {
        <div>
          <mat-tree
            class="wms-tree"
            [dataSource]="nestedDataSource"
            [treeControl]="nestedTreeControl"
          >
            <mat-tree-node *matTreeNodeDef="let node">
              <mat-checkbox
                [matTooltip]="node.description"
                [checked]="node.selected"
                (change)="toggleSelection($event.checked, node)"
              >
                {{ node.name }}
              </mat-checkbox>
            </mat-tree-node>
            <mat-nested-tree-node
              *matTreeNodeDef="let node; when: hasNestedChild"
            >
              <div class="mat-tree-node">
                <button mat-icon-button matTreeNodeToggle>
                  <mat-icon class="mat-icon-rtl-mirror">
                    {{
                      nestedTreeControl.isExpanded(node)
                        ? 'expand_circle_down'
                        : 'chevron_right'
                    }}
                  </mat-icon>
                </button>
                <mat-checkbox
                  [matTooltip]="node.description"
                  [checked]="node.selected"
                  (change)="toggleSelection($event.checked, node)"
                >
                  {{ node.name }}
                </mat-checkbox>
              </div>
              <div
                role="group"
                [class.tree-invisible]="!nestedTreeControl.isExpanded(node)"
              >
                <ng-container matTreeNodeOutlet></ng-container>
              </div>
            </mat-nested-tree-node>
          </mat-tree>
        </div>
        } }
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
  protected wmsSources: { [key: string]: ChartProvider } = {};
  protected hostUrl = '';

  protected layerNodes: LayerNode[] = [];
  nestedTreeControl: NestedTreeControl<LayerNode>;
  nestedDataSource: MatTreeNestedDataSource<LayerNode>;
  dataChange: BehaviorSubject<LayerNode[]> = new BehaviorSubject<LayerNode[]>(
    []
  );
  private _getChildren = (node: LayerNode) => {
    return observableOf(node.children);
  };
  hasNestedChild = (_: number, nodeData: LayerNode) => {
    return nodeData.children && nodeData.children.length !== 0;
  };

  constructor(
    public app: AppInfo,
    public dialogRef: MatDialogRef<WMSDialog>,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: SKChart
  ) {
    this.nestedTreeControl = new NestedTreeControl<LayerNode>(
      this._getChildren
    );
    this.nestedDataSource = new MatTreeNestedDataSource();

    this.dataChange.subscribe((data) => (this.nestedDataSource.data = data));

    this.dataChange.next([]);
  }

  toggleSelection(checked: boolean, node: LayerNode) {
    this.handleSelection(checked, node);
    this.parseSelections();
  }

  private handleSelection(checked: boolean, node: LayerNode) {
    node.selected = checked;
    if (node.children) {
      node.children.forEach((child) => {
        this.handleSelection(checked, child);
      });
    }
    this.checkAllParents(node);
  }

  private checkAllParents(node: LayerNode) {
    if (node.parent) {
      const descendants = this.nestedTreeControl.getDescendants(node.parent);
      node.parent.selected = descendants.every((child) => child.selected);
      this.checkAllParents(node.parent);
    }
  }

  private parseSelections() {
    this.selections = [];
    this.wmsSources = {};
    this.layerNodes.forEach((l: LayerNode) => {
      this.getSelections(l);
    });
  }

  private buildSource(l: LayerNode): ChartProvider {
    const s = Object.assign({}, this.wmsBase);
    s.name = l.name;
    s.description = l.description;
    s.layers = [l.name];
    return s;
  }

  private getSelections(node: LayerNode) {
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
    selNode(node);
    const descendants = this.nestedTreeControl.getDescendants(node);
    descendants
      .filter((l) => l.selected && !this.selections.includes(l.name))
      .forEach((l) => selNode(l));
  }

  handleSave() {
    this.dialogRef.close(Object.values(this.wmsSources));
  }

  /** Make requests to WMS server */
  wmsGetCapabilities(wmsHost: string) {
    this.selections = [];
    this.errorMsg = '';

    const url = wmsHost + `?request=getcapabilities&service=wms`;
    this.isFetching = true;
    this.http.get(url, { responseType: 'text' }).subscribe(
      (res: string) => {
        this.isFetching = false;
        this.layerNodes = [];
        if (res.indexOf('<Capability') !== -1) {
          this.parseCapabilities(res, wmsHost);
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

  /** Parse WMSCapabilities.xml */
  parseCapabilities(xml: string, urlBase: string) {
    this.wmsBase = {
      name: '',
      description: '',
      type: 'WMS',
      url: urlBase,
      layers: []
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseString(xml, (err: Error, result: any) => {
      if (err) {
        this.errorMsg = 'ERROR parsing XML!';
        console.log('EROR parsing XML!', err);
      } else {
        if (!result.WMS_Capabilities && !result.WMT_MS_Capabilities) {
          this.errorMsg = 'ERROR Unable to get Capabilities!';
          console.log('ERROR Unable to get Capabilities!', err);
        } else {
          this.getWMSLayers(result);
        }
      }
    });
  }

  /** Retrieve the available layers from WMS Capabilities metadata */
  getWMSLayers(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: { [key: string]: any }
  ): ChartProvider[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rootNode: any;
    if (json.WMS_Capabilities) {
      rootNode = json.WMS_Capabilities;
    } else if (json.WMT_MS_Capabilities) {
      rootNode = json.WMT_MS_Capabilities;
    }

    if (!rootNode.Capability[0].Layer) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rootNode.Capability[0].Layer.forEach((layer: any) => {
      this.parselayer(layer, this.layerNodes);
    });
    this.layerNodes.sort((a, b) => (a.name < b.name ? -1 : 1));
    this.dataChange.next(this.layerNodes);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parselayer(layer: any, cList: LayerNode[], parent: LayerNode = null) {
    const node: LayerNode = {
      name: layer['Name'] ? layer['Name'][0] : '',
      description: layer['Abstract'] ? layer['Abstract'][0] : '',
      selected: false,
      parent: parent
    };
    if (layer['Title']) {
      node.title = layer['Title'][0];
    }
    if (layer.Layer) {
      node.children = [];
      layer.Layer.forEach((l) => this.parselayer(l, node.children));
    }
    cList.push(node);
  }
}
