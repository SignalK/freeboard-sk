import { Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  SCREEN_CLASSES,
  SCREEN_CLASS_LABELS,
  ScreenClass,
  TABLET_MIN_WIDTH,
  MONITOR_MIN_WIDTH
} from './types';

/** Picks the smallest screen class a widget shows on. */
@Component({
  selector: 'fb-screen-class-picker',
  imports: [MatButtonToggleModule],
  template: `
    <div class="pe-screen-label">Show on</div>
    <mat-button-toggle-group
      hideSingleSelectionIndicator
      [value]="value()"
      (change)="changed.emit($event.value)"
      aria-label="Show on"
    >
      @for (c of classes; track c) {
        <mat-button-toggle [value]="c">{{ labels[c] }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
    <div class="pe-screen-hint">
      Tablets start at {{ tabletWidth }} px wide, monitors at
      {{ monitorWidth }} px. On smaller screens the widget is hidden and its
      place stays free for it.
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .pe-screen-label {
        font-size: 13px;
        margin-bottom: 6px;
      }
      .pe-screen-hint {
        font-size: 12px;
        opacity: 0.7;
        margin-top: 6px;
      }
    `
  ]
})
export class ScreenClassPicker {
  readonly value = input<ScreenClass>('phone');
  readonly changed = output<ScreenClass>();

  protected classes = SCREEN_CLASSES;
  protected labels = SCREEN_CLASS_LABELS;
  protected tabletWidth = TABLET_MIN_WIDTH;
  protected monitorWidth = MONITOR_MIN_WIDTH;
}
