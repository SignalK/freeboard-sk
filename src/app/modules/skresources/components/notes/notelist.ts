import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { FBNotes, FBNote, FBResourceSelect, SKPosition } from 'src/app/types';

@Component({
  selector: 'note-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notelist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    MatInputModule,
    ScrollingModule
  ]
})
export class NoteListComponent {
  @Input() notes: FBNotes;
  @Output() select: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() refresh: EventEmitter<void> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() pan: EventEmitter<{ center: Position; zoomLevel: number }> =
    new EventEmitter();

  filterList = [];
  filterText = '';
  someSel = false;
  showNotes = false;
  draftOnly = false;

  constructor(public app: AppFacade) {}

  ngOnInit() {
    this.showNotes = this.app.config.notes;
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  initItems() {
    this.doFilter();
    this.sortFilter();
    if (this.draftOnly) {
      this.filterDraftOnly();
    }
  }

  toggleMapDisplay(value: boolean) {
    this.app.config.notes = value;
    this.app.saveConfig();
  }

  viewNote(val: string, isGroup = false) {
    this.select.emit({ id: val, isGroup: isGroup });
  }

  itemRefresh() {
    this.refresh.emit();
  }

  emitCenter(position: SKPosition) {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.selections.notesMinZoom
        ? this.app.config.selections.notesMinZoom
        : null;
    this.pan.emit({
      center: [position.longitude, position.latitude],
      zoomLevel: zoomTo
    });
  }

  filterKeyUp(e: string) {
    this.filterText = e;
    this.doFilter();
    this.sortFilter();
  }

  filterDraftOnly() {
    this.filterList = this.filterList.filter((i) => {
      if (i[1].properties && i[1].properties.draft) {
        return i;
      }
    });
  }

  toggleDraftOnly() {
    this.draftOnly = !this.draftOnly;
    if (this.draftOnly) {
      this.filterDraftOnly();
    } else {
      this.filterKeyUp('');
    }
  }

  doFilter() {
    this.filterList = this.notes.filter((i: FBNote) => {
      if (
        i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase()) !== -1
      ) {
        return i;
      }
    });
    if (this.draftOnly) {
      this.filterDraftOnly();
    }
  }

  sortFilter() {
    this.filterList.sort((a, b) => {
      const x = a[1].name.toUpperCase();
      const y = b[1].name.toUpperCase();
      return x <= y ? -1 : 1;
    });
  }
}
