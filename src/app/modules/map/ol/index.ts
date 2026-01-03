/*
 * Public API Surface of ng-openlayers
 */
import { NgModule } from '@angular/core';
import { InteractionsDirective } from './lib/interactions.directive';

import { MapComponent } from './lib/map.component';
import { OverlayComponent } from './lib/overlay.component';
import { ControlsDirective } from './lib/controls.directive';
import { ViewDirective } from './lib/view.directive';
import { ContentComponent } from './lib/content.component';
import { LayerComponent } from './lib/layer.component';
import { ControlComponent } from './lib/control.component';

import { InteractionDrawComponent } from './lib/interactions/interaction-draw.component';
import { InteractionModifyComponent } from './lib/interactions/interaction-modify.component';
import { InteractionDragBoxComponent } from './lib/interactions/interaction-dragbox.component';
import { FreeboardWaypointLayerComponent } from './lib/resources/layer-waypoints.component';
import { FreeboardNoteLayerComponent } from './lib/resources/layer-notes.component';
import { FreeboardRouteLayerComponent } from './lib/resources/layer-routes.component';
import { FreeboardRegionLayerComponent } from './lib/resources/layer-regions.component';
import { FreeboardLiveLayerComponent } from './lib/resources/layer-livelayer.component';
import { ChartBoundsLayerComponent } from './lib/resources/layer-chart-bounds.component';
import { TrackLayerComponent } from './lib/resources/layer-tracks.component';
import { ResourceSetLayerComponent } from './lib/resources/layer-resourceset.component';
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
import { FBFeatureLayerComponent } from './lib/sk-feature.component';
import { RacingStartLineLayerComponent } from './lib/racing/layer-racing-startline.component';
import { AISFlagsLayerComponent } from './lib/resources/layer-aisflags.component';
import { AISWindLayerComponent } from './lib/resources/layer-aiswind.component';
import { AISTargetsLayerComponent } from './lib/resources/layer-aistargets.component';
import { AISVesselsLayerComponent } from './lib/resources/layer-aisvessels.component';
import { AISTargetsTrackLayerComponent } from './lib/resources/layer-aistargets-track.component';
import { RangeCirclesComponent } from './lib/navigation/layer-range-circles.component';
import { CogLineComponent } from './lib/navigation/layer-cog-line.component';
import { WindLinesComponent } from './lib/navigation/layer-wind-lines.component';
import { RasterChartLayerComponent } from './lib/charts/layer-raster-chart.component';
import { VectorChartLayerComponent } from './lib/charts/layer-vector-chart.component';
import { WmsChartLayerComponent } from './lib/charts/layer-wms-chart.component';
import { WmtsChartLayerComponent } from './lib/charts/layer-wmts-chart.component';
import { TileJsonChartLayerComponent } from './lib/charts/layer-tilejson-chart.component';
import { MapStyleJsonChartLayerComponent } from './lib/charts/layer-mapstylejson-chart.component';
import { S57ChartLayerComponent } from './lib/charts/layer-s57-chart.component';

export * from './lib/util';
export { MapService } from './lib/map.service';
export { S57Service } from './lib/charts/s57.service';

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
export { InteractionDragBoxComponent } from './lib/interactions/interaction-dragbox.component';
export { FreeboardWaypointLayerComponent } from './lib/resources/layer-waypoints.component';
export { FreeboardNoteLayerComponent } from './lib/resources/layer-notes.component';
export { FreeboardRouteLayerComponent } from './lib/resources/layer-routes.component';
export { FreeboardRegionLayerComponent } from './lib/resources/layer-regions.component';
export { FreeboardLiveLayerComponent } from './lib/resources/layer-livelayer.component';
export { ChartBoundsLayerComponent } from './lib/resources/layer-chart-bounds.component';
export { TrackLayerComponent } from './lib/resources/layer-tracks.component';
export { ResourceSetLayerComponent } from './lib/resources/layer-resourceset.component';
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
export { FBFeatureLayerComponent } from './lib/sk-feature.component';
export { RacingStartLineLayerComponent } from './lib/racing/layer-racing-startline.component';
export { AISFlagsLayerComponent } from './lib/resources/layer-aisflags.component';
export { AISWindLayerComponent } from './lib/resources/layer-aiswind.component';
export { AISTargetsLayerComponent } from './lib/resources/layer-aistargets.component';
export { AISVesselsLayerComponent } from './lib/resources/layer-aisvessels.component';
export { AISTargetsTrackLayerComponent } from './lib/resources/layer-aistargets-track.component';
export { RangeCirclesComponent } from './lib/navigation/layer-range-circles.component';
export { CogLineComponent } from './lib/navigation/layer-cog-line.component';
export { WindLinesComponent } from './lib/navigation/layer-wind-lines.component';
export { RasterChartLayerComponent } from './lib/charts/layer-raster-chart.component';
export { VectorChartLayerComponent } from './lib/charts/layer-vector-chart.component';
export { WmsChartLayerComponent } from './lib/charts/layer-wms-chart.component';
export { WmtsChartLayerComponent } from './lib/charts/layer-wmts-chart.component';
export { TileJsonChartLayerComponent } from './lib/charts/layer-tilejson-chart.component';
export { MapStyleJsonChartLayerComponent } from './lib/charts/layer-mapstylejson-chart.component';
export { S57ChartLayerComponent } from './lib/charts/layer-s57-chart.component';

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
  InteractionDragBoxComponent,
  FreeboardWaypointLayerComponent,
  FreeboardNoteLayerComponent,
  FreeboardRouteLayerComponent,
  FreeboardRegionLayerComponent,
  TrackLayerComponent,
  FreeboardLiveLayerComponent,
  ChartBoundsLayerComponent,
  ResourceSetLayerComponent,
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
  DirectionOfTravelComponent,
  FBFeatureLayerComponent,
  RacingStartLineLayerComponent,
  AISFlagsLayerComponent,
  AISWindLayerComponent,
  AISTargetsLayerComponent,
  AISVesselsLayerComponent,
  AISTargetsTrackLayerComponent,
  RangeCirclesComponent,
  CogLineComponent,
  WindLinesComponent,
  RasterChartLayerComponent,
  VectorChartLayerComponent,
  WmsChartLayerComponent,
  WmtsChartLayerComponent,
  TileJsonChartLayerComponent,
  MapStyleJsonChartLayerComponent,
  S57ChartLayerComponent
];

@NgModule({
  imports: [],
  declarations: [...declarations],
  exports: [...declarations]
})
export class FreeboardOpenlayersModule {}
