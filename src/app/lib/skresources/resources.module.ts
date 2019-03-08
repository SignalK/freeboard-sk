import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, 
        MatCheckboxModule, MatCardModule, MatButtonModule, MatListModule, 
        MatFormFieldModule, MatInputModule,
        MatIconModule, MatTooltipModule, MatSliderModule, MatSlideToggleModule } from '@angular/material';

import { RouteListComponent } from  './routelist';
import { WaypointListComponent } from  './waypointlist';
import { ChartListComponent } from  './chartlist';
import { NoteListComponent } from  './notelist';
import { AISListComponent } from  './aislist';
import { AnchorWatchComponent } from  './anchorwatch';
import { ResourceDialog, AISPropertiesDialog, NoteDialog } from './resource-dialogs';

@NgModule({
    imports: [
        CommonModule, HttpClientModule, FormsModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatListModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule, 
        MatFormFieldModule, MatInputModule
    ],
    declarations: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent, AISListComponent, NoteListComponent,
        ResourceDialog, AISPropertiesDialog, NoteDialog
    ],
    exports: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent, AISListComponent, NoteListComponent,
        ResourceDialog, AISPropertiesDialog, NoteDialog
    ],
    entryComponents: [
        ResourceDialog, AISPropertiesDialog, NoteDialog
    ]
})
export class SignalKResourcesModule { }

export * from './resources.service';
export * from './resource-dialogs';
