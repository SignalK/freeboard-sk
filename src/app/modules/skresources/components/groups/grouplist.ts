import {
  Component,
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
import { MatRadioModule } from '@angular/material/radio';

import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { SignalKClient } from 'signalk-client-angular';

import {
  SKResourceGroupService,
  SKResourceGroup,
  FBResourceGroup,
  FBResourceGroups
} from './groups.service';

@Component({
  selector: 'group-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grouplist.html',
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
    MatRadioModule
  ]
})
export class GroupListComponent {
  @Output() closed: EventEmitter<void> = new EventEmitter();

  protected fullList: FBResourceGroups = [];
  protected filteredList = signal<FBResourceGroups>([]);
  protected filterText = '';
  selectedGroup!: string;

  constructor(
    public app: AppFacade,
    protected skres: SKResourceService,
    protected signalk: SignalKClient,
    private worker: SKWorkerService,
    private skgroups: SKResourceGroupService
  ) {
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.groups')) {
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
      this.app.sIsFetching.set(false);
      this.fullList = await this.skgroups.listFromServer();
      if (this.selectedGroup) {
        const g = this.fullList.find((item) => item[0] === this.selectedGroup);
        g[2] = true;
      }
      this.doFilter();
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
    }
  }

  /**
   * filter & sort resource entries
   */
  protected doFilter() {
    const sortList = () => {
      fl.sort((a, b) => {
        const x = a[1].name?.toLowerCase();
        const y = b[1].name?.toLowerCase();
        return x > y ? 1 : -1;
      });
    };
    let fl: Array<FBResourceGroup>;
    if (this.filterText.length === 0) {
      fl = this.fullList.slice(0);
    } else {
      fl = this.fullList.filter((item) => {
        return item[1].name
          ?.toLowerCase()
          .includes(this.filterText?.toLowerCase());
      });
    }
    sortList();
    this.filteredList.update(() => fl.slice(0));
  }

  /**
   * Handle filter key event
   * @param value Text used to filter the fullList
   */
  protected filterKeyUp(value: string) {
    this.filterText = value ?? '';
    this.doFilter();
  }

  /**
   * @description Handle group entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id group identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    let idx: number;
    let group: SKResourceGroup;

    // fullList update
    this.fullList.forEach((item) => {
      if (item[0] === id) {
        item[2] = true;
        group = item[1];
      } else {
        item[2] = false;
      }
    });

    // filteredList update
    this.filteredList.update((fl) => {
      idx = fl.findIndex((item) => item[0] === id);
      if (idx !== -1) {
        fl[idx][2] = checked;
      }
      fl.forEach((item) => (item[2] = item[0] === id));
      return fl;
    });

    // update selections
    if (idx !== -1 && group) {
      if (checked) {
        this.selectedGroup = id;

        if (Array.isArray(group.routes)) {
          this.app.config.selections.routes = group.routes;
          this.skres.refreshRoutes();
        }

        if (Array.isArray(group.waypoints)) {
          this.app.config.selections.waypoints = group.waypoints;
          this.skres.refreshWaypoints();
        }

        if (Array.isArray(group.regions)) {
          this.app.config.selections.regions = group.regions;
          this.skres.refreshRegions();
        }

        if (Array.isArray(group.charts)) {
          this.app.config.selections.charts = group.charts;
          this.skres.refreshCharts();
        }
      }
      this.app.saveConfig();
    }
  }

  /**
   * @description Show / edit group properties
   * @param id group identifier
   */
  protected itemProperties(id: string) {
    this.skgroups.editGroupinfo(id);
  }

  /**
   * @description Show delete group dialog
   * @param id group identifier
   */
  protected itemDelete(id: string) {
    this.skgroups.deleteGroup(id);
  }
}
