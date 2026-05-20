import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  output,
  effect,
  input
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoordsPipe } from 'src/app/lib/pipes';
import { PopoverComponent } from './popover.component';

import { AppFacade } from 'src/app/app.facade';
import { RemarkModule } from 'ngx-remark';
import { SKRoute, SKWaypoint, SKNote, SKRegion } from 'src/app/modules';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';

interface PopoverCtrl {
  showInfoButton: boolean;
  showModifyButton: boolean;
  showDeleteButton: boolean;
  showAddNoteButton: boolean;
  showRelatedButton: boolean;
  showPointsButton: boolean;
  showNotesButton: boolean;
  canActivate: boolean;
  isActive: boolean;
  activeText: string;
  isReadOnly: boolean;
}

@Component({
  selector: 'resource-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CoordsPipe,
    PopoverComponent,
    CoordsPipe,
    RemarkModule
  ],
  template: `
    <ap-popover
      [title]="title"
      [icon]="icon"
      [canClose]="canClose"
      (closed)="handleClose()"
    >
      @if (hasMarkdown()) {
        <remark
          style="flex: 1 1 auto;text-align:left;font-style: italic; overflow: hidden;
                                  display: -webkit-box;
                                  -webkit-box-orient: vertical;
                                  -webkit-line-clamp: 2;
                                  line-clamp: 2;
                                  text-overflow:ellipsis;"
          [markdown]="resource[1].description ?? ''"
        >
          <ng-template remarkTemplate="heading" let-node>
            <h1 [remarkNode]="node" style="font-size:10pt;"></h1>
          </ng-template>
        </remark>
      } @else {
        <div
          style="flex: 1 1 auto;text-align:left;font-style: italic; overflow: hidden;
                                  display: -webkit-box;
                                  -webkit-box-orient: vertical;
                                  -webkit-line-clamp: 2;
                                  line-clamp: 2;
                                  text-overflow:ellipsis;"
          [innerHTML]="resource[1].description ?? ''"
        ></div>
      }
      @for (p of properties; track p) {
        <div style="display:flex;">
          <div style="font-weight:bold;">{{ p[0] }}:</div>
          @if (p[0] !== 'Latitude' && p[0] !== 'Longitude') {
            <div
              style="flex: 1 1 auto;text-align:right;
                                  white-space:nowrap;
                                  overflow-x:hidden;
                                  text-overflow:ellipsis;"
            >
              {{ p[1] }}
            </div>
          }
          @if (p[0] === 'Latitude') {
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="
                p[1] | coords: app.config.units.positionFormat : true
              "
            ></div>
          }
          @if (p[0] === 'Longitude') {
            <div
              style="flex: 1 1 auto;text-align:right;"
              [innerText]="p[1] | coords: app.config.units.positionFormat"
            ></div>
          }
        </div>
      }

      <div style="display:flex;flex-wrap: wrap;">
        @if (ctrl.showModifyButton) {
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
        }
        @if (ctrl.showAddNoteButton) {
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
        }
        @if (ctrl.showDeleteButton) {
          <div class="popover-action-button">
            <button
              mat-button
              [disabled]="ctrl.isReadOnly || ctrl.isActive"
              (click)="emitDelete()"
              matTooltip="Delete"
              matTooltipPosition="after"
            >
              <mat-icon>delete</mat-icon>
              DELETE
            </button>
          </div>
        }
        @if (ctrl.canActivate && !ctrl.isActive) {
          <div class="popover-action-button">
            <button
              mat-button
              (click)="emitActive(true)"
              [matTooltip]="
                type === 'waypoint'
                  ? 'Navigate to Waypoint'
                  : 'Navigate to first point'
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
        }
        @if (ctrl.showPointsButton) {
          <div class="popover-action-button">
            <button
              mat-button
              (click)="emitPoints()"
              matTooltip="Route Points"
              matTooltipPosition="after"
            >
              <mat-icon>location_on</mat-icon>
              POINTS
            </button>
          </div>
        }
        @if (ctrl.showRelatedButton) {
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
        }
        @if (ctrl.showNotesButton) {
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
        }
        @if (ctrl.showInfoButton) {
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
        }
      </div>
    </ap-popover>
  `,
  styleUrls: [`./popover.component.scss`]
})
export class ResourcePopoverComponent {
  @Input() title: string; // popover title text
  @Input() type: string; // resource type
  @Input() resource: SKRoute | SKWaypoint | SKNote | SKRegion;
  @Input() active: boolean;
  @Input() featureCount = 0;
  @Input() units = 'm';
  @Input() canClose: boolean;
  modify = output<void>();
  delete = output<void>();
  addNote = output<void>();
  activated = output<void>();
  deactivated = output<void>();
  related = output<void>();
  info = output<void>();
  closed = output<void>();
  points = output<void>();
  notes = output<void>();

  properties: Array<unknown>; // ** resource properties
  ctrl: PopoverCtrl = {
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
  protected hasMarkdown = signal<boolean>(false);
  protected icon: AppIconDef;
  protected app = inject(AppFacade);

  constructor() {}

  ngOnChanges() {
    this.parse();
    this.ctrl.showModifyButton =
      this.type !== 'destination' && this.featureCount > 0 ? true : false;
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
    this.hasMarkdown.set(true);
  }

  parseWaypoint() {
    this.ctrl.isReadOnly = this.resource[1].feature.properties?.readOnly;
    this.ctrl.isActive =
      this.active && this.active === this.resource[0] ? true : false;
    this.ctrl.activeText = 'GO TO';
    this.ctrl.canActivate = true;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton = !this.ctrl.isReadOnly;
    this.ctrl.showDeleteButton = this.app.useInfoPanel()
      ? false
      : !this.ctrl.isReadOnly;
    this.ctrl.showNotesButton = this.app.useInfoPanel() ? false : true;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showPointsButton = false;
    this.ctrl.showRelatedButton = false;

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
    this.hasMarkdown.set(true);
  }

  parseRoute() {
    this.ctrl.isReadOnly = this.resource[1].feature.properties?.readOnly;
    this.ctrl.isActive =
      this.active && this.active === this.resource[0] ? true : false;
    this.ctrl.activeText = 'START';
    this.ctrl.canActivate = true;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton = !this.ctrl.isReadOnly;
    this.ctrl.showPointsButton = this.app.useInfoPanel() ? false : true;
    this.ctrl.showNotesButton = this.app.useInfoPanel() ? false : true;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showRelatedButton = false;
    this.ctrl.showDeleteButton = this.app.useInfoPanel()
      ? false
      : !this.ctrl.isReadOnly;

    this.icon = getResourceIcon('routes', this.resource[1]);
    this.title = this.resource[1].name ?? '';
    this.properties = [];
    const d = this.app.formatValueForDisplay(this.resource[1].distance, 'm');
    this.properties.push(['Distance', d]);
    this.hasMarkdown.set(true);
  }

  parseNote() {
    this.ctrl.isReadOnly = this.resource[1].properties?.readOnly;
    this.ctrl.isActive = false;
    this.ctrl.activeText = '';
    this.ctrl.canActivate = false;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton = !this.ctrl.isReadOnly;
    this.ctrl.showDeleteButton = this.app.useInfoPanel()
      ? false
      : !this.ctrl.isReadOnly;
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
    this.hasMarkdown.update(() =>
      this.resource[1].mimeType?.includes('markdown')
    );
  }

  parseRegion() {
    this.ctrl.isReadOnly = this.resource[1].feature.properties?.readOnly;
    this.ctrl.isActive = false;
    this.ctrl.activeText = '';
    this.ctrl.canActivate = false;
    this.ctrl.showInfoButton = true;
    this.ctrl.showModifyButton =
      this.resource[1].feature.geometry.type === 'MultiPolygon'
        ? false
        : !this.ctrl.isReadOnly;
    this.ctrl.showDeleteButton = this.app.useInfoPanel()
      ? false
      : !this.ctrl.isReadOnly;
    this.ctrl.showAddNoteButton = false;
    this.ctrl.showNotesButton = this.app.useInfoPanel() ? false : true;
    this.ctrl.showPointsButton = false;
    this.ctrl.showRelatedButton = false;

    this.properties = [];
    this.icon = getResourceIcon('regions', this.resource[1]);
    this.title = this.resource[1].name ?? '';
    this.hasMarkdown.set(true);
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
  imports: [MatButtonModule, MatTooltipModule, MatIconModule, PopoverComponent],
  template: `
    <ap-popover
      [title]="title()"
      [canClose]="canClose"
      (closed)="handleClose()"
    >
      @for (p of properties; track p) {
        @if (p[0] === 'Description') {
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
        }
      }
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
  title = input<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource = input<any>();
  canClose = input<boolean>();
  info = output<void>();
  closed = output<void>();

  protected properties: Array<unknown>; // ** resource properties
  protected app = inject(AppFacade);

  constructor() {
    effect(() => {
      this.title();
      this.resource();
      this.canClose();
      this.parse();
    });
  }

  ngOnChanges() {
    this.parse();
  }

  parse() {
    this.properties = [];
    this.properties.push(['Name', this.resource().properties.name ?? '']);
    this.properties.push([
      'Description',
      this.resource().properties.description ?? ''
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
