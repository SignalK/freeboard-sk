import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// ***
import { AppComponent } from './app.component';
import { AppMaterialModule } from './lib/app-material.module';
import { AppUIModule } from './lib/app-ui';
import { SignalKModule } from './lib/sk-resources';

import { AngularOpenlayersModule } from 'ngx-openlayers';

// ***
import { SettingsPage } from './pages';

@NgModule({
  declarations: [
    AppComponent,
    SettingsPage
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, 
    FormsModule, HttpClientModule,
    AppMaterialModule, AppUIModule, SignalKModule,
    AngularOpenlayersModule
  ],
  entryComponents: [ SettingsPage ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
