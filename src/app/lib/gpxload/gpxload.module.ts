/*****************************
 * GPX to Signal K components
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatIconModule, MatButtonModule, MatCardModule,
        MatExpansionModule, MatSlideToggleModule, MatCheckboxModule,
        MatTooltipModule, MatToolbarModule,
        MatFormFieldModule, MatInputModule } from '@angular/material';

// ** components **

import { GPXImportDialog } from './import-dialog';


@NgModule({
    imports: [
        CommonModule, FormsModule, 
        MatDialogModule, MatIconModule, MatButtonModule, MatCardModule,
        MatExpansionModule, MatSlideToggleModule, MatCheckboxModule,
        MatTooltipModule, MatToolbarModule,
        MatFormFieldModule, MatInputModule
      ],    
    declarations: [
        GPXImportDialog
    ],
    exports: [
        GPXImportDialog
    ],
    entryComponents: [
        GPXImportDialog
    ], 
    providers: []  
})
export class GPXLoadModule {}

export * from './import-dialog';
