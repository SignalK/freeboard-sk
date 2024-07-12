import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipesModule } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';
/*********** feature List Popover ***************
  title: string -  title text,
  features: Array<any> - list of features
  *************************************************/
@Component({
  selector: 'feature-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent
  ],
  template: `
    <ap-popover [title]="title" [canClose]="canClose" (closed)="handleClose()">
      <mat-nav-list>
        @for(f of features; track f) {
        <mat-list-item (click)="handleSelect(f)">
          <mat-icon
            [color]="f.text && f.text.indexOf('self') !== -1 ? 'warn' : ''"
          >
            {{ f.icon }}
          </mat-icon>
          {{ f.text }}
        </mat-list-item>
        }
      </mat-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class FeatureListPopoverComponent {
  @Input() title: string;
  @Input() features: Array<{ text: string; icon: string }> = [];
  @Input() canClose: boolean;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() selected: EventEmitter<any> = new EventEmitter();
  //constructor() {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect(item: any) {
    this.selected.emit(item);
  }
  handleClose() {
    this.closed.emit();
  }
}
