/*****************************
 * User Interface components
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatIconModule, MatButtonModule, 
        MatFormFieldModule, MatInputModule } from '@angular/material';

// ** components **
import { MsgBox, AlertDialog, ConfirmDialog, AboutDialog } from './dialogs';
import { FileInputComponent } from './file-input.component';
import { PopoverComponent } from './popover';
import { ResourceDialog } from './resource-dialogs';
import { GeometryCircleComponent } from '../components/geom-circle.component';

@NgModule({
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatFormFieldModule, MatInputModule
      ],    
    declarations: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        FileInputComponent,
        PopoverComponent, ResourceDialog, GeometryCircleComponent
    ],
    exports: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        FileInputComponent,
        PopoverComponent, ResourceDialog, GeometryCircleComponent
    ],
    entryComponents: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        ResourceDialog
    ], 
    providers: []  
})
export class AppUIModule {}

