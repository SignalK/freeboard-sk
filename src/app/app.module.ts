import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// ***
import { AngularOpenlayersModule } from 'ngx-openlayers';
// ***
import { AppComponent } from './app.component';
import { AppMaterialModule } from './lib/app-material.module';
import { AppUIModule } from './lib/app-ui';

import { SettingsModule, GPXLoadModule, GeoJSONModule, AlarmsModule, ExperimentsModule,
        SKStreamModule, SignalKResourcesModule, FBMapModule, CourseModule } from './modules';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, 
    FormsModule, HttpClientModule,
    AppMaterialModule, AppUIModule, ExperimentsModule,
    SignalKResourcesModule, FBMapModule, CourseModule,
    GPXLoadModule, GeoJSONModule, SettingsModule, 
    AlarmsModule, SKStreamModule,
    AngularOpenlayersModule
  ],
  exports: [],
  providers: [],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
