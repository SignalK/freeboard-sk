import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { DragDropModule } from '@angular/cdk/drag-drop';

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
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { RouteListComponent } from  './lists/routelist';
import { WaypointListComponent } from  './lists/waypointlist';
import { ChartListComponent } from  './lists/chartlist';
import { NoteListComponent } from  './lists/notelist';
import { AISListComponent } from  './lists/aislist';

import { ResourceDialog, AISPropertiesModal, AtoNPropertiesModal,
        ActiveResourcePropertiesModal} from './resource-dialogs';
import { GRIBPanel, GRIBGradient } from './grib/grib-components';
import { SKNotesModule } from './notes';
import { AppUIModule } from 'src/app/lib/ui/ui.module';

@NgModule({
    imports: [
        CommonModule, HttpClientModule, FormsModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatListModule, MatSelectModule,
        MatButtonModule, MatIconModule, MatTooltipModule, MatBottomSheetModule,
        MatSliderModule, MatSlideToggleModule, ScrollingModule,
        MatFormFieldModule, MatInputModule, MatToolbarModule, DragDropModule,
        SKNotesModule, AppUIModule
    ],
    declarations: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AISListComponent, NoteListComponent, 
        ResourceDialog, AISPropertiesModal, AtoNPropertiesModal,
        ActiveResourcePropertiesModal,
        GRIBPanel, GRIBGradient
    ],
    exports: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AISListComponent, NoteListComponent,
        ResourceDialog, AISPropertiesModal, AtoNPropertiesModal,
        ActiveResourcePropertiesModal,
        SKNotesModule, GRIBPanel, GRIBGradient
    ],
    entryComponents: [
        ResourceDialog, AISPropertiesModal, AtoNPropertiesModal,
        ActiveResourcePropertiesModal
    ]
})
export class SignalKResourcesModule { }

export * from './resources.service';
export * from './resource-dialogs';
export * from './resource-classes';
export * from './notes';
export * from './grib/grib-components';
