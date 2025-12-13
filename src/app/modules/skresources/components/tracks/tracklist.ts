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

import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKResourceType } from 'src/app/modules/skresources';
import { SignalKClient } from 'signalk-client-angular';
import { FBTrack, FBTracks, Position } from 'src/app/types';
import { SKWorkerService } from 'src/app/modules';
import { ResourceListBase } from '../resource-list-baseclass';

@Component({
  selector: 'track-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tracklist.html',
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
export class TrackListComponent extends ResourceListBase {
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() center: EventEmitter<Position> = new EventEmitter();

  protected override fullList: FBTracks = [];
  protected override filteredList = signal<FBTracks>([]);

  constructor(
    protected app: AppFacade,
    protected override skres: SKResourceService,
    private worker: SKWorkerService
  ) {
    super('tracks', skres);
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.tracks')) {
        this.initItems(true);
      }
    });
  }

  ngOnInit() {
    this.initItems();
  }

  /**
   * @description Close track list
   */
  protected close() {
    this.closed.emit();
  }

  /** @description Initialise the track list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBTrack>(
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
      this.skres.trackAddFromServer();
    } else {
      this.skres.trackRemove();
    }
  }

  /**
   * @description Handle track entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Track identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update cache
    if (idx !== -1) {
      if (checked) {
        this.skres.trackAdd([this.filteredList()[idx]]);
      } else {
        this.skres.trackRemove([this.filteredList()[idx][0]]);
      }
    }
  }

  /**
   * @description Show track properties
   * @param id track identifier
   */
  protected itemProperties(id: string) {
    this.skres.editTrackInfo(id);
  }

  /**
   * @description Show delete track dialog
   * @param id track identifier
   */
  protected itemDelete(id: string) {
    this.skres.deleteTrack(id);
  }

  /**
   * @description Center the map at the supplied position
   * @param position Position at which to center the map
   */
  protected emitCenter(position: Position) {
    this.center.emit(position);
  }
}
