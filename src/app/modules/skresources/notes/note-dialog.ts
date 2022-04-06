/** Notes Dialog Component **
 ********************************/

import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AngularEditorConfig } from '@kolkov/angular-editor';
import { AppInfo } from 'src/app/app.info';

/********* NoteDialog **********
	data: {
        note: <SKNote>
    }
***********************************/
@Component({
  selector: 'ap-notedialog',
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
