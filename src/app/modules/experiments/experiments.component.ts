/** Experiments Components **
 ********************************/

import { Component, Output, EventEmitter, ViewChild } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';

/********* ExperimentsComponent ********/
// Provides the Experiments menu; the host's toolbar renders the button that
// opens it.
@Component({
  selector: 'fb-experiments',
  imports: [MatMenuModule, MatIconModule],
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
  `,
  styles: [``]
})
export class ExperimentsComponent {
  @ViewChild('experimentsmenu', { static: true }) menu: MatMenu;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() selected: EventEmitter<any> = new EventEmitter();

  //constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect(choice: string, value?: any) {
    this.selected.emit({ choice: choice, value: value });
  }
}
