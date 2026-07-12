import {
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output
} from '@angular/core';
import { CoordsPipe } from 'src/app/lib/pipes';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './safe.pipe';

import { AppFacade } from 'src/app/app.facade';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKNote } from '../../resource-classes';
import { MatDivider } from '@angular/material/divider';
import { CourseService } from 'src/app/modules/course';
import { SKResourceService } from '../../resources.service';
import { Position } from 'src/app/types';

@Component({
  selector: 'note-panel',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDivider,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-panel.html`,
  styleUrls: ['notes.css']
})
export class NotePanel {
  note = input<SKNote>(new SKNote());
  id = input<string>(undefined);
  interacting = input<boolean>(false);

  protected _note = linkedSignal(() => this.note());

  edit = output<string>();
  move = output<string>();
  panTo = output<{
    center: Position;
    zoomLevel: number;
  }>();

  protected icon: AppIconDef;
  protected app = inject(AppFacade);
  private course = inject(CourseService);
  private skres = inject(SKResourceService);

  constructor() {
    effect(() => {
      this.note();
      this.init(this.note());
    });
  }

  init(n: SKNote) {
    if (!n) {
      return;
    }
    n.properties = n.properties ?? {};
    n.description = n.description ?? '';
    this._note.set(n);
    this.icon = getResourceIcon('notes', this._note());
  }

  onEdit() {
    this.edit.emit(this.id());
  }

  onMove() {
    this.move.emit(this.id());
  }

  onDelete() {
    this.skres.deleteNote(this.id());
  }

  onGoto() {
    if (this._note().position) {
      this.course.setDestination(this._note().position);
    }
  }

  onPanTo() {
    if (this._note().position) {
      const zoomTo =
        this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
          ? this.app.config.resources.notes.minZoom
          : null;
      this.panTo.emit({
        center: [
          this._note().position.longitude,
          this._note().position.latitude
        ],
        zoomLevel: zoomTo
      });
    }
  }

  openNoteUrl() {
    window.open(this.note().url, '_notes');
  }
}
