/*****************************
 * Freeboard Map components
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AngularOpenlayersModule } from 'ngx-openlayers';

// ** components **
import { PopoverComponent, FeatureListPopoverComponent, 
        VesselPopoverComponent, ResourcePopoverComponent } from './popover.component';
import { RouteNextPointComponent } from './nextpoint.component';
import { GeometryCircleComponent } from './geom-circle.component';
import { AisTargetsComponent } from './feature-ais.component';
import { FBMapComponent } from './fb-map.component';

import { CompassComponent } from './compass.component';

@NgModule({
    imports: [
        CommonModule, MatTooltipModule, MatListModule,
        MatIconModule, MatButtonModule, MatTooltipModule,
        MatCardModule, AngularOpenlayersModule
      ],    
    declarations: [
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent,
        CompassComponent, FBMapComponent,
        GeometryCircleComponent, AisTargetsComponent    
    ],
    exports: [ 
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent,
        CompassComponent, FBMapComponent,
        GeometryCircleComponent, AisTargetsComponent
    ],
    entryComponents: [], 
    providers: []  
})
export class FBMapModule {}

