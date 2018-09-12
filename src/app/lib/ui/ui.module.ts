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
import { PopoverComponent } from './popover';
import { ResourceDialog } from './resource-dialogs';

@NgModule({
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatFormFieldModule, MatInputModule
      ],    
    declarations: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        PopoverComponent, ResourceDialog
    ],
    exports: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        PopoverComponent, ResourceDialog
    ],
    entryComponents: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        ResourceDialog
    ], 
    providers: []  
})
export class AppUIModule {}

