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
import { CountryFlagComponent } from 'src/app/lib/components/country-flags.component';
import { AppFacade } from 'src/app/app.facade';

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
    CountryFlagComponent
  ],
  template: `
    <div
      class="popover top in mat-app-background"
      [ngClass]="{ measure: measure }"
    >
      <div class="popover-title">
        <div
          [ngClass]="{ measure: measure }"
          style="flex: 1 1 auto;overflow: hidden;
                                display: -webkit-box;
                                -webkit-box-orient: vertical;
                                -webkit-line-clamp: 1;
                                line-clamp: 1;
                                text-overflow:ellipsis;"
        >
          @if (mmsi) {
            <mat-icon>
              <country-flag
                [mmsi]="mmsi"
                [host]="app.hostDef.url"
              ></country-flag>
            </mat-icon>
          }
          @if (icon) {
            <mat-icon [class]="icon.class" [svgIcon]="icon.svgIcon">{{
              icon.name
            }}</mat-icon>
          }
          &nbsp;{{ title }}
        </div>
        @if (canClose) {
          <div style="">
            <button mat-icon-button (click)="handleClose()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
        @if (!canClose && navTo) {
          <div style="">
            <button
              mat-icon-button
              matTooltip="Navigate to here"
              (click)="handleNavTo()"
            >
              <mat-icon>near_me</mat-icon>
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
  @Input() mmsi: string;
  @Input() icon: { class: string; name?: string; svgIcon?: string };
  @Input() canClose = true;
  @Input() measure = false;
  @Input() navTo = false;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() navigateTo: EventEmitter<void> = new EventEmitter();
  constructor(protected app: AppFacade) {}

  handleClose() {
    this.closed.emit();
  }

  handleNavTo() {
    this.navigateTo.emit();
  }
}
