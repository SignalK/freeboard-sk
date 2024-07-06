/*
 * Public API Surface of ng-openlayers
 */
import { NgModule } from '@angular/core';
import { InteractionsDirective } from './lib/interactions.directive';
//import { LayerType } from './lib/models';
import { MapComponent } from './lib/map.component';
import { OverlayComponent } from './lib/overlay.component';
import { ControlsDirective } from './lib/controls.directive';
import { ViewDirective } from './lib/view.directive';
//import { MapService } from './lib/map.service';
import { ContentComponent } from './lib/content.component';
import { LayerComponent } from './lib/layer.component';

import { ControlComponent } from './lib/control.component';

import { InteractionDrawComponent } from './lib/interactions/interaction-draw.component';
import { InteractionModifyComponent } from './lib/interactions/interaction-modify.component';
import {
  WaypointLayerComponent,
  FreeboardWaypointLayerComponent
} from './lib/resources/layer-waypoints.component';
import {
  NoteLayerComponent,
  FreeboardNoteLayerComponent
} from './lib/resources/layer-notes.component';
import {
  RouteLayerComponent,
  FreeboardRouteLayerComponent
} from './lib/resources/layer-routes.component';
import {
  RegionLayerComponent,
  FreeboardRegionLayerComponent
} from './lib/resources/layer-regions.component';
import { FreeboardChartLayerComponent } from './lib/resources/layer-charts.component';
import { ChartBoundsLayerComponent } from './lib/resources/layer-chart-bounds.component';
import { TrackLayerComponent } from './lib/resources/layer-tracks.component';
import { ResourceSetLayerComponent } from './lib/resources/layer-resourceset.component';
import { SKTargetsLayerComponent } from './lib/resources/layer-sktargets.component';
import { SKVesselsLayerComponent } from './lib/resources/layer-skvessels.component';
import { SKTargetTracksLayerComponent } from './lib/resources/layer-sktarget-tracks.component';
import { AnchorAlarmComponent } from './lib/alarms/layer-anchor-alarm.component';
import { AlarmComponent } from './lib/alarms/layer-alarm.component';
import { CPAAlarmComponent } from './lib/alarms/layer-cpa-alarm.component';
import { ArrivalCircleComponent } from './lib/navigation/layer-arrival-circle.component';
import { XTEPathComponent } from './lib/navigation/layer-xte-path.component';
import { BearingLineComponent } from './lib/navigation/layer-bearing-line.component';
import { LaylineComponent } from './lib/navigation/layer-layline.component';
import { TargetAngleComponent } from './lib/navigation/layer-target-angle.component';
import { DirectionOfTravelComponent } from './lib/navigation/layer-dot.component';
import { VesselComponent } from './lib/vessel/layer-vessel.component';
import { VesselTrailComponent } from './lib/vessel/layer-vessel-trail.component';

export * from './lib/util';
export { MapService } from './lib/map.service';
export { S57Service } from './lib/s57.service';

export { ContentComponent } from './lib/content.component';
export { ControlsDirective } from './lib/controls.directive';
export { InteractionsDirective } from './lib/interactions.directive';
export { LayerComponent } from './lib/layer.component';
export { LayerType, SourceType } from './lib/models';
export { MapComponent } from './lib/map.component';
export { OverlayComponent } from './lib/overlay.component';
export { ViewDirective } from './lib/view.directive';

export { ControlComponent } from './lib/control.component';

export { InteractionDrawComponent } from './lib/interactions/interaction-draw.component';
export { InteractionModifyComponent } from './lib/interactions/interaction-modify.component';
export {
  WaypointLayerComponent,
  FreeboardWaypointLayerComponent
} from './lib/resources/layer-waypoints.component';
export {
  NoteLayerComponent,
  FreeboardNoteLayerComponent
} from './lib/resources/layer-notes.component';
export {
  RouteLayerComponent,
  FreeboardRouteLayerComponent
} from './lib/resources/layer-routes.component';
export {
  RegionLayerComponent,
  FreeboardRegionLayerComponent
} from './lib/resources/layer-regions.component';
export { FreeboardChartLayerComponent } from './lib/resources/layer-charts.component';
export { ChartBoundsLayerComponent } from './lib/resources/layer-chart-bounds.component';
export { TrackLayerComponent } from './lib/resources/layer-tracks.component';
export { ResourceSetLayerComponent } from './lib/resources/layer-resourceset.component';
export { SKTargetsLayerComponent } from './lib/resources/layer-sktargets.component';
export { SKVesselsLayerComponent } from './lib/resources/layer-skvessels.component';
export { SKTargetTracksLayerComponent } from './lib/resources/layer-sktarget-tracks.component';
export { AnchorAlarmComponent } from './lib/alarms/layer-anchor-alarm.component';
export { AlarmComponent } from './lib/alarms/layer-alarm.component';
export { CPAAlarmComponent } from './lib/alarms/layer-cpa-alarm.component';
export { ArrivalCircleComponent } from './lib/navigation/layer-arrival-circle.component';
export { XTEPathComponent } from './lib/navigation/layer-xte-path.component';
export { BearingLineComponent } from './lib/navigation/layer-bearing-line.component';
export { LaylineComponent } from './lib/navigation/layer-layline.component';
export { TargetAngleComponent } from './lib/navigation/layer-target-angle.component';
export { DirectionOfTravelComponent } from './lib/navigation/layer-dot.component';
export { VesselComponent } from './lib/vessel/layer-vessel.component';
export { VesselTrailComponent } from './lib/vessel/layer-vessel-trail.component';

const declarations = [
  ContentComponent,
  ControlsDirective,
  LayerComponent,
  InteractionsDirective,
  MapComponent,
  OverlayComponent,
  ViewDirective,
  ControlComponent,
  InteractionDrawComponent,
  InteractionModifyComponent,
  WaypointLayerComponent,
  FreeboardWaypointLayerComponent,
  NoteLayerComponent,
  FreeboardNoteLayerComponent,
  RouteLayerComponent,
  FreeboardRouteLayerComponent,
  RegionLayerComponent,
  FreeboardRegionLayerComponent,
  TrackLayerComponent,
  FreeboardChartLayerComponent,
  ChartBoundsLayerComponent,
  ResourceSetLayerComponent,
  SKTargetsLayerComponent,
  SKTargetTracksLayerComponent,
  AnchorAlarmComponent,
  AlarmComponent,
  CPAAlarmComponent,
  ArrivalCircleComponent,
  XTEPathComponent,
  BearingLineComponent,
  LaylineComponent,
  TargetAngleComponent,
  VesselComponent,
  VesselTrailComponent,
  SKVesselsLayerComponent,
  DirectionOfTravelComponent
];

@NgModule({
  imports: [],
  declarations: [...declarations],
  exports: [...declarations]
})
export class FreeboardOpenlayersModule {}
