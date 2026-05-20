import {
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

import { RemarkModule } from 'ngx-remark';

import { AppFacade } from 'src/app/app.facade';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKRegion } from '../../resource-classes';
import { Position } from 'geojson';
import { SKResourceService } from '../../resources.service';
import { FBNotes } from 'src/app/types';
import {
  FBResourceGroups,
  SKResourceGroupService
} from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'region-panel',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDivider,
    MatListModule,
    MatExpansionModule,
    RemarkModule
  ],
  templateUrl: `region-panel.html`,
  styleUrls: []
})
export class RegionPanel {
  region = input<SKRegion>(new SKRegion());
  id = input<string>(undefined);
  related = input<string>(undefined);

  protected _region = linkedSignal(() => this.region());
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
  protected skgroups = inject(SKResourceGroupService);
  private dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      this.region();
      this.init(this.region());
    });

    effect(() => {
      if (this.related().includes('groups')) {
        this.getRelatedGroups();
      } else if (this.related().includes('notes')) {
        this.getRelatedNotes();
      }
    });
  }

  protected init(n: SKRegion) {
    if (!n) {
      return;
    }
    n.description = n.description ?? '';
    this._region.set(n);
    this.icon = getResourceIcon('regions', this._region());
    this.getRelatedNotes();
    this.getRelatedGroups();
  }

  protected async getRelatedNotes() {
    const n = await this.skres.getRelatedNotes('regions', this.id());
    this.notes.set(n);
  }

  protected async getRelatedGroups() {
    const g = await this.skgroups.with('regions', this.id());
    this.groups.set(g);
  }

  protected onEdit() {
    this.edit.emit(this.id());
  }

  protected onDelete() {
    this.skres.deleteRegion(this.id());
  }

  protected onPanTo() {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;

    let position: any;
    const coords = this._region().feature.geometry.coordinates;
    if (Array.isArray(coords) && coords.length) {
      position =
        this._region().feature.geometry.type === 'MultiPolygon'
          ? coords[0][0][0]
          : coords[0][0];
    }
    this.panTo.emit({
      center: position,
      zoomLevel: zoomTo
    });
  }

  protected showNote(id: string) {
    this.skres.showNoteDetails(id);
  }

  /**
   * @description Show select Group dialog
   * @param id region identifier
   */
  protected async addToGroup() {
    try {
      const groups = await this.skgroups.listFromServer();
      const glist = groups.map((g) => {
        return { id: g[0], name: g[1].name };
      });
      if (glist.length) {
        this.app
          .showConfirm(
            'There are currently no groups defined.\nYou will need to first create a group and then add the resource.\n\nDo you want to create a new group?',
            'Group'
          )
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
        .subscribe(async (selGrp) => {
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'region', this.id());
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
