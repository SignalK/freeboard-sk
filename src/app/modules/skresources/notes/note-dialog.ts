/** Notes Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
//import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
//import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

import {
  AngularEditorModule,
  AngularEditorConfig
} from '@kolkov/angular-editor';
import { AddTargetPipe } from './safe.pipe';

import { AppInfo } from 'src/app/app.info';

/********* NoteDialog **********
	data: {
        note: <SKNote>
    }
***********************************/
@Component({
  standalone: true,
  selector: 'ap-notedialog',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    AngularEditorModule,
    AddTargetPipe
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
    minHeight: '0',
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

  constructor(
    public app: AppInfo,
    public dialogRef: MatDialogRef<NoteDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

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
  }

  openNoteUrl() {
    window.open(this.data.note.url, '_notes');
  }
}
