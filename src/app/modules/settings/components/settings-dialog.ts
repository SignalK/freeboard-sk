import { Component, OnInit, ElementRef, signal } from '@angular/core';

import { FormsModule, NgModel } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';

import { SignalKPreferredPathsComponent } from './signalk-preferredpaths.component';
import { SettingsFacade } from '../settings.facade';
import { SettingsSaveOptions } from 'src/app/lib/services';
import { defaultConfig } from 'src/app/app.settings';
import { SettingsOptions } from '../settings.facade';

interface PreferredPathsResult {
  save: boolean;
  value: { [key: string]: string };
}

//** Settings **
@Component({
  selector: 'settings-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatRadioModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatToolbarModule,
    MatTabsModule,
    SignalKPreferredPathsComponent
  ],
  templateUrl: './settings-dialog.html',
  styleUrls: ['./settings-dialog.css']
})
export class SettingsDialog implements OnInit {
  protected show = {
    favourites: signal<boolean>(false)
  };

  protected options: SettingsOptions;

  public aisStateFilter = {
    moored: false,
    anchored: false
  };

  private saveOnClose = false;

  constructor(
    protected facade: SettingsFacade,
    protected myElement: ElementRef,
    protected dialogRef: MatDialogRef<SettingsDialog>
  ) {
    this.options = new SettingsOptions();
  }

  ngOnInit() {
    this.facade.refresh();
    this.facade.settings.selections.aisState.forEach((i: string) => {
      if (i in this.aisStateFilter) {
        this.aisStateFilter[i] = true;
      }
    });
  }

  /**
   * handle dialog close action
   */
  handleClose() {
    if (this.saveOnClose) {
      this.persistModel();
    }
    this.dialogRef.close();
  }

  /**
   * toggle display of favourites
   */
  toggleFavourites() {
    this.show.favourites.update((current) => !current);
  }

  /**
   * Parse entered number value and fall back to default if null.
   */
  parseNumber(e: NgModel) {
    if (typeof e.model !== 'number') {
      e.reset(this.fallbackToDefault());
      return;
    }
    if (e.model < 0) {
      e.reset(Math.abs(e.model));
    }
    this.persistModel();
  }

  /**
   * Returns the fallback value for an invalid number entry.
   * @returns default value
   */
  private fallbackToDefault() {
    const dconfig = defaultConfig();
    if (
      typeof this.facade.settings.selections.s57Options.shallowDepth !==
      'number'
    ) {
      return dconfig.selections.s57Options.shallowDepth;
    }
    if (
      typeof this.facade.settings.selections.s57Options.safetyDepth !== 'number'
    ) {
      return dconfig.selections.s57Options.safetyDepth;
    }
    if (
      typeof this.facade.settings.selections.s57Options.deepDepth !== 'number'
    ) {
      return dconfig.selections.s57Options.deepDepth;
    }
    if (
      typeof this.facade.fixedPosition[0] !== 'number' ||
      typeof this.facade.fixedPosition[1] !== 'number'
    ) {
      return 0;
    }
  }

  /**
   * Persist Settings after model change
   */
  persistModel(options?: SettingsSaveOptions) {
    this.facade.applySettings(options);
  }

  /**
   * Defer persisting Settings until dialog close
   */
  deferPersist() {
    this.saveOnClose = true;
  }

  /**
   * Handle default intrument app selection
   */
  onInstrumentApp() {
    this.persistModel();
    this.facade.buildFavouritesList();
  }

  /**
   * Handle Preferred Paths component event
   * @param e
   */
  onPreferredPaths(e: PreferredPathsResult) {
    if (e.save) {
      this.facade.settings.selections.preferredPaths = e.value as any;
      this.persistModel();
    }
  }

  /**
   * Handle favourites component event
   * @param e
   */
  onFavSelected(e: unknown, f) {
    this.facade.settings.selections.pluginFavourites =
      f.selectedOptions.selected.map((i) => i.value);
    this.persistModel();
  }

  /**
   * Handle AIS state filter change
   */
  onAisStateFilter() {
    const s = [];
    for (const i in this.aisStateFilter) {
      if (this.aisStateFilter[i]) {
        s.push(i);
      }
    }
    this.facade.settings.selections.aisState = [].concat(s);
    this.persistModel();
  }

  /**
   * Handle custom resource path selection changes
   * @param f
   */
  onResPathSelected(f) {
    this.facade.settings.resources.paths = f.selectedOptions.selected.map(
      (i) => i.value
    );
    //ensure all selected paths have relevant 'selections' entry
    this.facade.settings.resources.paths.forEach((i) => {
      if (i in this.facade.settings.selections.resourceSets) {
        /* already has selection array */
      } else {
        this.facade.settings.selections.resourceSets[i] = [];
      } //create selection array
    });
    this.persistModel();
  }

  /**
   * delete auth token
   */
  clearAuthToken() {
    this.facade.clearToken();
  }
}
