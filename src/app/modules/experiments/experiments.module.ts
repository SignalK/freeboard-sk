/*****************************
 * Experiments Module
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { AppUIModule } from 'src/app/lib/app-ui';

// ** components **
import { ExperimentsComponent } from './experiments'

@NgModule({
    imports: [
        CommonModule, MatMenuModule,
        MatIconModule, MatButtonModule,
        MatTooltipModule, AppUIModule
      ],    
    declarations: [
        ExperimentsComponent
    ],
    exports: [
        ExperimentsComponent
    ],
    entryComponents: [], 
    providers: []  
})
export class ExperimentsModule {}

export * from './experiments';

