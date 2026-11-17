import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LayoutService } from './layout.service';

/** The named widget layouts, and what this screen shows (#1346). */
@Component({
  selector: 'layout-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layoutlist.html',
  styleUrls: ['../skresources/components/resourcelist.css', './layoutlist.css'],
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class LayoutListComponent {
  closed = output<void>();

  protected layouts = inject(LayoutService);

  protected list = computed(() =>
    Object.entries(this.layouts.layouts()).sort(([, a], [, b]) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
  );

  ngOnInit() {
    void this.layouts.refresh();
  }

  protected close() {
    this.closed.emit();
  }
}
