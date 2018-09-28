/*****************************
 * User Interface components
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatIconModule, MatButtonModule, MatTooltipModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatDatepickerModule, MatNativeDateModule } from '@angular/material';

// ** components **
import { MsgBox, AlertDialog, ConfirmDialog, AboutDialog } from './dialogs';
import { FileInputComponent } from './file-input.component';
import { PopoverComponent } from './popover';
import { ResourceDialog } from './resource-dialogs';
import { PlaybackDialog } from './playback-dialog';
import { GeometryCircleComponent } from '../components/geom-circle.component';

@NgModule({
    imports: [
        CommonModule, FormsModule, MatTooltipModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatDatepickerModule, MatNativeDateModule
      ],    
    declarations: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        FileInputComponent,
        PopoverComponent, ResourceDialog, PlaybackDialog,
        GeometryCircleComponent
    ],
    exports: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        FileInputComponent,
        PopoverComponent, ResourceDialog, PlaybackDialog,
        GeometryCircleComponent
    ],
    entryComponents: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        ResourceDialog, PlaybackDialog
    ], 
    providers: []  
})
export class AppUIModule {}

