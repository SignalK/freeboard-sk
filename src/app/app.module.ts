import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';

// ***
import { AppComponent } from './app.component';
import {
  FBMapComponent,
  ExperimentsComponent,
  AnchorWatchComponent,
  AlarmComponent,
  AlarmsDialog,
  AutopilotComponent,
  RouteNextPointComponent,
  RouteListComponent,
  WaypointListComponent,
  ChartListComponent,
  NoteListComponent,
  AISListComponent,
  BuildRouteComponent
} from './modules';

import {
  TextDialComponent,
  FileInputComponent,
  PiPVideoComponent,
  WakeLockComponent,
  Measurements
} from './lib/components';

@NgModule({
  declarations: [AppComponent],
  imports: [
    HttpClientModule,
    MatMenuModule,
    MatSidenavModule,
    MatBadgeModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    BrowserModule,
    BrowserAnimationsModule,
    FBMapComponent,
    TextDialComponent,
    FileInputComponent,
    PiPVideoComponent,
    WakeLockComponent,
    AutopilotComponent,
    BuildRouteComponent,
    Measurements,
    RouteListComponent,
    WaypointListComponent,
    ChartListComponent,
    NoteListComponent,
    AISListComponent,
    BuildRouteComponent,
    ExperimentsComponent,
    AnchorWatchComponent,
    AlarmComponent,
    AlarmsDialog,
    RouteNextPointComponent
  ],
  exports: [],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
