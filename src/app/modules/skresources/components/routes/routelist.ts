import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  inject,
  output,
  input,
  DestroyRef
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
import {
  FBRoute,
  FBResourceSelect,
  FBRoutes
} from 'src/app/types/resources/freeboard';
import { ResourceListBase } from '../resource-list-baseclass';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { SKResourceGroupService } from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';
import { RemarkModule } from 'ngx-remark';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    MatProgressBarModule,
    RemarkModule
  ]
})
export class RouteListComponent extends ResourceListBase {
  activeRoute = input<string>();
  editingRouteId = input<string>();
  select = output<FBResourceSelect>();
  delete = output<FBResourceSelect>();
  activate = output<FBResourceSelect>();
  deactivate = output<FBResourceSelect>();
  refresh = output<void>();
  points = output<FBResourceSelect>();
  notes = output<{ id: string; readOnly: boolean }>();
  closed = output<void>();

  protected override fullList: FBRoutes = [];
  protected override filteredList = signal<FBRoutes>([]);
  /** Disable list/visibility actions while a route is being edited. Reactive
   *  (computed from the editingRouteId signal input) so it re-enables the moment
   *  editing ends — ngOnChanges does not fire for signal-input changes. */
  disableRefresh = computed(
    () => this.editingRouteId()?.startsWith('route.') ?? false
  );

  protected app = inject(AppFacade);
  private worker = inject(SKWorkerService);
  private dialog = inject(MatDialog);
  private skgroups = inject(SKResourceGroupService);
  private destroyRef = inject(DestroyRef);

  constructor(protected override skres: SKResourceService) {
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
  protected override toggleAll(checked: boolean) {
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
    this.select.emit({ id: id });
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
        .pipe(takeUntilDestroyed(this.destroyRef))
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

  /** Format distance value
   * @param valaue Distance in meters
   */
  protected formatDistance(value: number) {
    return `(${this.app.formatValueForDisplay(value, 'm', { precision: 2 })})`;
  }
}
