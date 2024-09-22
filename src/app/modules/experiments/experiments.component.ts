/** Experiments Components **
 ********************************/

import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { CommonDialogs } from 'src/app/lib/components/dialogs';

/********* ExperimentsComponent ********/
@Component({
  selector: 'fb-experiments',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    CommonDialogs
  ],
  template: `
    <mat-menu #experimentsmenu="matMenu">
      <!--
      <a mat-menu-item (click)="handleSelect('exp_id_here')">
          <mat-icon>filter_drama</mat-icon>
          <span>EXP_NAME_HERE</span>			
      </a>
      <a mat-menu-item [disabled]="true">
        <span>None Available</span>
      </a>
      -->
      <a mat-menu-item (click)="handleSelect('debugCapture')">
        <mat-icon>adb</mat-icon>
        <span>Capture Debug Info</span>
      </a>
    </mat-menu>

    <div>
      <button
        class="button-toolbar"
        mat-mini-fab
        [matMenuTriggerFor]="experimentsmenu"
        matTooltip="Experiments"
        matTooltipPosition="left"
      >
        <mat-icon>science</mat-icon>
      </button>
    </div>
  `,
  styles: [``]
})
export class ExperimentsComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() selected: EventEmitter<any> = new EventEmitter();

  //constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect(choice: string, value?: any) {
    this.selected.emit({ choice: choice, value: value });
  }
}
