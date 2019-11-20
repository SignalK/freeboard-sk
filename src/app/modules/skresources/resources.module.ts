import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollDispatchModule } from '@angular/cdk/scrolling';

import { RouteListComponent } from  './lists/routelist';
import { WaypointListComponent } from  './lists/waypointlist';
import { ChartListComponent } from  './lists/chartlist';
import { NoteListComponent } from  './lists/notelist';
import { AISListComponent } from  './lists/aislist';

import { ResourceDialog, AISPropertiesDialog, AtoNPropertiesDialog } from './resource-dialogs';
import { GRIBPanel } from './grib/grib-components';
import { SKNotesModule } from './notes';
import { AppUIModule } from '../../lib/ui/ui.module';

@NgModule({
    imports: [
        CommonModule, HttpClientModule, FormsModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatListModule, MatSelectModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule, ScrollDispatchModule,
        MatFormFieldModule, MatInputModule, SKNotesModule, AppUIModule
    ],
    declarations: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AISListComponent, NoteListComponent, 
        ResourceDialog, AISPropertiesDialog, AtoNPropertiesDialog,
        GRIBPanel
    ],
    exports: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AISListComponent, NoteListComponent,
        ResourceDialog, AISPropertiesDialog, AtoNPropertiesDialog,
        SKNotesModule, GRIBPanel
    ],
    entryComponents: [
        ResourceDialog, AISPropertiesDialog, AtoNPropertiesDialog
    ]
})
export class SignalKResourcesModule { }

export * from './resources.service';
export * from './resource-dialogs';
export * from './resource-classes';
export * from './notes';
export * from './grib/grib-components';
export * from './grib/grib';
