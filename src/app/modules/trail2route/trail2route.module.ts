/*****************************
 * Experiments Module
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AppUIModule } from 'src/app/lib';

import { FreeboardOpenlayersModule } from 'fb-openlayers';

// ** components **
import { Trail2RouteDialog } from './trail2route-dialog';

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatSliderModule,
    MatCheckboxModule,
    AppUIModule,
    FreeboardOpenlayersModule
  ],
  declarations: [Trail2RouteDialog],
  exports: [Trail2RouteDialog],
  providers: []
})
export class Trail2RouteModule {}

export * from './trail2route-dialog';
