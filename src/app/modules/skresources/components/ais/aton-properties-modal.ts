import { Component, OnInit, Inject } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { SKAtoN } from 'src/app/modules/skresources/resource-classes';
import { SignalKDetailsComponent } from '../../components/signalk-details.component';

/********* AtoNPropertiesModal **********
	data: {
        title: "<string>" title text,
        target: "<SKAtoN>" aid to navigation
        icon: <string>
    }
***********************************/
@Component({
  selector: 'ap-aton-modal',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-aton">
      <mat-toolbar style="background-color: transparent">
        <span>
          <mat-icon> {{ data.icon }}</mat-icon>
        </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          {{ data.title }}
        </span>
        <span>
          <button
            mat-icon-button
            (click)="modalRef.dismiss()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </mat-toolbar>

      <mat-card>
        <mat-card-content>
          <div style="display:flex;flex-direction: column;">
            <div style="display:flex;">
              <div class="key-label">Name:</div>
              <div style="flex: 1 1 auto;">{{ data.target.name }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">MMSI:</div>
              <div style="flex: 1 1 auto;">{{ data.target.mmsi }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Type:</div>
              <div style="flex: 1 1 auto;">{{ data.target.type.name }}</div>
            </div>
            <button mat-stroked-button (click)="toggleProperties()">
              <span>Show {{ showProperties ? 'Less' : 'More' }}</span>
              <mat-icon>{{
                showProperties ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
              }}</mat-icon>
            </button>
            @if(showProperties) {
            <signalk-details-list [details]="properties"></signalk-details-list>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      ._ap-aton {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-aton .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AtoNPropertiesModal implements OnInit {
  protected showProperties = true;
  protected properties: { [key: string]: string | number | null };

  constructor(
    private sk: SignalKClient,
    private app: AppFacade,
    public modalRef: MatBottomSheetRef<AtoNPropertiesModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      title: string;
      target: SKAtoN;
      id: string;
      icon: string;
      type: 'aton' | 'sar' | 'meteo';
    }
  ) {}

  ngOnInit() {
    this.getAtoNInfo();
  }

  toggleProperties() {
    this.showProperties = !this.showProperties;
  }

  // fetch object information
  private getAtoNInfo() {
    if (!this.data.id) {
      return;
    }
    const path = this.data.id.split('.').join('/');

    this.sk.api.get(path).subscribe((v) => {
      if (this.data.type === 'meteo') {
        this.properties = this.parseMeteo(v);
      } else {
        this.properties = this.parseAtoN(v);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseMeteo(data: any) {
    const res = {};

    if (data.navigation && data.navigation.position) {
      res['navigation.position'] = data.navigation.position.value;
    }
    const bk = data.environment.observation ?? data.environment;
    const pk = data.environment.observation
      ? 'environment.observation'
      : 'environment';
    if (bk) {
      this.processPathObject(res, bk, pk);
    }
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processPathObject(res: any, bk: any, pk: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.keys(bk).forEach((k: any) => {
      const pathRoot = `${pk}.${k}`;
      const g = bk[k];
      if (k === 'water') {
        this.processPathObject(res, g, pathRoot);
      } else if (g.meta) {
        res[pathRoot] = this.app.formatValueForDisplay(
          g.value,
          g.meta.units ? g.meta.units : '',
          k.toLowerCase().includes('level') ||
            k.toLowerCase().includes('height') // depth values
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(g).forEach((i: any) => {
          const key = `${pathRoot}.${i[0]}`;
          res[key] = this.app.formatValueForDisplay(
            i[1].value,
            i[1].meta && i[1].meta.units ? i[1].meta.units : '',
            i[0].toLowerCase().includes('level') ||
              i[0].toLowerCase().includes('height') // depth values
          );
        });
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAtoN(data: any) {
    const res = {};
    if (data.navigation && data.navigation.position) {
      res['navigation.position'] = data.navigation.position.value;
    }
    return Object.assign(res, this.data.target.properties);
  }
}
