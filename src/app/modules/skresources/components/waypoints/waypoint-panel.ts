import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal
} from '@angular/core';
import { CoordsPipe } from 'src/app/lib/pipes';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';

import { RemarkModule } from 'ngx-remark';

import { AppFacade } from 'src/app/app.facade';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKWaypoint } from '../../resource-classes';
import { Position } from 'geojson';
import { SKResourceService } from '../../resources.service';
import { FBNotes } from 'src/app/types';
import {
  FBResourceGroups,
  SKResourceGroupService
} from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';
import { CourseService } from 'src/app/modules/course';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'waypoint-panel',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDivider,
    MatListModule,
    MatExpansionModule,
    CoordsPipe,
    RemarkModule
  ],
  templateUrl: `waypoint-panel.html`,
  styleUrls: []
})
export class WaypointPanel {
  waypoint = input<SKWaypoint>(new SKWaypoint());
  id = input<string>(undefined);
  related = input<string>(undefined);
  interacting = input<boolean>(false);

  protected _waypoint = linkedSignal(() => this.waypoint());
  protected notes = signal<FBNotes>([]);
  protected groups = signal<FBResourceGroups>([]);

  edit = output<string>();
  panTo = output<{
    center: Position;
    zoomLevel: number;
  }>();

  protected icon: AppIconDef;
  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);
  private course = inject(CourseService);
  protected skgroups = inject(SKResourceGroupService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.waypoint();
      this.init(this.waypoint());
    });

    effect(() => {
      if (this.related()?.includes('groups')) {
        this.getRelatedGroups();
      } else if (this.related()?.includes('notes')) {
        this.getRelatedNotes();
      }
    });
  }

  protected init(n: SKWaypoint) {
    if (!n) {
      return;
    }
    n.description = n.description ?? '';
    this._waypoint.set(n);
    this.icon = getResourceIcon('waypoints', this._waypoint());
    this.getRelatedNotes();
    this.getRelatedGroups();
  }

  protected async getRelatedNotes() {
    const n = await this.skres.getRelatedNotes('waypoints', this.id());
    this.notes.set(n);
  }

  protected async getRelatedGroups() {
    const g = await this.skgroups.with('waypoints', this.id());
    this.groups.set(g);
  }

  protected onEdit() {
    this.edit.emit(this.id());
  }

  protected onGoto(clear?: boolean) {
    if (clear) {
      this.course.clearCourse();
    } else {
      this.course.setDestination(`/resources/waypoints/${this.id()}`);
    }
  }

  protected onDelete() {
    this.skres.deleteWaypoint(this.id());
  }

  protected onPanTo() {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;

    this.panTo.emit({
      center: this._waypoint().feature.geometry.coordinates,
      zoomLevel: zoomTo
    });
  }

  protected showNote(id: string) {
    this.skres.showNoteDetails(id);
  }

  protected addNote() {
    this.skres.showNoteEditor({
      type: 'waypoint',
      href: { id: this.id(), exists: true }
    });
  }

  /**
   * @description Show select Group dialog
   * @param id waypoint identifier
   */
  protected async addToGroup() {
    try {
      const groups = await this.skgroups.listFromServer();
      const glist = groups.map((g) => {
        return { id: g[0], name: g[1].name };
      });
      if (!glist.length) {
        this.app
          .showConfirm(
            'There are currently no groups defined.\nYou will need to first create a group and then add the resource.\n\nDo you want to create a new group?',
            'Group'
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((r) => {
            if (r) {
              this.skgroups.editGroupInfo();
            }
          });
        return;
      }
      this.dialog
        .open(SingleSelectListDialog, {
          data: {
            title: 'Select Group',
            icon: { name: 'category', class: 'icon-accent' },
            items: glist
          }
        })
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(async (selGrp) => {
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'waypoint', this.id());
              this.app.showMessage(`Waypoint added to group.`);
            } catch (err) {
              this.app.parseHttpErrorResponse(err);
            }
          }
        });
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }
}
