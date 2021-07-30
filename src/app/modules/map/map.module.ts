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

// ** popver **
import { CompassComponent, PopoverComponent, FeatureListPopoverComponent, 
        AtoNPopoverComponent, AircraftPopoverComponent, ResourcePopoverComponent } from './components/popover/';
// ** navigation **
import { RouteNextPointComponent } from './components/navigation';
// ** profiles 
import { VesselPopoverComponent } from './components/profiles/default';

// ** expriment: GRIB **
//import { LayerHeatmapComponent, LayerWindVectorComponent, LayerColormapComponent } from './components/grib';

import { FreeboardOpenlayersModule } from 'fb-openlayers';
import { FBMapComponent } from './fb-map.component';
import { UtilitiesModule } from 'src/app/modules/utils/utils.module';

@NgModule({
    imports: [
        CommonModule, MatTooltipModule, MatListModule,
        MatIconModule, MatButtonModule, MatTooltipModule, UtilitiesModule,
        MatCardModule, MatMenuModule,
        FreeboardOpenlayersModule
      ],    
    declarations: [
        PopoverComponent, FeatureListPopoverComponent, 
        VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent, AircraftPopoverComponent,
        CompassComponent, FBMapComponent
    ],
    exports: [ 
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent, AircraftPopoverComponent,
        CompassComponent, FBMapComponent
    ],
    entryComponents: [], 
    providers: []  
})
export class FBMapModule {}

//export { WindVector } from './components/grib/layer-windvector.component';
//export { HeatmapValue } from './components/grib/layer-heatmap.component';
//export { ColormapValue } from './components/grib/layer-colormap.component';
