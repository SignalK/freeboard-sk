import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// ***
import { AppComponent } from './app.component';
import { AppMaterialModule, AppUIModule } from './lib';

import {
  SettingsModule,
  GPXModule,
  GeoJSONModule,
  AlarmsModule,
  ExperimentsModule,
  SKStreamModule,
  SignalKResourcesModule,
  FBMapModule,
  CourseModule
} from './modules';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppMaterialModule,
    AppUIModule,
    ExperimentsModule,
    SignalKResourcesModule,
    FBMapModule,
    CourseModule,
    GPXModule,
    GeoJSONModule,
    SettingsModule,
    AlarmsModule,
    SKStreamModule
  ],
  exports: [],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
