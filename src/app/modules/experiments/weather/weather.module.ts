import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatStepperModule } from '@angular/material/stepper';
import { WeatherForecastModal } from './weather-forecast';
import { WeatherDataComponent } from './components/weather-data.component';

import { AppUIModule } from 'src/app/lib/ui/ui.module';
import { UtilitiesModule } from 'src/app/modules/utils/utils.module';

@NgModule({
    imports: [
        CommonModule, FormsModule, MatCardModule, MatListModule,
        MatButtonModule, MatIconModule, MatTooltipModule, MatBottomSheetModule,
        MatFormFieldModule, MatInputModule, MatToolbarModule, MatStepperModule,
        AppUIModule, UtilitiesModule
    ],
    declarations: [
        WeatherForecastModal, WeatherDataComponent
    ],
    exports: [
        WeatherForecastModal, WeatherDataComponent
    ],
    entryComponents: [
        WeatherForecastModal
    ]
})
export class WeatherModule { }

export * from './weather-forecast';
export * from './components/weather-data.component';
