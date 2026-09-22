import { Component, EventEmitter, inject, input, Output } from '@angular/core';

import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { layerIdHint, layerTimeHint, WMTSLayerDef } from './maplib';

/** What a row of the list needs from a WMTS layer (`time` is optional). */
export type NodeListLayer = Pick<
  WMTSLayerDef,
  'id' | 'name' | 'description' | 'time'
>;

/********* NodeList Select ***********/
@Component({
  selector: 'node-list-select',
  imports: [MatListModule, MatIconModule, MatTooltipModule],
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
              <span matListItemTitle>
                @if (timeHint(layer); as hint) {
                  <mat-icon
                    class="_ap-layer-time"
                    aria-hidden="true"
                    [matTooltip]="hint"
                    >schedule</mat-icon
                  >
                }
                {{ layer.name }}
                @if (idHint(layer)) {
                  <span class="_ap-layer-id">({{ idHint(layer) }})</span>
                }
                @if (timeHint(layer); as hint) {
                  <span class="_ap-sr-only">{{ ' ' + hint }}</span>
                }
              </span>
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
      ._ap-node-list ._ap-layer-id {
        margin-left: 0.4em;
        font-size: 0.85em;
        opacity: 0.7;
      }
      ._ap-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      ._ap-node-list ._ap-layer-time {
        margin-right: 0.3em;
        vertical-align: middle;
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.7;
      }
    `
  ]
})
export class NodeListSelect {
  @Output() selected: EventEmitter<string[]> = new EventEmitter<string[]>();
  protected preSelect = input<string[]>([]);
  protected layers = input<NodeListLayer[]>([]);

  private selections: Array<string> = [];

  protected app = inject(AppFacade);

  /** Layer identifier to show beside the title when it disambiguates (#797) */
  protected idHint = (layer: { id: string; name: string }) =>
    layerIdHint(layer.name, layer.id);
  /** Time-dimension summary to show beside a time-varying layer (#808) */
  protected timeHint = (layer: NodeListLayer) => layerTimeHint(layer.time);

  constructor() {}

  /**
   * Handle user check box selection
   * @param e selection change event
   */
  protected handleSelection(e: MatSelectionListChange) {
    this.selections = e.source.selectedOptions.selected.map((opt) => opt.value);
    this.selected.emit(this.selections);
  }
}
