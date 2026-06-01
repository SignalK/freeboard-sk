import {
  Component,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopoverComponent } from './popover.component';

@Component({
  selector: 'chart-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PopoverComponent
  ],
  template: `
    <ap-popover
      [title]="title"
      [canClose]="canClose()"
      [icon]="{ name: 'map' }"
      (closed)="handleClose()"
    >
      <mat-nav-list>
        @for (c of features(); track c) {
          <mat-list-item (click)="handleSelect(c.id)">
            <mat-icon>map</mat-icon>
            {{ c.text }}
          </mat-list-item>
        }
      </mat-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class ChartListPopoverComponent {
  features = input<Array<{ id: string; text: string }>>([]);
  canClose = input<boolean>();
  closed = output<void>();
  selected = output<string>();

  protected title = 'Click to Show / Hide Chart';

  handleSelect(id: string) {
    this.selected.emit(id);
  }
  handleClose() {
    this.closed.emit();
  }
}
