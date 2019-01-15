import { NgModule } from '@angular/core';

import {DragDropModule} from '@angular/cdk/drag-drop';

import {     
    MatMenuModule, MatToolbarModule,
    MatSidenavModule, MatCardModule,
    MatSlideToggleModule, MatBadgeModule,
    MatSelectModule, MatInputModule, MatCheckboxModule,
    MatButtonModule, MatListModule, MatIconModule,
    MatTooltipModule, MatDialogModule } from '@angular/material';

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    MatMenuModule, MatToolbarModule,
    MatSidenavModule, MatCardModule,
    MatSlideToggleModule, MatBadgeModule,
    MatSelectModule, MatInputModule, MatCheckboxModule,
    MatButtonModule, MatListModule, MatIconModule,
    MatTooltipModule, MatDialogModule,
    DragDropModule
  ],
  providers: [
  ]  
})
export class AppMaterialModule { }