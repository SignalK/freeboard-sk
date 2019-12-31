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
import { MatMenuModule } from '@angular/material/menu';

import { AngularOpenlayersModule } from 'ngx-openlayers';

// ** components **
import { PopoverComponent, FeatureListPopoverComponent, AtoNPopoverComponent,
        VesselPopoverComponent, ResourcePopoverComponent } from './popover.component';
import { RouteNextPointComponent } from './nextpoint.component';
import { CompassComponent } from './compass.component';

import { AisTargetsComponent } from './components/feature-ais.component';
import { AtoNsComponent } from './components/feature-atons.component';
import { LayerHeatmapComponent } from './components/layer-heatmap.component';
import { LayerWindVectorComponent } from './components/layer-windvector.component';
import { LayerColormapComponent } from './components/layer-colormap.component';

import { FBMapComponent } from './fb-map.component';

@NgModule({
    imports: [
        CommonModule, MatTooltipModule, MatListModule,
        MatIconModule, MatButtonModule, MatTooltipModule,
        MatCardModule, MatMenuModule, AngularOpenlayersModule
      ],    
    declarations: [
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent,
        CompassComponent, FBMapComponent, LayerHeatmapComponent, LayerColormapComponent,
        AisTargetsComponent, AtoNsComponent, LayerWindVectorComponent
    ],
    exports: [ 
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent,
        CompassComponent, FBMapComponent, LayerHeatmapComponent, LayerColormapComponent,
        AisTargetsComponent, AtoNsComponent, LayerWindVectorComponent
    ],
    entryComponents: [], 
    providers: []  
})
export class FBMapModule {}

export { WindVector } from './components/layer-windvector.component';
export { HeatmapValue } from './components/layer-heatmap.component';
export { ColormapValue } from './components/layer-colormap.component';
