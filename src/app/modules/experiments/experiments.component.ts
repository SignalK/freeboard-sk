/** Experiments Components **
 ********************************/

import { Component, Output, EventEmitter } from '@angular/core';

/********* ExperimentsComponent ********/
@Component({
  selector: 'fb-experiments',
  template: `
    <mat-menu #experimentsmenu="matMenu">
      <!--
      <a mat-menu-item (click)="handleSelect('exp_id_here')">
          <mat-icon>filter_drama</mat-icon>
          <span>EXP_NAME_HERE</span>			
      </a>
-->
      <a mat-menu-item [disabled]="true">
        <span>None Available</span>
      </a>
    </mat-menu>

    <div>
      <button
        mat-mini-fab
        [color]="''"
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
