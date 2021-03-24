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
import { XTEPathComponent } from './components/navigation/feature-xtepath.component';
import { BearingLineComponent } from './components/navigation/feature-bearingline.component';

import { TWDVectorComponent, AWAVectorComponent, HeadingLineComponent } from './components/vessel/feature-vessellines.component';
import { VesselComponent, VesselTrailComponent } from './components/vessel/feature-vessel.component';

import { AnchorAlarmComponent } from './components/alarm/layer-anchor.component';
import { TCPAAlarmComponent } from './components/alarm/layer-tcpa.component';

import { LayerHeatmapComponent } from './components/grib/layer-heatmap.component';
import { LayerWindVectorComponent } from './components/grib/layer-windvector.component';
import { LayerColormapComponent } from './components/grib/layer-colormap.component';

import { NotesComponent } from './components/resources/layer-notes.component';
import { WaypointsComponent } from './components/resources/layer-waypoints.component';
import { RoutesComponent } from './components/resources/layer-routes.component';
import { TracksComponent } from './components/resources/layer-tracks.component';
import { ResourceSetComponent} from './components/resources/layer-resourceset.component';

import { AisVesselsComponent } from './components/feature-aisvessels.component';
import { AtoNsComponent } from './components/feature-atons.component';
import { AircraftComponent } from './components/feature-aircraft.component';
import { AisTracksComponent } from './components/feature-aistracks.component';
import { SaRComponent } from './components/feature-sar.component';

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
