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
import { PopoverComponent, FeatureListPopoverComponent, AtoNPopoverComponent, AircraftPopoverComponent,
        VesselPopoverComponent, ResourcePopoverComponent } from './components/popover/popover.component';
import { CompassComponent } from './components/popover/compass.component';

import { RouteNextPointComponent } from './components/navigation/nextpoint.component';
import { ArrivalCircleComponent } from './components/navigation/feature-arrivalcircle.component';

import { AnchorAlarmComponent } from './components/alarm/layer-anchor.component';
import { TCPAAlarmComponent } from './components/alarm/layer-tcpa.component';

import { AisVesselsComponent } from './components/feature-ais.component';
import { AtoNsComponent } from './components/feature-atons.component';
import { AircraftComponent } from './components/feature-aircraft.component';
import { TracksComponent } from './components/feature-tracks.component';
import { SaRComponent } from './components/feature-sar.component';
import { LayerHeatmapComponent } from './components/layer-heatmap.component';
import { LayerWindVectorComponent } from './components/layer-windvector.component';
import { LayerColormapComponent } from './components/layer-colormap.component';
import { ResourceSetComponent} from './components/layer-resourceset.component';

import { FBMapComponent } from './fb-map.component';
import { UtilitiesModule } from 'src/app/modules/utils/utils.module';

@NgModule({
    imports: [
        CommonModule, MatTooltipModule, MatListModule,
        MatIconModule, MatButtonModule, MatTooltipModule, UtilitiesModule,
        MatCardModule, MatMenuModule, AngularOpenlayersModule
      ],    
    declarations: [
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent, AircraftPopoverComponent,
        CompassComponent, FBMapComponent, LayerHeatmapComponent, LayerColormapComponent,
        AisVesselsComponent, AtoNsComponent, AircraftComponent, SaRComponent, TracksComponent,
        LayerWindVectorComponent, ResourceSetComponent, AnchorAlarmComponent, ArrivalCircleComponent,
        TCPAAlarmComponent
    ],
    exports: [ 
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent, AircraftPopoverComponent,
        CompassComponent, FBMapComponent, LayerHeatmapComponent, LayerColormapComponent,
        AisVesselsComponent, AtoNsComponent, AircraftComponent, SaRComponent, TracksComponent,
        LayerWindVectorComponent, ResourceSetComponent, AnchorAlarmComponent, ArrivalCircleComponent,
        TCPAAlarmComponent
    ],
    entryComponents: [], 
    providers: []  
})
export class FBMapModule {}

export { WindVector } from './components/layer-windvector.component';
export { HeatmapValue } from './components/layer-heatmap.component';
export { ColormapValue } from './components/layer-colormap.component';
