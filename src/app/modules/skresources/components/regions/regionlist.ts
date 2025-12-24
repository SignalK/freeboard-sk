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

import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { FBRegions, FBRegion, FBResourceSelect } from 'src/app/types';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { ResourceListBase } from '../resource-list-baseclass';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { MatDialog } from '@angular/material/dialog';
import { SKRegion } from '../../resource-classes';
import { SKResourceGroupService } from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';

@Component({
  selector: 'region-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regionlist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    MatInputModule,
    ScrollingModule
  ]
})
export class RegionListComponent extends ResourceListBase {
  @Input() regions: FBRegions;
  @Output() select: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() refresh: EventEmitter<void> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() pan: EventEmitter<{ center: Position; zoomLevel: number }> =
    new EventEmitter();

  protected override fullList: FBRegions = [];
  protected override filteredList = signal<FBRegions>([]);

  filterList = [];

  constructor(
    public app: AppFacade,
    protected override skres: SKResourceService,
    private worker: SKWorkerService,
    private dialog: MatDialog,
    protected skgroups: SKResourceGroupService
  ) {
    super('regions', skres);
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.regions')) {
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

  close() {
    this.closed.emit();
  }

  /**
   * @description Initialise the region list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBRegion>(
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
   * @description Center the region on the screen.
   * @param region SKRegion object that will be centered on the screen.
   */
  protected emitCenter(region: SKRegion) {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;

    let position: any;
    const coords = region.feature.geometry.coordinates;
    if (Array.isArray(coords) && coords.length) {
      position =
        region.feature.geometry.type === 'MultiPolygon'
          ? coords[0][0][0]
          : coords[0][0];
    }
    this.pan.emit({
      center: position,
      zoomLevel: zoomTo
    });
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected override toggleAll(checked: boolean) {
    super.toggleAll(checked);
    if (checked) {
      this.skres.regionAddFromServer();
    } else {
      this.skres.regionRemove();
    }
  }

  /**
   * @description Handle region entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Region identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update cache
    if (idx !== -1) {
      if (checked) {
        this.skres.regionAdd([this.filteredList()[idx]]);
      } else {
        this.skres.regionRemove([this.filteredList()[idx][0]]);
      }
    }
  }

  /**
   * @description Show region properties
   * @param id Region identifier
   */
  protected itemProperties(id: string) {
    this.skres.editRegionInfo(id);
  }

  /**
   * @description Show select Group dialog
   * @param id region identifier
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
              await this.skgroups.addToGroup(selGrp.id, 'region', id);
              this.app.showMessage(`Region added to group.`);
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
