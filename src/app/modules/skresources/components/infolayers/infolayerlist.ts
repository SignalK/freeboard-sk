import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
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
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSliderModule } from '@angular/material/slider';

import { AppFacade } from 'src/app/app.facade';
import {
  FBCustomResourceService,
  InfoLayerPropertiesDialog,
  SKInfoLayer,
  SKResourceService,
  WMSDialog,
  WMTSDialog
} from 'src/app/modules';
import { FBInfoLayer, FBInfoLayers } from 'src/app/types';
import { ResourceListBase } from '../resource-list-baseclass';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SignalKClient } from 'signalk-client-angular';
import { formatDimensionValue } from '../../dimension-utils';

//** InfoLayer Resource List **
@Component({
  selector: 'infolayer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './infolayerlist.html',
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
    MatSelectModule,
    MatProgressBar,
    MatMenuModule,
    MatSliderModule
  ]
})
export class InfoLayerListComponent extends ResourceListBase {
  @Input() focusId: string;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() properties: EventEmitter<string> = new EventEmitter();

  filterList = [];
  filterText = '';
  someSel = false;
  allSel = false;

  protected fullList: FBInfoLayers = [];

  constructor(
    protected app: AppFacade,
    protected skres: SKResourceService,
    protected skresOther: FBCustomResourceService,
    private dialog: MatDialog,
    private signalk: SignalKClient
  ) {
    super('infolayers', skres);
    
    // Watch for changes in the infoLayers signal and sync with fullList
    effect(() => {
      const signalLayers = this.skresOther.infoLayers();
      // Sync fullList with signal data to ensure time dimension updates are reflected
      if (signalLayers.length > 0) {
        signalLayers.forEach((signalLayer: FBInfoLayer) => {
          const fullListLayer = this.fullList.find((l: FBInfoLayer) => l[0] === signalLayer[0]);
          if (fullListLayer && signalLayer[1].values.time) {
            // Update time dimension values if they differ
            if (fullListLayer[1].values.time) {
              fullListLayer[1].values.time.values = signalLayer[1].values.time.values;
              fullListLayer[1].values.time.timeOffset = signalLayer[1].values.time.timeOffset;
            }
          }
        });
      }
    });
  }

  ngOnInit() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  /**
   * @description Initialise the list.
   * @param silent Do not show progress bar when true.
   */
  async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skresOther.customListFromServer<FBInfoLayer>(
        'infolayers',
        'InfoLayer'
      );
      this.app.sIsFetching.set(false);
      this.doFilter();
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
    this.skresOther.refreshInfoLayers();
  }

  /**
   * @description Handle layer entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id layer identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update selections
    if (checked) {
      this.skres.selectionAdd(this.collection, id);
    } else {
      this.skres.selectionRemove(this.collection, id);
    }
    this.skresOther.refreshInfoLayers();
  }

  /**
   * @description Show layer properties
   * @param id layer identifier
   */
  protected itemProperties(id: string) {
    const ov = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ov) {
      this.dialog.open(InfoLayerPropertiesDialog, { data: ov[1] });
    }
  }

  /**
   * @description Delete layer
   * @param id layer identifier
   */
  protected itemDelete(id: string) {
    if (!id) {
      return;
    }
    this.app
      .showConfirm(
        'Do you want to delete this overlay?\n',
        'Delete Overlay:',
        'YES',
        'NO'
      )
      .subscribe(async (result: { ok: boolean }) => {
        if (result && result.ok) {
          try {
            await this.skres.deleteFromServer('infolayers', id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          } finally {
            this.skresOther.refreshInfoLayers();
            this.initItems(true);
          }
        }
      });
  }

  /**
   * @description Set layer refreshInterval property
   * @param id layer identifier
   */
  protected setRefresh(id: string, value: number) {
    const ov = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ov) {
      ov[1].values.refreshInterval = value;
      this.saveLayerToServer(id, ov[1]);
    }
  }

  /**
   * @description Set layer opacity property
   * @param id layer identifier
   */
  protected async setOpacity(id: string, value: number) {
    const ov = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ov) {
      ov[1].values.opacity = value;
      this.saveLayerToServer(id, ov[1]);
    }
  }

  /** Persist on server */
  private async saveLayerToServer(id: string, layer: SKInfoLayer) {
    try {
      await this.skres.putToServer('infolayers', id, layer);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    } finally {
      this.skresOther.refreshInfoLayers();
    }
  }

  protected refreshOptions = new Map([
    [0, 'Never'],
    [60000, '1 min'],
    [60000 * 10, '10 min'],
    [60000 * 30, '30 min'],
    [60000 * 60, '1 hr']
  ]);

  protected opacityOptions = new Map([
    [1, '100%'],
    [0.9, '90%'],
    [0.8, '80%'],
    [0.7, '70%'],
    [0.6, '60%'],
    [0.5, '50%'],
    [0.4, '40%'],
    [0.3, '30%'],
    [0.2, '20%'],
    [0.1, '10%']
  ]);

  /** Calculate the time span in hours between oldest and newest time values */
  protected getTimeSpanHours(timeDim: any): number {
    if (!timeDim || !timeDim.values || timeDim.values.length < 2) {
      return 0;
    }
    const oldest = new Date(timeDim.values[0]).getTime();
    const newest = new Date(timeDim.values[timeDim.values.length - 1]).getTime();
    return Math.round((newest - oldest) / (1000 * 60 * 60)); // Convert ms to hours
  }

  /** Get the current time offset in hours (0 = most recent, negative = hours back) */
  protected getTimeOffset(timeDim: any): number {
    if (!timeDim || !timeDim.values || timeDim.values.length === 0) {
      return 0;
    }
    
    // Return stored offset or default to 0 (most recent)
    return timeDim.timeOffset ?? 0;
  }

  /** Get current time value based on offset */
  protected getCurrentTimeValue(time: any): string {
    if (!time || !time.values || time.values.length === 0) {
      return '';
    }
    
    const offset = this.getTimeOffset(time);
    if (offset === 0) {
      return time.values[time.values.length - 1]; // Most recent
    }
    
    // Find the time value closest to the offset
    const targetTime = new Date(time.values[time.values.length - 1]).getTime() + (offset * 60 * 60 * 1000);
    let closestIndex = time.values.length - 1;
    let closestDiff = Infinity;
    
    for (let i = 0; i < time.values.length; i++) {
      const timeVal = new Date(time.values[i]).getTime();
      const diff = Math.abs(timeVal - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    return time.values[closestIndex];
  }

  /** Check if currently showing the most recent time */
  protected isCurrentTime(time: any): boolean {
    return this.getTimeOffset(time) === 0;
  }

  /** Toggle to most recent time */
  protected onCurrentTimeToggle(id: string, timeDim: any, checked: boolean) {
    if (!timeDim || !timeDim.values || timeDim.values.length === 0) {
      return;
    }
    
    // Get fresh data from signal instead of stale fullList
    const currentLayers = this.skresOther.infoLayers();
    const ov = currentLayers.find((l: FBInfoLayer) => l[0] === id);
    
    if (!ov) {
      // Fallback to fullList if not in signal
      const ovFull = this.fullList.find((l: FBInfoLayer) => l[0] === id);
      if (!ovFull) {
        return;
      }
      
      if (checked) {
        // Set to current time (offset = 0)
        console.log('Toggling to current time (offset = 0) from fullList');
        ovFull[1].values.time.timeOffset = 0;
        this.saveLayerToServer(id, ovFull[1]);
        this.skresOther.updateInfoLayerCache(this.fullList.filter((l: FBInfoLayer) => l[2]));
      }
      return;
    }
    
    if (checked) {
      // Set to current time (offset = 0)
      const newMostRecent = ov[1].values.time.values[ov[1].values.time.values.length - 1];
      console.log('Toggling to current time (offset = 0), new most recent:', newMostRecent);
      ov[1].values.time.timeOffset = 0;
      
      // Also update fullList to keep it in sync
      const ovFull = this.fullList.find((l: FBInfoLayer) => l[0] === id);
      if (ovFull) {
        ovFull[1].values.time.timeOffset = 0;
        ovFull[1].values.time.values = ov[1].values.time.values;
      }
    } else {
      // Unchecking doesn't do anything - user must use slider
      return;
    }
    
    // Save to server and trigger update
    this.saveLayerToServer(id, ov[1]);
    this.skresOther.updateInfoLayerCache(currentLayers);
  }

  /** Format time value for display */
  protected formatTimeValue(timeStr: string): string {
    return formatDimensionValue(timeStr);
  }

  /** Format slider value for display (hours back) */
  protected formatOffsetSliderValue(hours: number): string {
    if (hours === 0) {
      return 'Current';
    }
    return `${hours}h`;
  }

  /** Handle time offset slider change */
  protected onTimeOffsetSliderChange(id: string, offsetHours: number, timeDim: any) {
    console.log('Time offset slider change:', { id, offsetHours, timeDim });
    
    if (!timeDim || !timeDim.values || timeDim.values.length === 0) {
      console.log('Invalid time dimension');
      return;
    }
    
    // Get fresh data from signal instead of stale fullList
    const currentLayers = this.skresOther.infoLayers();
    const ov = currentLayers.find((l: FBInfoLayer) => l[0] === id);
    
    if (!ov) {
      // Fallback to fullList
      const ovFull = this.fullList.find((l: FBInfoLayer) => l[0] === id);
      if (!ovFull) {
        console.log('Layer not found:', id);
        return;
      }
      ovFull[1].values.time.timeOffset = offsetHours;
      console.log('Updating time offset to', offsetHours, 'from fullList');
      this.saveLayerToServer(id, ovFull[1]);
      this.skresOther.updateInfoLayerCache(this.fullList.filter((l: FBInfoLayer) => l[2]));
      return;
    }
    
    // Store the offset
    ov[1].values.time.timeOffset = offsetHours;
    
    // Also update fullList to keep it in sync
    const ovFull = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ovFull) {
      ovFull[1].values.time.timeOffset = offsetHours;
      ovFull[1].values.time.values = ov[1].values.time.values;
    }
    
    console.log('Updating time offset to', offsetHours);
    
    // Save to server
    this.saveLayerToServer(id, ov[1]);
    
    // Trigger update by updating the signal with current selected layers
    console.log('Triggering layer refresh');
    this.skresOther.updateInfoLayerCache(currentLayers);
  }

  /** Add new layer */
  protected addLayer(type: 'wms' | 'wmts') {
    let dref: MatDialogRef<WMTSDialog | WMSDialog>;

    if (type === 'wmts') {
      dref = this.dialog.open(WMTSDialog, {
        disableClose: true,
        data: { format: 'infolayer' }
      });
    }
    if (type === 'wms') {
      dref = this.dialog.open(WMSDialog, {
        disableClose: true,
        data: { format: 'infolayer' }
      });
    }
    if (!dref) {
      this.app.showAlert('Message', `Invalid source type (${type}) provided! `);
      return;
    }
    dref.afterClosed().subscribe((sources) => {
      if (sources && sources.length !== 0) {
        const req = [];
        sources.forEach((cs) => {
          req.push(
            this.signalk.api.post(
              this.app.skApiVersion,
              `/resources/infolayers?provider=resources-provider`,
              cs
            )
          );
        });

        const r = forkJoin(req).pipe(catchError((error) => of(error)));
        r.subscribe((r) => {
          if (r.error) {
            this.app.showAlert(
              'Add Overlay',
              `Error saving overlay source!\n(${r.error.statusCode}: ${r.error.message})`
            );
          } else {
            this.app.showAlert(
              'Add Overlay',
              'Overlay sources added successfully.'
            );
            this.initItems();
          }
        });
      }
    });
  }
}
