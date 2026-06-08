import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoordsPipe } from 'src/app/lib/pipes';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

import {
  AngularEditorModule,
  AngularEditorConfig
} from '@kolkov/angular-editor';
import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './safe.pipe';

import { AppFacade } from 'src/app/app.facade';
import {
  AppIconDef,
  getResourceIcon,
  persistSkIcon,
  selListNoteIcons
} from 'src/app/modules/icons';
import { SKNote } from '../../resource-classes';
import { SKPosition } from 'src/app/types';

interface DialogData {
  title: string;
  note: SKNote;
  editable: boolean;
  addMode: boolean;
  position: SKPosition;
}

@Component({
  selector: 'ap-notedialog',
  imports: [
    FormsModule,
    MatCardModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
    AngularEditorModule,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-dialog.html`,
  styleUrls: ['notes.css']
})
export class NoteDialog implements OnInit {
  private editorHiddenButtons = [
    [
      //'undo',
      //'redo',
      //'bold',
      //'italic',
      //'underline',
      'strikeThrough',
      'subscript',
      'superscript',
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      'justifyFull',
      'indent',
      'outdent',
      'insertUnorderedList',
      'insertOrderedList',
      'heading',
      'fontName'
    ],
    [
      'fontSize',
      //'textColor',
      'backgroundColor',
      'customClasses',
      'link',
      'unlink',
      'insertImage',
      'insertVideo',
      'insertHorizontalRule',
      'removeFormat',
      'toggleEditorMode'
    ]
  ];

  public editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: false,
    height: 'auto',
    minHeight: '150',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'no',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [{ class: 'roboto', name: 'Default' }],
    customClasses: [],
    sanitize: true,
    toolbarPosition: 'top',
    toolbarHiddenButtons: this.editorHiddenButtons
  };

  protected icon: AppIconDef;
  protected poiIcons: Array<{ id: string; name: string }> = [];
  protected showAllIcons = signal(false);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<NoteDialog>);

  constructor() {}

  ngOnInit() {
    if (!this.data.note.properties) {
      this.data.note.properties = {};
    }
    if (typeof this.data.note.description === 'undefined') {
      this.data.note.description = '';
    }
    if (this.data.note.properties.readOnly) {
      this.data.editable = false;
    }
    this.icon = this.cleanIconDef(getResourceIcon('notes', this.data.note));
    this.poiIcons = selListNoteIcons(this.showAllIcons());
    // If the current icon isn't visible in the merged list (a 'default:' pin or
    // a non-note-role symbol, shown only under "Show all"), start with it on.
    const sel = this.icon.svgIcon;
    if (sel && !this.poiIcons.some((i) => i.id === sel)) {
      this.showAllIcons.set(true);
      this.poiIcons = selListNoteIcons(true);
    }
  }

  onShowAllToggle(checked: boolean) {
    this.showAllIcons.set(checked);
    this.poiIcons = selListNoteIcons(checked);
  }

  cleanIconDef(icon: AppIconDef) {
    icon.svgIcon = icon.svgIcon ?? '';
    return icon;
  }

  onIconSelected(e: string) {
    if (e.length) {
      // Pin to default:<id> when a bare built-in id has an override, so a future
      // custom version won't silently replace an explicit built-in choice.
      this.data.note.properties.skIcon = persistSkIcon(e);
    } else {
      delete this.data.note.properties.skIcon;
    }
    this.icon = this.cleanIconDef(getResourceIcon('notes', this.data.note));
  }
  onSave() {
    this.dialogRef.close({
      result: true,
      data: this.data.note,
      action: 'save'
    });
  }

  openNoteUrl() {
    window.open(this.data.note.url, '_notes');
  }
}
