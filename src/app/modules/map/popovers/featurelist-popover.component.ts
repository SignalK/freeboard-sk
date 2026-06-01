import {
  Component,
  ChangeDetectionStrategy,
  output,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopoverComponent } from './popover.component';
import { Position } from 'geojson';
import { AppIconDef } from '../../icons';

interface FeatureDef {
  coord: Position;
  icon: AppIconDef;
  id: string;
  text: string;
}

/*********** feature List Popover ***************
  title: string -  title text,
  features: Array<any> - list of features
  *************************************************/
@Component({
  selector: 'feature-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PopoverComponent
  ],
  template: `
    <ap-popover
      [title]="title()"
      [canClose]="canClose()"
      (closed)="handleClose()"
    >
      <mat-nav-list>
        @for (f of features(); track f) {
          <mat-list-item (click)="handleSelect(f)">
            @if (f.icon.svgIcon) {
              <mat-icon
                [svgIcon]="f.icon.svgIcon"
                [class]="f.icon.class"
              ></mat-icon>
            } @else {
              <mat-icon
                [class]="f.icon.class"
                [ngClass]="{
                  'icon-warn': f.text && f.text.indexOf('self') !== -1
                }"
              >
                {{ f.icon.name }}
              </mat-icon>
            }
            {{ f.text }}
          </mat-list-item>
        }
      </mat-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class FeatureListPopoverComponent {
  title = input<string>();
  features = input<FeatureDef[]>([]);
  canClose = input<boolean>();
  closed = output<void>();
  selected = output<FeatureDef>();

  handleSelect(item: FeatureDef) {
    this.selected.emit(item);
  }
  handleClose() {
    this.closed.emit();
  }
}
