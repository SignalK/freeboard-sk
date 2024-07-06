/** Resource Dialog Components **
 ********************************/

import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { SKTrack } from 'src/app/modules/skresources/resource-classes';

/********* TracksModal **********
	data: {
        title: "<string>" title text
        skres: SKTrack
    }
***********************************/
@Component({
  selector: 'ap-tracks-modal',
  standalone: true,
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule
  ],
  template: `
    <div class="_ap-tracks">
      <mat-toolbar style="background-color: transparent">
        <span>
          <button
            mat-icon-button
            [disabled]="app.config.selections.tracks.length === 0"
            matTooltip="Clear selections"
            matTooltipPosition="right"
            (click)="clearSelections()"
          >
            <mat-icon>check_box_outline_blank</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Fetch track entries"
            matTooltipPosition="right"
            (click)="getTracks()"
          >
            <mat-icon color="primary">refresh</mat-icon>
          </button>
        </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          {{ data.title }}
        </span>
        <span>
          <button
            mat-icon-button
            (click)="closeModal()"
            matTooltip="Close"
            matTooltipPosition="left"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      @for(trk of trackList; track trk; let idx = $index) {
      <mat-card>
        <mat-card-content>
          <div style="display:flex;flex-wrap:no-wrap;">
            <div style="width:45px;">
              <mat-checkbox
                color="primary"
                [checked]="selTrk[idx]"
                (change)="handleCheck($event.checked, trk[0], idx)"
              ></mat-checkbox>
            </div>
            <div style="flex:1 1 auto;">
              <div class="key-label">
                {{ trk[1].feature?.properties?.name }}
              </div>
              <div class="key-desc">
                {{ trk[1].feature?.properties?.description }}
              </div>
            </div>
            <div style="width:45px;">
              <button
                mat-icon-button
                color="warn"
                matTooltip="Delete Track"
                matTooltipPosition="left"
                (click)="handleDelete(trk[0])"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      }
    </div>
  `,
  styles: [
    `
      ._ap-tracks {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-tracks .key-label {
        font-weight: 500;
      }
      ._ap-tracks .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class TracksModal implements OnInit {
  public trackList: Array<[string, SKTrack]>;
  public selTrk = [];

  constructor(
    public app: AppInfo,
    private cdr: ChangeDetectorRef,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<TracksModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skres: any;
    }
  ) {}

  ngOnInit() {
    if (this.data.title === 'undefined') {
      this.data['title'] = 'Tracks';
    }
    this.getTracks();
  }

  closeModal() {
    this.modalRef.dismiss();
  }

  getTracks() {
    this.sk.api.get(this.app.skApiVersion, '/resources/tracks').subscribe(
      (trks) => {
        this.trackList = Object.entries(trks).map((trk: [string, SKTrack]) => {
          trk[1]['feature']['id'] = trk[0].toString();
          delete trk[1]['$source'];
          delete trk[1]['timestamp'];
          return trk;
        });
        this.selTrk = [];
        for (let i = 0; i < this.trackList.length; i++) {
          this.selTrk.push(
            this.app.config.selections.tracks.includes(this.trackList[i][0])
              ? true
              : false
          );
        }
        this.cdr.detectChanges();
      },
      () => {
        this.trackList = [];
        this.selTrk = [];
        this.cdr.detectChanges();
      }
    );
  }

  handleDelete(id: string) {
    if (!this.data.skres) {
      return;
    }
    this.trackList = this.trackList.filter((t) => {
      return t[0] === id ? false : true;
    });
    this.data.skres.showTrackDelete(id).subscribe((ok) => {
      if (ok) {
        const i = this.app.config.selections.tracks.indexOf(id);
        if (i !== -1) {
          this.app.config.selections.tracks.splice(i, 1);
        }
        this.data.skres.deleteResource('tracks', id);
        setTimeout(this.getTracks.bind(this), 2000);
        this.app.saveConfig();
      } else {
        this.getTracks();
      }
    });
  }

  handleCheck(checked: boolean, id: string, idx: number) {
    this.selTrk[idx] = checked;
    if (checked) {
      this.app.config.selections.tracks.push(id);
    } else {
      const i = this.app.config.selections.tracks.indexOf(id);
      if (i !== -1) {
        this.app.config.selections.tracks.splice(i, 1);
      }
    }
    this.app.saveConfig();
    this.updateTracks();
  }

  clearSelections() {
    this.selTrk = [];
    for (let i = 0; i < this.trackList.length; i++) {
      this.selTrk[i] = false;
    }
    this.app.config.selections.tracks = [];
    this.app.saveConfig();
    this.updateTracks();
  }

  updateTracks() {
    this.app.data.tracks = this.trackList
      .map((trk) => {
        return trk[1];
      })
      .filter((t) => {
        return this.app.config.selections.tracks.includes(t.feature.id)
          ? true
          : false;
      });
    if (this.data.skres) {
      this.data.skres.trackSelected();
    }
  }
}
