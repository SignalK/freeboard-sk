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
import { AppFacade } from 'src/app/app.facade';
import { SKResourceSet } from '../../resourceset-class';

/********* ResourceSetFeatureModal **********
 * Displays information about a ResourceSet feature
	data: {
    id: string
    skres: SKResourceSet;
  }
***********************************/
@Component({
  selector: 'ap-resourceset-feature-modal',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule
  ],
  template: `
    <div class="_ap-resource-set-feature">
      <mat-toolbar style="background-color: transparent">
        <span> </span>
        <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
          {{ title }}
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

      <mat-card>
        <mat-card-content>
          <div style="padding-bottom: 5px; display: flex">
            <div style="font-weight: bold; vertical-align: top">Name:</div>
            <div style="padding-left: 10px">{{ properties.name }}</div>
          </div>
          <div style="font-weight: bold; vertical-align: top">Description:</div>
          <div style="overflow-y: auto; height: 60px" target="notelink">
            {{ properties.description }}
          </div>
          <div style="padding-bottom: 5px; display: flex">
            <div style="font-weight: bold; vertical-align: top">
              Resource Set:
            </div>
            <div style="padding-left: 10px">
              {{ properties['resourceset.name'] }}
            </div>
          </div>
          <div style="padding-bottom: 5px; display: flex">
            <div style="font-weight: bold; vertical-align: top">
              Collection:
            </div>
            <div style="padding-left: 10px">
              {{ properties['resourceset.collection'] }}
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      ._ap-resource-set-feature {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-resource-set-feature .key-label {
        font-weight: 500;
      }
      ._ap-resource-set-feature .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class ResourceSetFeatureModal implements OnInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected properties: any = {};
  protected title = 'ResourceSet Feature: ';

  constructor(
    public app: AppFacade,
    private cdr: ChangeDetectorRef,
    public modalRef: MatBottomSheetRef<ResourceSetFeatureModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      id: string;
      skres: SKResourceSet;
    }
  ) {}

  ngOnInit() {
    this.parse();
  }

  closeModal() {
    this.modalRef.dismiss();
  }

  parse() {
    const t = this.data.id.split('.');
    const fIndex = Number(t[t.length - 1]);
    const features = this.data.skres.values.features;
    const feature = fIndex < features.length ? features[fIndex] : features[0];

    this.title = feature.properties.name ?? 'Feature';
    this.properties = {
      name: feature.properties.name ?? '',
      description: feature.properties.description ?? '',
      'position.latitude': feature.geometry.coordinates[1],
      'position.longitude': feature.geometry.coordinates[0],
      'resourceset.name': this.data.skres.name,
      'resourceset.description': this.data.skres.description,
      'resourceset.collection': t[1]
    };
  }
}
