/*****************************
 * User Interface components
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';

// ** components **
import {
  MsgBox,
  AlertDialog,
  ConfirmDialog,
  WelcomeDialog,
  AboutDialog,
  LoginDialog,
  MessageBarComponent
} from './dialogs';
import { FileInputComponent } from './file-input.component';
import { TextDialComponent } from './dial-text';
import { PlaybackDialog } from './playback-dialog';
import { PiPVideoComponent } from './pip.component';
import { WakeLockComponent } from './wakelock.component';
import { TimerButtonComponent } from './timer-button.component';

import { SignalKDetailsComponent } from './signalk-details.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatTooltipModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatStepperModule
  ],
  declarations: [
    MsgBox,
    AlertDialog,
    ConfirmDialog,
    AboutDialog,
    FileInputComponent,
    TextDialComponent,
    LoginDialog,
    MessageBarComponent,
    WelcomeDialog,
    PlaybackDialog,
    PiPVideoComponent,
    SignalKDetailsComponent,
    WakeLockComponent,
    TimerButtonComponent
  ],
  exports: [
    MsgBox,
    AlertDialog,
    ConfirmDialog,
    AboutDialog,
    MessageBarComponent,
    FileInputComponent,
    TextDialComponent,
    LoginDialog,
    PlaybackDialog,
    PiPVideoComponent,
    SignalKDetailsComponent,
    WakeLockComponent,
    TimerButtonComponent
  ],
  providers: []
})
export class AppUIModule {}
