import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  effect
} from '@angular/core';

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
import { Convert } from 'src/app/lib/convert';
import {
  FBRoute,
  FBResourceSelect,
  FBRoutes
} from 'src/app/types/resources/freeboard';
import { ResourceListBase } from '../resource-list-baseclass';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { SKResourceGroupService } from '../groups/groups.service';
import {
  MultiSelectListDialog,
  SingleSelectListDialog
} from 'src/app/lib/components';

@Component({
  selector: 'route-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routelist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
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
export class RouteListComponent extends ResourceListBase {
  @Input() activeRoute: string;
  @Input() editingRouteId: string;
  @Output() select: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() delete: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() activate: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() deactivate: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() refresh: EventEmitter<void> = new EventEmitter();
  @Output() properties: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() points: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() notes: EventEmitter<{ id: string; readOnly: boolean }> =
    new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();

  protected fullList: FBRoutes = [];
  protected filteredList = signal<FBRoutes>([]);
  disableRefresh = false;

  constructor(
    public app: AppFacade,
    protected skres: SKResourceService,
    private worker: SKWorkerService,
    protected dialog: MatDialog,
    protected skgroups: SKResourceGroupService
  ) {
    super('routes', skres);
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.routes')) {
        this.initItems(true);
      }
    });
  }

  ngOnInit() {
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
    this.disableRefresh =
      this.editingRouteId && this.editingRouteId.indexOf('route') !== -1;
  }

  /**
   * @description Close route list
   */
  protected close() {
    this.closed.emit();
  }

  /** @description Initialise the route list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBRoute>(
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
  protected toggleAll(checked: boolean) {
    super.toggleAll(checked);
    if (checked) {
      this.skres.routeAddFromServer();
    } else {
      this.skres.routeRemove();
    }
  }

  /**
   * @description Handle route entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Route identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update cache
    if (idx !== -1) {
      if (checked) {
        this.skres.routeAdd([this.filteredList()[idx]]);
      } else {
        this.skres.routeRemove([this.filteredList()[idx][0]]);
      }
    }
  }

  /**
   * @description Show route properties
   * @param id route identifier
   */
  protected itemProperties(id: string) {
    this.skres.editRouteInfo(id);
  }

  /**
   * @description Display route points modal
   * @param id route identifier
   */
  itemViewPoints(id: string) {
    this.points.emit({ id: id });
  }

  /**
   * @description Show delete route dialog
   * @param id route identifier
   */
  protected itemDelete(id: string) {
    this.skres.deleteRoute(id);
  }

  /**
   * @description Activate route as destination
   * @param id route identifier
   */
  protected itemSetActive(id: string) {
    this.itemSelect(true, id); // ensure active resource is selected
    this.activate.emit({ id: id });
  }

  /**
   * @description Clear route as active destination
   * @param id route identifier
   */
  protected itemClearActive(id: string) {
    this.deactivate.emit({ id: id });
  }

  /**
   * @description Show related Notes dialog
   * @param rte route object
   */
  protected itemViewNotes(rte: FBRoute) {
    this.notes.emit({
      id: rte[0],
      readOnly: rte[1].feature?.properties?.readOnly ?? false
    });
  }

  /**
   * @description Show select Group dialog
   * @param id route identifier
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
              await this.skgroups.addToGroup(selGrp.id, 'route', id);
              this.app.showMessage(`Route added to group.`);
            } catch (err) {
              this.app.parseHttpErrorResponse(err);
            }
          }
        });
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }

  /** Convert km to nautical miles
   * @param v Distsnce in km
   */
  protected km2Nm(value: number) {
    return Convert.kmToNauticalMiles(value);
  }
}
