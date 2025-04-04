import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal
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
import { SKResources } from 'src/app/modules/skresources';
import { SKTrack } from 'src/app/modules/skresources/resource-classes';
import { SignalKClient } from 'signalk-client-angular';
import { Position, UpdateMessage } from 'src/app/types';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SKStreamFacade } from 'src/app/modules';

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
export class TrackListComponent {
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() center: EventEmitter<Position> = new EventEmitter();

  protected trackList: Array<[string, SKTrack, boolean]> = [];
  protected filterText = '';
  protected someSel = false;
  protected allSel = false;
  protected filteredList = signal([]);
  private obsList: Array<Subscription> = [];

  constructor(
    protected app: AppFacade,
    private signalk: SignalKClient,
    private skres: SKResources,
    private stream: SKStreamFacade
  ) {
    this.obsList.push(
      this.stream
        .delta$()
        .subscribe((msg: UpdateMessage) => this.onDeltaMessage(msg))
    );
  }

  ngOnDestroy() {
    this.obsList.forEach((i) => i.unsubscribe());
  }

  ngAfterViewInit() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  // resource delta event handler
  private onDeltaMessage(msg: UpdateMessage) {
    if (msg.result?.self?.resourceUpdates.length !== 0) {
      const trkDelta = msg.result?.self?.resourceUpdates.find((i) =>
        i.path.includes('resources.tracks')
      );
      if (trkDelta) {
        this.initItems(true);
      }
    }
  }

  // fetch resources from server and align selections
  initItems(silent?: boolean) {
    this.app.sIsFetching.set(!(silent ?? false));
    this.signalk.api.get(this.app.skApiVersion, '/resources/tracks').subscribe(
      (trks) => {
        this.trackList = Object.entries(trks).map((trk: [string, SKTrack]) => {
          trk[1]['feature']['id'] = trk[0].toString();
          delete trk[1]['$source'];
          delete trk[1]['timestamp'];
          return [
            trk[0],
            trk[1],
            this.skres.trackCacheIsUnfiltered() ||
              this.app.config.selections.tracks?.includes(trk[0])
          ];
        });
        this.app.sIsFetching.set(false);
        this.doFilter();
      },
      () => {
        this.app.sIsFetching.set(false);
        this.trackList = [];
      }
    );
  }

  alignSelections() {
    let c = false;
    let u = false;
    this.filteredList().forEach((trk: [string, SKTrack, boolean]) => {
      c = trk[2] ? true : c;
      u = !trk[2] ? true : u;
    });
    this.allSel = c && !u ? true : false;
    this.someSel = c && u ? true : false;
  }

  toggleAll(checked: boolean) {
    this.filteredList.update((fl: [string, SKTrack, boolean]) => {
      fl.forEach((item) => (item[2] = checked));
      return fl;
    });
    const allItems = this.filteredList().length === this.trackList.length;
    if (checked) {
      if (allItems) {
        this.skres.trackCacheUnfilter(true);
      } else {
        const tracks = this.filteredList().map((item) => item[1]);
        this.skres.trackCacheAdd(tracks);
      }
    } else {
      if (allItems) {
        this.skres.trackCacheUnfilter(false);
        this.skres.trackCacheClear();
      } else {
        const ids = this.filteredList().map((item) => item[0]);
        this.skres.trackCacheRemove(ids);
      }
    }
    this.someSel = false;
    this.allSel = checked ? true : false;
  }

  itemSelect(checked: boolean, id: string) {
    let idx: number;
    this.filteredList.update((fl) => {
      idx = fl.findIndex((item) => item[0] === id);
      if (idx !== -1) {
        fl[idx][2] = checked;
      }
      return fl;
    });
    this.alignSelections();

    if (idx !== -1) {
      if (checked) {
        this.skres.trackCacheAdd(this.filteredList()[idx][1]);
      } else {
        if (!this.allSel && this.skres.trackCacheIsUnfiltered()) {
          // unfilter and preset
          const selIds = this.filteredList()
            .filter((i) => i[2] === true)
            .map((i) => i[0]);
          this.skres.trackCacheUnfilter(false, selIds);
        } else {
          this.skres.trackCacheRemove(id);
        }
      }
    }
  }

  itemProperties(id: string) {
    const track = this.trackList.find(
      (trk: [string, SKTrack, boolean]) => trk[1].feature?.id === id
    );
    if (track) {
      this.skres.showTrackInfo(track[1]);
    }
  }

  itemDelete(id: string) {
    this.app
      .showConfirm(
        'Do you want to delete this Track?\n',
        'Delete Track:',
        'YES',
        'NO'
      )
      .subscribe((result: { ok: boolean; checked: boolean }) => {
        if (result?.ok) {
          this.skres
            .deleteFromServer('tracks', id)
            .then(() => {
              this.skres.trackCacheRemove(id);
              // refresh cache
            })
            .catch((err: HttpErrorResponse) =>
              this.app.parseHttpErrorResponse(err)
            );
        }
      });
  }

  itemRefresh() {
    this.initItems();
  }

  emitCenter(position: Position) {
    this.center.emit(position);
  }

  filterKeyUp(value: string) {
    this.filterText = value ?? '';
    this.doFilter();
  }

  // filter & sort list entries
  doFilter() {
    const sortList = () => {
      fl.sort((a, b) => {
        const x = a[1].feature?.properties?.name?.toLowerCase();
        const y = b[1].feature?.properties?.name?.toLowerCase();
        return x > y ? 1 : -1;
      });
    };
    let fl: Array<[string, SKTrack, boolean]>;
    if (this.filterText.length === 0) {
      fl = [].concat(this.trackList);
    } else {
      fl = this.trackList.filter((item: [string, SKTrack, boolean]) => {
        return item[1].feature.properties?.name
          ?.toLowerCase()
          .includes(this.filterText?.toLowerCase());
      });
    }
    sortList();
    this.filteredList.update(() => [].concat(fl));
    this.alignSelections();
  }
}
