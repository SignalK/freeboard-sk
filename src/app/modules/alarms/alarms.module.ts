/*****************************
 * Alarms Module
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { CommonDialogs } from 'src/app/lib/components/dialogs';
// ** components **
import { AlarmComponent } from './components/alarm.component';
import { AlarmsDialog } from './components/alarms-dialog.component';
import { AnchorWatchComponent } from './components/anchor-watch.component';
import { TimerButtonComponent } from './components/timer-button.component';

@NgModule({
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatTooltipModule,
    MatToolbarModule,
    MatStepperModule,
    CommonDialogs,
    TimerButtonComponent
  ],
  declarations: [AnchorWatchComponent, AlarmsDialog, AlarmComponent],
  exports: [AnchorWatchComponent, AlarmsDialog, AlarmComponent],
  providers: []
})
export class AlarmsModule {}

export * from './alarms.facade';
export * from './components/alarms-dialog.component';
export * from './components/anchor-watch.component';
