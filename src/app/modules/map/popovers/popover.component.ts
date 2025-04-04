/** popover Component **
 ************************/

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipesModule } from 'src/app/lib/pipes';

/*********** Popover ***************
title: string -  title text,
canClose: boolean - show close button
measure: boolean= measure mode;
***********************************/
@Component({
  selector: 'ap-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule
  ],
  template: `
    <div
      class="popover top in mat-app-background"
      [ngClass]="{ measure: measure }"
    >
      <div class="popover-title">
        <div style="flex: 1 1 auto;overflow-x: auto;">
          @if(icon) {
          <mat-icon [class]="icon.class" [svgIcon]="icon.svgIcon">{{
            icon.name
          }}</mat-icon>
          } &nbsp;{{ title }}
        </div>
        @if(canClose) {
        <div style="">
          <button mat-icon-button (click)="handleClose()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        }
      </div>
      <div class="popover-content">
        <ng-content></ng-content>
      </div>

      <div class="arrow" style="left:50%;"></div>
    </div>
  `,
  styleUrls: ['./popover.component.scss']
})
export class PopoverComponent {
  @Input() title: string;
  @Input() icon: { class: string; name?: string; svgIcon?: string };
  @Input() canClose = true;
  @Input() measure = false;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  //constructor() {}

  handleClose() {
    this.closed.emit();
  }
}
