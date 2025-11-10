import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
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
    MatMenuModule
  ]
})
export class InfoLayerListComponent extends ResourceListBase {
  @Input() focusId: string;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() properties: EventEmitter<string> = new EventEmitter();

  filterList = [];
  override filterText = '';
  override someSel = false;
  override allSel = false;

  protected override fullList: FBInfoLayers = [];

  constructor(
    protected app: AppFacade,
    protected override skres: SKResourceService,
    protected skresOther: FBCustomResourceService,
    private dialog: MatDialog,
    private signalk: SignalKClient
  ) {
    super('infolayers', skres);
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
  protected override toggleAll(checked: boolean) {
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
