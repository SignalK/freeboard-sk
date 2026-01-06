import { Component, effect, EventEmitter, input, Output } from '@angular/core';

import { MatTreeModule } from '@angular/material/tree';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

import { AppFacade } from 'src/app/app.facade';
import { LayerNode } from './wmslib';

/********* NodeTree Select ***********/
@Component({
  selector: 'node-tree-select',
  imports: [
    MatTreeModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule
  ],
  template: `
    <div class="_ap-node-tree">
      <div>
        <mat-tree
          class="node-tree"
          #tree
          [dataSource]="dataSource"
          [childrenAccessor]="childrenAccessor"
        >
          <mat-nested-tree-node *matTreeNodeDef="let node">
            <mat-checkbox
              [matTooltip]="node.description"
              [checked]="node.selected"
              (change)="toggleSelection($event.checked, node)"
            >
              {{ node.title ?? node.name }}
            </mat-checkbox>
          </mat-nested-tree-node>
          <mat-nested-tree-node
            *matTreeNodeDef="let node; when: hasChild"
            isExpandable
            [isExpanded]="expand()"
          >
            <div class="mat-tree-node">
              <button mat-icon-button matTreeNodeToggle>
                <mat-icon class="mat-icon-rtl-mirror">
                  {{
                    tree.isExpanded(node)
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
                {{ node.title ?? node.name }}
              </mat-checkbox>
            </div>
            <div role="group" [class.tree-invisible]="!tree.isExpanded(node)">
              <ng-container matTreeNodeOutlet></ng-container>
            </div>
          </mat-nested-tree-node>
        </mat-tree>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-node-tree {
      }
      ._ap-node-tree .key-label {
        width: 150px;
        font-weight: 500;
      }
      .node-tree .mat-nested-tree-node div[role='group'] {
        padding-left: 20px;
      }
      .node-tree div[role='group'] > .mat-tree-node {
        padding-left: 20px;
      }
      .node-tree .tree-invisible {
        display: none;
      }
    `
  ]
})
export class NodeTreeSelect {
  @Output() selected: EventEmitter<string[]> = new EventEmitter<string[]>();
  protected preSelect = input<string[]>([]);
  protected layers = input<LayerNode[]>([]);
  protected expand = input<boolean>(false);

  private selections: Array<string> = [];
  protected dataSource: LayerNode[] = [];
  protected childrenAccessor = (node: LayerNode) => node.children ?? [];
  protected hasChild = (_: number, node: LayerNode) =>
    !!node.children && node.children.length > 0;

  constructor(public app: AppFacade) {
    effect(() => {
      if (Array.isArray(this.layers())) {
        this.dataSource = [].concat(this.layers());
      }
      if (Array.isArray(this.preSelect()) && this.preSelect().length) {
        this.dataSource.forEach((l: LayerNode) => {
          this.selectNode(l);
        });
      }
    });
  }

  /**
   * Handle user check box selection
   * @param checked
   * @param node
   */
  protected toggleSelection(checked: boolean, node: LayerNode) {
    this.handleSelection(checked, node);
    this.parseSelections();
    this.selected.emit(this.selections);
  }

  /**
   * Set / clear check box for node and its children
   * @param checked
   * @param node
   */
  private handleSelection(checked: boolean, node: LayerNode) {
    node.selected = checked;
    if (node.children) {
      node.children.forEach((child) => {
        this.handleSelection(checked, child);
      });
    }
  }

  /**
   * Extract selected node names into this.selections
   */
  private parseSelections() {
    this.selections = [];
    this.dataSource.forEach((l: LayerNode) => {
      this.getSelections(l);
    });
  }

  /**
   * Process selected node names into this.selections
   * @param node LayerNode
   */
  private getSelections(node: LayerNode) {
    const selNode = (n: LayerNode) => {
      if (n.selected) {
        if (!this.selections.includes(n.name)) {
          this.selections.push(n.name);
        }
      }
    };
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => this.getSelections(c));
    } else {
      selNode(node);
    }
  }

  /**
   * Align the selection of nodes with this.preSelct()
   * @param node LayerNode
   */
  private selectNode(node: LayerNode) {
    const selNode = (n: LayerNode) => {
      if (this.preSelect().includes(n.name)) {
        n.selected = true;
      }
    };
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => this.selectNode(c));
    } else {
      selNode(node);
    }
  }
}
