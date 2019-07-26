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

// ** components **
import { AnchorWatchComponent } from './anchor-watch.component';
import { AlarmsDialog, AlarmComponent } from './alarms';

@NgModule({
    imports: [
        CommonModule, MatDialogModule,
        MatIconModule, MatButtonModule, MatCardModule,
        MatSlideToggleModule, MatSliderModule,
        MatTooltipModule, MatToolbarModule
      ],    
    declarations: [
        AnchorWatchComponent, AlarmsDialog, AlarmComponent
    ],
    exports: [
        AnchorWatchComponent, AlarmsDialog, AlarmComponent
    ],
    entryComponents: [ AlarmsDialog ], 
    providers: []  
})
export class AlarmsModule {}

export * from './alarms.facade';
export * from './alarms';

