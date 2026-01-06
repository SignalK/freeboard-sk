import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';

import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { FBWaypoints, FBWaypoint, FBResourceSelect } from 'src/app/types';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { ResourceListBase } from '../resource-list-baseclass';
import { SKResourceGroupService } from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';

@Component({
  selector: 'waypoint-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './waypointlist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    MatInputModule,
    ScrollingModule,
    MatProgressBarModule
  ]
})
export class WaypointListComponent extends ResourceListBase {
  @Input() activeWaypoint: string;
  @Input() editingWaypointId: string;
  @Output() goto: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() deactivate: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() center: EventEmitter<Position> = new EventEmitter();
  @Output() notes: EventEmitter<{ id: string; readOnly: boolean }> =
    new EventEmitter();

  protected override fullList: FBWaypoints = [];
  protected override filteredList = signal<FBWaypoints>([]);
  protected disableRefresh = false;

  constructor(
    public app: AppFacade,
    protected override skres: SKResourceService,
    private worker: SKWorkerService,
    protected dialog: MatDialog,
    protected skgroups: SKResourceGroupService
  ) {
    super('waypoints', skres);
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.waypoints')) {
        this.initItems(true);
      }
    });
  }

  ngOnInit() {
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
    if (
      this.editingWaypointId &&
      this.editingWaypointId.indexOf('waypoint') !== -1
    ) {
      this.disableRefresh = true;
    } else {
      this.disableRefresh = false;
    }
  }

  /**
   * @description Close waypoint list
   */
  protected close() {
    this.closed.emit();
  }

  /**
   * @description Initialise the waypoint list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBWaypoint>(
        this.collection as SKResourceType
      );
      this.app.sIsFetching.set(false);
      this.doFilter();
      this.skres.selectionClean(
        this.collection,
        this.fullList.map((i) => i[0])
      );
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      this.fullList = [];
    }
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected override toggleAll(checked: boolean) {
    super.toggleAll(checked);
    if (checked) {
      this.skres.waypointAddFromServer();
    } else {
      this.skres.waypointRemove();
    }
  }

  /**
   * @description Handle waypoint entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Waypoint identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update cache
    if (idx !== -1) {
      if (checked) {
        this.skres.waypointAdd([this.filteredList()[idx]]);
      } else {
        this.skres.waypointRemove([this.filteredList()[idx][0]]);
      }
    }
  }

  /**
   * @description Show waypoint properties
   * @param id waypoint identifier
   */
  protected itemProperties(id: string) {
    this.skres.editWaypointInfo(id);
  }

  /**
   * @description Center the map at the supplied position
   * @param position Position at which to center the map
   */
  protected emitCenter(position: Position) {
    this.center.emit(position);
  }

  /**
   * @description Show delete waypoint dialog
   * @param id waypoint identifier
   */
  protected itemDelete(id: string) {
    this.skres.deleteWaypoint(id);
  }

  /**
   * @description Navigate to waypoint
   * @param id waypoint identifier
   */
  protected itemGoTo(id: string) {
    this.itemSelect(true, id); // ensure active resource is selected
    this.goto.emit({ id: id });
  }

  /**
   * @description Clear waypoint as destination
   */
  protected itemClearActive() {
    this.deactivate.emit({ id: null });
  }

  /**
   * @description Show related Notes dialog
   * @param wpt waypoint object
   */
  protected itemViewNotes(wpt: FBWaypoint) {
    this.notes.emit({
      id: wpt[0],
      readOnly: wpt[1].feature?.properties?.readOnly ?? false
    });
  }

  /**
   * @description Show select Group dialog
   * @param id waypoint identifier
   */
  protected async itemAddToGroup(id: string) {
    try {
      const groups = await this.skgroups.listFromServer();
      const glist = groups.map((g) => {
        return { id: g[0], name: g[1].name };
      });
      this.dialog
        .open(SingleSelectListDialog, {
          data: {
            title: 'Select Group',
            icon: { name: 'category' },
            items: glist
          }
        })
        .afterClosed()
        .subscribe(async (selGrp) => {
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'waypoint', id);
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
