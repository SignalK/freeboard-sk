/*import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { SettingsDialog } from './settings-dialog';
import { SignalKPreferredPathsComponent } from './components/signalk-preferredpaths.component';

@NgModule({
  declarations: [SettingsDialog, SignalKPreferredPathsComponent],
  exports: [SettingsDialog, SignalKPreferredPathsComponent],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatRadioModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatToolbarModule
  ],
  providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class SettingsModule {}*/

export * from './settings.facade';
export * from './components/settings-dialog';
//export * from './components/signalk-preferredpaths.component';
