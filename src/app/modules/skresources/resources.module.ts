import { NgModule } from '@angular/core';
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

import { RouteListComponent } from './lists/routelist';
import { WaypointListComponent } from './lists/waypointlist';
import { ChartListComponent, ChartLayers } from './lists/chartlist';
import { NoteListComponent } from './lists/notelist';
import { AISListComponent } from './lists/aislist';

import {
  SignalKDetailsComponent,
  FileInputComponent
} from 'src/app/lib/components';

import {
  ResourceDialog,
  AISPropertiesModal,
  AtoNPropertiesModal,
  AircraftPropertiesModal,
  ActiveResourcePropertiesModal,
  ChartInfoDialog,
  TracksModal,
  ResourceSetModal
} from './resource-dialogs';
import { ResourceImportDialog } from './sets/resource-upload-dialog';

import { SKNotesModule } from './notes';
import { CommonDialogs } from 'src/app/lib/components/dialogs';
import { PipesModule } from 'src/app/lib/pipes';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatCardModule,
    MatListModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatBottomSheetModule,
    MatSliderModule,
    MatSlideToggleModule,
    ScrollingModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    DragDropModule,
    SKNotesModule,
    CommonDialogs,
    PipesModule,
    SignalKDetailsComponent,
    FileInputComponent
  ],
  declarations: [
    RouteListComponent,
    WaypointListComponent,
    ChartListComponent,
    AISListComponent,
    NoteListComponent,
    ResourceDialog,
    AISPropertiesModal,
    AtoNPropertiesModal,
    AircraftPropertiesModal,
    ActiveResourcePropertiesModal,
    ChartInfoDialog,
    ChartLayers,
    TracksModal,
    ResourceSetModal,
    ResourceImportDialog
  ],
  exports: [
    RouteListComponent,
    WaypointListComponent,
    ChartListComponent,
    AISListComponent,
    NoteListComponent,
    ResourceDialog,
    AISPropertiesModal,
    AtoNPropertiesModal,
    AircraftPropertiesModal,
    ActiveResourcePropertiesModal,
    ChartInfoDialog,
    ChartLayers,
    SKNotesModule,
    TracksModal,
    ResourceSetModal,
    ResourceImportDialog
  ]
})
export class SignalKResourcesModule {}

export * from './resources.service';
export * from './resource-dialogs';
export * from './resource-classes';
export * from './notes';
export * from './sets/resource-sets.service';
export * from './sets/resource-upload-dialog';
