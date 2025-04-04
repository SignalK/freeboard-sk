import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipesModule } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';

import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import { SKRoute, SKWaypoint, SKNote, SKRegion } from 'src/app/modules';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';

/*********** Resource Popover ***************
title: string -  title text,
resource: resource data
type: string - resource type
id: string - resource id
*************************************************/
@Component({
  selector: 'resource-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent
  ],
  template: `
    <ap-popover
      [title]="title"
      [icon]="icon"
      [canClose]="canClose"
      (closed)="handleClose()"
    >
      <div
        style="flex: 1 1 auto;text-align:left;font-style: italic; overflow: hidden;
                                display: -webkit-box;
                                -webkit-box-orient: vertical;
                                -webkit-line-clamp: 2;
                                line-clamp: 2;
                                text-overflow:ellipsis;"
      >
        {{ resource[1].description ?? '' }}
      </div>
      @for(p of properties; track p) {
      <div style="display:flex;">
        <div style="font-weight:bold;">{{ p[0] }}:</div>
        @if(p[0] !== 'Latitude' && p[0] !== 'Longitude') {
        <div
          style="flex: 1 1 auto;text-align:right;
                                  white-space:nowrap;
                                  overflow-x:hidden;
                                  text-overflow:ellipsis;"
        >
          {{ p[1] }}
        </div>
        } @if(p[0] === 'Latitude') {
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="
            p[1] | coords : app.config.selections.positionFormat : true
          "
        ></div>
        } @if(p[0] === 'Longitude') {
        <div
          style="flex: 1 1 auto;text-align:right;"
          [innerText]="p[1] | coords : app.config.selections.positionFormat"
        ></div>
        }
      </div>
      }

      <div style="display:flex;flex-wrap: wrap;">
        @if(ctrl.showModifyButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitModify()"
            matTooltip="Modify / Move"
            matTooltipPosition="after"
            [disabled]="this.ctrl.isReadOnly"
          >
            <mat-icon>touch_app</mat-icon>
            MOVE
          </button>
        </div>
        } @if(ctrl.showAddNoteButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitAddNote()"
            matTooltip="Add Note"
            matTooltipPosition="after"
          >
            <mat-icon>local_offer</mat-icon>
            ADD
          </button>
        </div>
        } @if(ctrl.showDeleteButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitDelete()"
            matTooltip="Delete"
            matTooltipPosition="after"
            [disabled]="this.ctrl.isReadOnly"
          >
            <mat-icon>delete</mat-icon>
            DELETE
          </button>
        </div>
        } @if(ctrl.canActivate && !ctrl.isActive) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitActive(true)"
            [matTooltip]="
              type === 'waypoint'
                ? 'Navigate to Waypoint'
                : 'Make this the Active Route'
            "
            matTooltipPosition="after"
          >
            <mat-icon>near_me</mat-icon>
            {{ ctrl.activeText }}
          </button>
        </div>
        } @else if (ctrl.canActivate && ctrl.isActive) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitActive(false)"
            matTooltip="Clear Destination"
            matTooltipPosition="after"
          >
            <mat-icon>clear_all</mat-icon>
            CLEAR
          </button>
        </div>
        } @if(ctrl.showRelatedButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitRelated()"
            matTooltip="Notes in Group"
            matTooltipPosition="after"
          >
            <mat-icon>style</mat-icon>
            GROUP
          </button>
        </div>
        } @if(ctrl.showNotesButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitNotes()"
            matTooltipPosition="after"
            matTooltip="Show Notes"
          >
            <mat-icon>local_offer</mat-icon>
            NOTES
          </button>
        </div>
        } @if(ctrl.showInfoButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitInfo()"
            matTooltip="Show Details"
            matTooltipPosition="after"
          >
            <mat-icon>info_outline</mat-icon>
            INFO
          </button>
        </div>
        } @if(ctrl.showPointsButton) {
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitPoints()"
            matTooltip="Route Waypoints"
            matTooltipPosition="after"
          >
            <mat-icon>flag</mat-icon>
            POINTS
          </button>
        </div>
        }
      </div>
    </ap-popover>
  `,
  styleUrls: [`./popover.component.scss`]
})
export class ResourcePopoverComponent {
  @Input() title: string;
  @Input() type: string;
  @Input() resource: SKRoute | SKWaypoint | SKNote | SKRegion;
  @Input() active: boolean;
  @Input() featureCount = 0;
  @Input() units = 'm';
  @Input() canClose: boolean;
  @Output() modify: EventEmitter<void> = new EventEmitter();
  @Output() delete: EventEmitter<void> = new EventEmitter();
  @Output() addNote: EventEmitter<void> = new EventEmitter();
  @Output() activated: EventEmitter<void> = new EventEmitter();
  @Output() deactivated: EventEmitter<void> = new EventEmitter();
  @Output() related: EventEmitter<string> = new EventEmitter();
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() points: EventEmitter<void> = new EventEmitter();
  @Output() notes: EventEmitter<void> = new EventEmitter();

  properties: Array<unknown>; // ** resource properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctrl: any = {
    showInfoButton: false,
    showModifyButton: false,
    showDeleteButton: false,
    showAddNoteButton: false,
    showRelatedButton: false,
    showPointsButton: false,
    showNotesButton: false,
    canActivate: false,
    isActive: false,
    activeText: 'ACTIVE',
    isReadOnly: false
  };

  protected icon: AppIconDef;

  constructor(public app: AppFacade) {}

  ngOnChanges() {
    this.parse();
    this.ctrl.showModifyButton =
      this.type !== 'destination' &&
      this.resource[0] !== 'n2k' &&
      this.featureCount > 0
        ? true
        : false;
  }

  parse() {
    if (this.type === 'destination') {
      this.parseDestination();
    }
    if (this.type === 'waypoint') {
      this.parseWaypoint();
    }
    if (this.type === 'route') {
      this.parseRoute();
    }
    if (this.type === 'note') {
      this.parseNote();
    }
    if (this.type === 'region') {
      this.parseRegion();
    }
  }

  parseDestination() {
    this.icon = undefined;
    this.ctrl.isActive = this.app.data.activeRoute ? false : true;
    this.ctrl.activeText = 'GO TO';
    this.ctrl.canActivate = this.app.data.activeRoute ? false : true;
    this.ctrl.showInfoButton = false;
    this.ctrl.showModifyButton = false;
    this.ctrl.showDeleteButton = false;
    this.ctrl.showNotesButton = false;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showPointsButton = false;
    this.ctrl.showRelatedButton = false;
    this.properties = [];
    if (this.resource[1].name) {
      this.properties.push(['Name', this.resource[1].name]);
    }
    if (this.resource[1].description) {
      this.properties.push(['Desc.', this.resource[1].description]);
    }
    this.properties.push([
      'Latitude',
      this.resource[1].feature.geometry.coordinates[1]
    ]);
    this.properties.push([
      'Longitude',
      this.resource[1].feature.geometry.coordinates[0]
    ]);
  }

  parseWaypoint() {
    this.ctrl.isActive =
      this.active && this.active === this.resource[0] ? true : false;
    this.ctrl.activeText = 'GO TO';
    this.ctrl.canActivate = true;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton = true;
    this.ctrl.showDeleteButton = true;
    this.ctrl.showNotesButton = true;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showPointsButton = false;
    this.ctrl.showRelatedButton = false;
    this.ctrl.isReadOnly = this.resource[1].feature.properties?.readOnly;
    this.properties = [];

    this.icon = getResourceIcon('waypoints', this.resource[1]);
    this.title = this.resource[1].name ?? '';

    this.properties.push([
      'Latitude',
      this.resource[1].feature.geometry.coordinates[1]
    ]);
    this.properties.push([
      'Longitude',
      this.resource[1].feature.geometry.coordinates[0]
    ]);
  }

  parseRoute() {
    if (this.resource[0] === 'n2k') {
      this.ctrl.isActive = false;
      this.ctrl.activeText = '';
      this.ctrl.canActivate = false;
      this.ctrl.showInfoButton = false;
      this.ctrl.showModifyButton = false;
      this.ctrl.showPointsButton = false;
      this.ctrl.showNotesButton = false;
      this.ctrl.showAddNoteButton = false;
      this.ctrl.showRelatedButton = false;
      this.ctrl.showDeleteButton = false;
    } else {
      this.ctrl.isActive =
        this.active && this.active === this.resource[0] ? true : false;
      this.ctrl.activeText = 'ACTIVATE';
      this.ctrl.canActivate = true;
      this.ctrl.showInfoButton = true;
      this.ctrl.showModifyButton = true;
      this.ctrl.showPointsButton = true;
      this.ctrl.showNotesButton = true;
      this.ctrl.showAddNoteButton = false;
      this.ctrl.showRelatedButton = false;
      this.ctrl.showDeleteButton = this.ctrl.isActive ? false : true;
      this.ctrl.isReadOnly = this.resource[1].feature.properties?.readOnly;
    }

    this.icon = getResourceIcon('routes', this.resource[1]);
    this.title = this.resource[1].name ?? '';
    this.properties = [];
    const d =
      this.units === 'm'
        ? [(this.resource[1].distance / 1000).toFixed(1), 'km']
        : [
            Convert.kmToNauticalMiles(this.resource[1].distance / 1000).toFixed(
              1
            ),
            'NM'
          ];
    this.properties.push(['Distance', `${d[0]} ${d[1]}`]);
  }

  parseNote() {
    this.ctrl.isActive = false;
    this.ctrl.activeText = '';
    this.ctrl.canActivate = false;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton = true;
    this.ctrl.showDeleteButton = true;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showNotesButton = false;
    this.ctrl.showPointsButton = false;
    this.ctrl.showRelatedButton =
      this.resource[1].group && this.app.config.resources.notes.groupNameEdit
        ? true
        : false;

    this.icon = getResourceIcon('notes', this.resource[1]);
    this.title = this.resource[1].name ?? '';
    this.properties = [];
    this.ctrl.isReadOnly = this.resource[1].properties?.readOnly;
  }

  parseRegion() {
    this.ctrl.isActive = false;
    this.ctrl.activeText = '';
    this.ctrl.canActivate = false;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton =
      this.resource[1].feature.geometry.type === 'MultiPolygon' ? false : true;
    this.ctrl.showDeleteButton = true;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showNotesButton = true;
    this.ctrl.showPointsButton = false;
    this.ctrl.showRelatedButton = false;
    this.ctrl.isReadOnly = this.resource[1].feature.properties?.readOnly;
    this.properties = [];
    this.icon = getResourceIcon('regions', this.resource[1]);
    this.title = this.resource[1].name ?? '';
  }

  // *** BUTTON actions *******

  emitModify() {
    this.modify.emit();
  }

  emitAddNote() {
    this.addNote.emit();
  }

  emitDelete() {
    this.delete.emit();
  }

  emitActive(activate: boolean) {
    if (activate) {
      this.activated.emit();
    } else {
      this.deactivated.emit();
    }
  }

  emitPoints() {
    this.points.emit();
  }

  emitNotes() {
    this.notes.emit();
  }

  emitInfo() {
    this.info.emit();
  }

  emitRelated() {
    this.related.emit(this.resource[1].group);
  }

  handleClose() {
    this.closed.emit();
  }
}

/*********** ResourceSet Popover ***************
title: string -  title text,
resource: resource data
type: string - resource type
id: string - resource id
*************************************************/
@Component({
  selector: 'resourceset-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PipesModule,
    PopoverComponent
  ],
  template: `
    <ap-popover [title]="title" [canClose]="canClose" (closed)="handleClose()">
      @for(p of properties; track p) { @if(p[0] === 'Description') {
      <div style="font-weight:bold;">{{ p[0] }}:</div>
      <div style="flex: 1 1 auto;overflow-x:auto;height:60px;">
        {{ p[1] }}
      </div>
      } @else {
      <div style="display:flex;">
        <div style="font-weight:bold;">{{ p[0] }}:</div>
        <div
          style="flex: 1 1 auto;text-align:right;white-space:nowrap;
            overflow-x:auto;text-overflow:ellipsis;"
        >
          {{ p[1] }}
        </div>
      </div>
      } }
      <div style="display:flex;flex-wrap: wrap;">
        <div class="popover-action-button">
          <button
            mat-button
            (click)="emitInfo()"
            matTooltip="Show Properties"
            matTooltipPosition="after"
          >
            <mat-icon>info_outline</mat-icon>
            INFO
          </button>
        </div>
      </div>
    </ap-popover>
  `,
  styleUrls: [`./popover.component.scss`]
})
export class ResourceSetPopoverComponent {
  @Input() title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() resource: any;
  @Input() canClose: boolean;
  @Output() info: EventEmitter<string> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();

  properties: Array<unknown>; // ** resource properties

  constructor(public app: AppFacade) {}

  ngOnChanges() {
    this.parse();
  }

  parse() {
    this.properties = [];
    this.properties.push(['Name', this.resource.properties.name ?? '']);
    this.properties.push([
      'Description',
      this.resource.properties.description ?? ''
    ]);
  }

  // *** BUTTON actions *******
  emitInfo() {
    this.info.emit();
  }

  handleClose() {
    this.closed.emit();
  }
}
