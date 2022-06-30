import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NoteDialog } from './note-dialog';
import { RelatedNotesDialog } from './relatednotes-dialog';
// ** pipes **
import { AddTargetPipe } from './safe.pipe';

import { AngularEditorModule } from '@kolkov/angular-editor';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    AngularEditorModule
  ],
  declarations: [NoteDialog, RelatedNotesDialog, AddTargetPipe],
  exports: [NoteDialog, RelatedNotesDialog, AddTargetPipe]
})
export class SKNotesModule {}

export * from './note-dialog';
export * from './relatednotes-dialog';
