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
import {
  CompassComponent,
  PopoverComponent,
  FeatureListPopoverComponent,
  AtoNPopoverComponent,
  AircraftPopoverComponent,
  AlarmPopoverComponent,
  ResourcePopoverComponent,
  ResourceSetPopoverComponent
} from './components/popover/';
// ** navigation **
import { RouteNextPointComponent } from './components/navigation';
// ** profiles
import { VesselPopoverComponent } from './components/profiles/default';

import { FreeboardOpenlayersModule } from 'src/app/modules/map/ol';
import { FBMapComponent } from './fb-map.component';
import { PipesModule } from 'src/app/lib/pipes';

@NgModule({
  imports: [
    CommonModule,
    MatTooltipModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PipesModule,
    MatCardModule,
    MatMenuModule,
    FreeboardOpenlayersModule
  ],
  declarations: [
    PopoverComponent,
    FeatureListPopoverComponent,
    VesselPopoverComponent,
    ResourcePopoverComponent,
    ResourceSetPopoverComponent,
    RouteNextPointComponent,
    AtoNPopoverComponent,
    AircraftPopoverComponent,
    AlarmPopoverComponent,
    CompassComponent,
    FBMapComponent
  ],
  exports: [
    PopoverComponent,
    FeatureListPopoverComponent,
    VesselPopoverComponent,
    ResourcePopoverComponent,
    ResourceSetPopoverComponent,
    RouteNextPointComponent,
    AtoNPopoverComponent,
    AircraftPopoverComponent,
    AlarmPopoverComponent,
    CompassComponent,
    FBMapComponent
  ],
  providers: []
})
export class FBMapModule {}
