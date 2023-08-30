/*****************************
 * Experiments Module
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { CommonDialogs } from 'src/app/lib/components/dialogs';

// ** components **
import { ExperimentsComponent } from './experiments';

@NgModule({
  imports: [
    CommonModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    CommonDialogs
  ],
  declarations: [ExperimentsComponent],
  exports: [ExperimentsComponent],
  providers: []
})
export class ExperimentsModule {}

export * from './experiments';
