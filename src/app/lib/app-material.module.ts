import { NgModule } from '@angular/core';

import {DragDropModule} from '@angular/cdk/drag-drop';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';

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
        DragDropModule, MatSnackBarModule
    ],
    providers: []  
})
export class AppMaterialModule { }