import { Component, effect, EventEmitter, input, Output } from '@angular/core';

import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { AppFacade } from 'src/app/app.facade';

/********* NodeList Select ***********/
@Component({
  selector: 'node-list-select',
  imports: [MatListModule],
  template: `
    <div class="_ap-node-list">
      <div>
        <mat-selection-list
          #wlayers
          [multiple]="false"
          (selectionChange)="handleSelection($event)"
        >
          @for (layer of layers(); track layer.name; let idx = $index) {
            <mat-list-option
              [value]="layer.id"
              [selected]="preSelect().includes(layer.id)"
            >
              <span matListItemTitle>{{ layer.name }}</span>
              <span
                style="flex: 1 1 auto;white-space: pre; overflow:hidden;text-overflow:elipsis;"
                >{{ layer.description }}</span
              >
            </mat-list-option>
          }
        </mat-selection-list>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-node-list {
      }
      ._ap-node-list .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class NodeListSelect {
  @Output() selected: EventEmitter<string[]> = new EventEmitter<string[]>();
  protected preSelect = input<string[]>([]);
  protected layers = input<{ id: string; name: string; description: string }[]>(
    []
  );

  private selections: Array<string> = [];

  constructor(public app: AppFacade) {}

  /**
   * Handle user check box selection
   * @param e selection change event
   */
  protected handleSelection(e: MatSelectionListChange) {
    this.selections = e.source.selectedOptions.selected.map((opt) => opt.value);
    this.selected.emit(this.selections);
  }
}
