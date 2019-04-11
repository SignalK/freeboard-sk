import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, 
        MatCheckboxModule, MatCardModule, MatButtonModule, MatListModule, 
        MatFormFieldModule, MatInputModule,
        MatIconModule, MatTooltipModule, MatSliderModule, MatSlideToggleModule } from '@angular/material';

import { RouteListComponent } from  './lists/routelist';
import { WaypointListComponent } from  './lists/waypointlist';
import { ChartListComponent } from  './lists/chartlist';
import { NoteListComponent } from  './lists/notelist';
import { AISListComponent } from  './lists/aislist';
import { AnchorWatchComponent } from  './anchorwatch';
import { ResourceDialog, AISPropertiesDialog } from './resource-dialogs';

import { SKNotesModule } from './notes';

@NgModule({
    imports: [
        CommonModule, HttpClientModule, FormsModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatListModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule, 
        MatFormFieldModule, MatInputModule, SKNotesModule
    ],
    declarations: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent, AISListComponent, NoteListComponent,
        ResourceDialog, AISPropertiesDialog
    ],
    exports: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent, AISListComponent, NoteListComponent,
        ResourceDialog, AISPropertiesDialog, 
        SKNotesModule
    ],
    entryComponents: [
        ResourceDialog, AISPropertiesDialog
    ]
})
export class SignalKResourcesModule { }

export * from './resources.service';
export * from './resource-dialogs';
export * from './notes';
