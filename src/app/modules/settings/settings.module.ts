import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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

@NgModule({
    imports: [
        CommonModule, HttpClientModule, FormsModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatListModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule, MatSelectModule,
        MatFormFieldModule, MatInputModule, MatMenuModule, MatToolbarModule
    ],
    declarations: [
        SettingsDialog
    ],
    exports: [
        SettingsDialog
    ],
    entryComponents: [
        SettingsDialog
    ]
})
export class SettingsModule { }

export * from './settings.facade';
export * from './settings-dialog';
