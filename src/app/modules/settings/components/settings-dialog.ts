import { Component, OnInit, Inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
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

interface PreferredPathsResult {
  save: boolean;
  value: { [key: string]: string };
}

//** Settings **
@Component({
  selector: 'settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
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
  public display = { favourites: false };
  public menuItems = [
    { id: 'sectDisplay', text: 'Display & Sound' },
    { id: 'sectS57', text: 'Charts' },
    { id: 'sectUnits', text: 'Units & Values' },
    { id: 'sectCourse', text: 'Course' },
    { id: 'sectVessels', text: 'Vessels' },
    { id: 'sectNotes', text: 'Notes' },
    { id: 'sectVideo', text: 'Video' },
    { id: 'sectResLayers', text: 'Resources' },
    { id: 'sectResLayers', text: 'Signal K' }
  ];

  public aisStateFilter = {
    moored: false,
    anchored: false
  };

  private saveOnClose = false;

  constructor(
    public facade: SettingsFacade,
    public myElement: ElementRef,
    public dialogRef: MatDialogRef<SettingsDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  ngOnInit() {
    this.facade.refresh();
    this.facade.settings.selections.aisState.forEach((i: string) => {
      if (i in this.aisStateFilter) {
        this.aisStateFilter[i] = true;
      }
    });
  }

  //ngOnDestroy() { }

  jumpTo(id: string, wait = false) {
    if (wait) {
      setTimeout(() => this.jumpTo(id, false), 50);
    } else {
      this.myElement.nativeElement.ownerDocument
        .getElementById(id)
        .scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ** handle dialog close action
  handleClose() {
    this.dialogRef.close(this.saveOnClose);
  }

  toggleFavourites() {
    this.display.favourites = this.display.favourites ? false : true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormChange(e: unknown, f: any, deferSave = false) {
    if (deferSave) {
      this.saveOnClose = true;
    } else {
      if (!f.invalid) {
        this.facade.applySettings();
      } else {
        console.warn('SETTINGS:', 'Form field invalid: Config NOT Saved!');
      }
    }
  }

  onPreferredPaths(e: PreferredPathsResult) {
    if (e.save) {
      this.facade.settings.selections.preferredPaths = e.value;
      this.facade.applySettings();
    }
  }

  onFavSelected(e: unknown, f) {
    this.facade.settings.selections.pluginFavourites =
      f.selectedOptions.selected.map((i) => i.value);
    this.facade.applySettings();
  }

  onResPathSelected(e: unknown, f) {
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
    this.facade.applySettings();
  }

  onAisStateFilter() {
    const s = [];
    for (const i in this.aisStateFilter) {
      if (this.aisStateFilter[i]) {
        s.push(i);
      }
    }
    this.facade.settings.selections.aisState = [].concat(s);
    this.facade.applySettings();
  }

  noSort() {
    return 0;
  }

  // delete auth token
  clearAuthToken() {
    this.facade.clearToken();
  }
}
