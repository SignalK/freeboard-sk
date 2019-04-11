import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// ***
import { AngularOpenlayersModule } from 'ngx-openlayers';

import { AppComponent } from './app.component';
import { AppMaterialModule } from './lib/app-material.module';
import { AppUIModule } from './lib/app-ui';
import { GPXLoadModule } from './lib/gpxload/gpxload.module';

import { SignalKResourcesModule } from './lib/skresources/';

import { SettingsDialog } from './pages';

@NgModule({
  declarations: [
    AppComponent, SettingsDialog
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, 
    FormsModule, HttpClientModule,
    AppMaterialModule, AppUIModule, SignalKResourcesModule,
    GPXLoadModule, 
    AngularOpenlayersModule
  ],
  entryComponents: [ SettingsDialog ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
