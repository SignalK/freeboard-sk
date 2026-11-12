// Widget picker shown after a press-and-hold on an empty anchor cell.
// Lists every widget (across discovered extensions) that fits at the
// pressed cell; a single click places it.

import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ANCHOR_LABELS, AnchorId, ScreenClass, WidgetCandidate } from './types';
import { ScreenClassPicker } from './screen-class-picker.component';

export interface PlotterAddWidgetChoice extends WidgetCandidate {
  minScreen: ScreenClass;
}

export interface PlotterAddWidgetDialogData {
  anchor: AnchorId;
  candidates: WidgetCandidate[];
}

@Component({
  selector: 'fb-plotterext-add-widget',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    ScreenClassPicker
  ],
  template: `
    <div mat-dialog-title class="pe-add-title">
      <mat-icon>widgets</mat-icon>
      <span>Add widget — {{ anchorLabel }}</span>
    </div>
    <mat-dialog-content>
      <fb-screen-class-picker
        [value]="minScreen"
        (changed)="minScreen = $event"
      ></fb-screen-class-picker>
      <mat-action-list>
        @for (c of data.candidates; track c.extension + '/' + c.widget.id) {
          <button mat-list-item (click)="choose(c)">
            <span matListItemTitle>{{ c.widget.title }}</span>
            <span matListItemLine
              >{{ c.extensionName }} · {{ c.widget.size }}</span
            >
          </button>
        }
      </mat-action-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .pe-add-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `
  ]
})
export class PlotterAddWidgetDialog {
  anchorLabel: string;
  minScreen: ScreenClass = 'phone';

  constructor(
    public dialogRef: MatDialogRef<PlotterAddWidgetDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PlotterAddWidgetDialogData
  ) {
    this.anchorLabel = ANCHOR_LABELS[data.anchor];
  }

  choose(candidate: WidgetCandidate) {
    const choice: PlotterAddWidgetChoice = {
      ...candidate,
      minScreen: this.minScreen
    };
    this.dialogRef.close(choice);
  }
}
