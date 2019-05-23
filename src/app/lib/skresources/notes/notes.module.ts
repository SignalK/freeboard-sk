import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, 
        MatCheckboxModule, MatCardModule, MatButtonModule, MatListModule, 
        MatFormFieldModule, MatInputModule,
        MatIconModule, MatTooltipModule, MatSliderModule, MatSlideToggleModule } from '@angular/material';

import { NoteDialog } from './note-dialog';
import { RegionDialog } from './region-dialog';
// ** pipes **
import { AddTargetPipe } from '../../ui/safe.pipe';

import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

@NgModule({
    imports: [
        CommonModule, FormsModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatListModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule, 
        MatFormFieldModule, MatInputModule,
        CKEditorModule
    ],
    declarations: [
        NoteDialog, RegionDialog, AddTargetPipe
    ],
    exports: [
        NoteDialog, RegionDialog, AddTargetPipe
    ],
    entryComponents: [
        NoteDialog, RegionDialog
    ]
})
export class SKNotesModule { }

export * from './note-dialog';
export * from './region-dialog';
