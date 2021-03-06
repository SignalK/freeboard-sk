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

// ** popver **
import { CompassComponent, PopoverComponent, FeatureListPopoverComponent, 
        AtoNPopoverComponent, AircraftPopoverComponent, ResourcePopoverComponent } from './components/popover/';
// ** navigation **
import { RouteNextPointComponent, ArrivalCircleComponent, XTEPathComponent, 
        BearingLineComponent } from './components/navigation';
// ** vessel **
import { TWDVectorComponent, AWAVectorComponent, HeadingLineComponent, 
        VesselComponent, VesselTrailComponent } from './components/vessel';
// ** alarm **
import { AnchorAlarmComponent, TCPAAlarmComponent } from './components/alarm';
// ** resources **
import { NotesComponent, WaypointsComponent, RoutesComponent, TracksComponent,
        ResourceSetComponent} from './components/resources';
// top level Groups
import { AtoNsComponent, AircraftComponent, AisTracksComponent, SaRComponent } from './components';

// ** profiles 
import { AisVesselsComponent, VesselPopoverComponent } from './components/profiles/default';

// ** expriment: GRIB **
import { LayerHeatmapComponent, LayerWindVectorComponent, LayerColormapComponent } from './components/grib';

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
        AisVesselsComponent, AtoNsComponent, AircraftComponent, SaRComponent, AisTracksComponent,
        LayerWindVectorComponent, ResourceSetComponent, AnchorAlarmComponent, ArrivalCircleComponent,
        TCPAAlarmComponent, XTEPathComponent, BearingLineComponent, 
        TWDVectorComponent, AWAVectorComponent, HeadingLineComponent, VesselComponent, VesselTrailComponent,
        NotesComponent, WaypointsComponent, RoutesComponent, TracksComponent
    ],
    exports: [ 
        PopoverComponent, FeatureListPopoverComponent, VesselPopoverComponent,
        ResourcePopoverComponent, RouteNextPointComponent, AtoNPopoverComponent, AircraftPopoverComponent,
        CompassComponent, FBMapComponent, LayerHeatmapComponent, LayerColormapComponent,
        AisVesselsComponent, AtoNsComponent, AircraftComponent, SaRComponent, AisTracksComponent,
        LayerWindVectorComponent, ResourceSetComponent, AnchorAlarmComponent, ArrivalCircleComponent,
        TCPAAlarmComponent, XTEPathComponent, BearingLineComponent, 
        TWDVectorComponent, AWAVectorComponent, HeadingLineComponent, VesselComponent, VesselTrailComponent,
        NotesComponent, WaypointsComponent, RoutesComponent, TracksComponent
    ],
    entryComponents: [], 
    providers: []  
})
export class FBMapModule {}

export { WindVector } from './components/grib/layer-windvector.component';
export { HeatmapValue } from './components/grib/layer-heatmap.component';
export { ColormapValue } from './components/grib/layer-colormap.component';
