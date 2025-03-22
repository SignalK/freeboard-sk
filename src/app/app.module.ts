import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// ***
import { AppComponent } from './app.component';
import {
  FBMapComponent,
  ExperimentsComponent,
  AnchorWatchComponent,
  AlertComponent,
  AlertListComponent,
  AutopilotComponent,
  RouteNextPointComponent,
  RouteListComponent,
  WaypointListComponent,
  ChartListComponent,
  NoteListComponent,
  TrackListComponent,
  AISListComponent,
  BuildRouteComponent
} from './modules';

import {
  TextDialComponent,
  TTGDialComponent,
  ETADialComponent,
  FileInputComponent,
  PiPVideoComponent,
  WakeLockComponent,
  Measurements
} from './lib/components';

@NgModule({
  declarations: [AppComponent],
  exports: [],
  bootstrap: [AppComponent],
  imports: [
    MatMenuModule,
    MatSidenavModule,
    MatBadgeModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    BrowserModule,
    BrowserAnimationsModule,
    FBMapComponent,
    TextDialComponent,
    TTGDialComponent,
    ETADialComponent,
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
    TrackListComponent,
    AISListComponent,
    BuildRouteComponent,
    ExperimentsComponent,
    AnchorWatchComponent,
    AlertComponent,
    AlertListComponent,
    RouteNextPointComponent
  ],
  providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule {}
