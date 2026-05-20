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
import { MatDialog } from '@angular/material/dialog';

import { RemarkModule } from 'ngx-remark';

import { AppFacade } from 'src/app/app.facade';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKRoute } from '../../resource-classes';
import { Position } from 'geojson';
import { SKResourceService } from '../../resources.service';
import { FBNotes } from 'src/app/types';
import {
  FBResourceGroups,
  SKResourceGroupService
} from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';
import { CourseService } from 'src/app/modules/course';
import { GeoUtils } from 'src/app/lib/geoutils';
import { MatStepperModule } from '@angular/material/stepper';
import { Convert } from 'src/app/lib/convert';
import { ActiveResourcePropertiesModal } from '../active-resource-dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

@Component({
  selector: 'route-panel',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDivider,
    MatListModule,
    MatExpansionModule,
    MatStepperModule,
    RemarkModule
  ],
  templateUrl: `route-panel.html`,
  styleUrls: []
})
export class RoutePanel {
  route = input<SKRoute>(new SKRoute());
  id = input<string>(undefined);
  related = input<string>(undefined);

  activate = output<string>();
  edit = output<string>();
  panTo = output<{
    center: Position;
    zoomLevel: number;
  }>();

  protected _route = linkedSignal(() => this.route());
  protected notes = signal<FBNotes>([]);
  protected groups = signal<FBResourceGroups>([]);
  protected points = signal<
    {
      index: number;
      name: string;
      description: string;
      bearing: number;
      distance: number;
    }[]
  >([]);

  private routeReversed = false;

  protected icon: AppIconDef;
  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);
  private course = inject(CourseService);
  protected skgroups = inject(SKResourceGroupService);
  private dialog = inject(MatDialog);
  private bottomSheet = inject(MatBottomSheet);

  constructor() {
    effect(() => {
      this.route();
      this.init(this.route());
    });

    effect(() => {
      if (this.related()?.includes('groups')) {
        this.getRelatedGroups();
      } else if (this.related()?.includes('notes')) {
        this.getRelatedNotes();
      }
    });

    effect(() => {
      this.course.courseData();
      if (this.routeReversed !== this.app.data.activeRouteReversed) {
        this.routeReversed = this.app.data.activeRouteReversed;
        this.parsePoints();
      }
    });
  }

  protected init(n: SKRoute) {
    if (!n) {
      return;
    }
    n.description = n.description ?? '';
    this._route.set(n);
    this.icon = getResourceIcon('routes', this._route());
    this.getRelatedNotes();
    this.getRelatedGroups();
    this.parsePoints();
  }

  protected async getRelatedNotes() {
    const n = await this.skres.getRelatedNotes('routes', this.id());
    this.notes.set(n);
  }

  protected async getRelatedGroups() {
    const g = await this.skgroups.with('routes', this.id());
    this.groups.set(g);
  }

  protected parsePoints() {
    if (this._route().feature && this._route().feature.geometry.coordinates) {
      const legs = this.getLegInfo();
      const meta = this.getPointsMeta();
      this.points.update(() => {
        let r = [];
        for (let i = 0; i < legs.length; ++i) {
          r.push(Object.assign({}, legs[i], meta[i]));
        }
        if (this.app.data.activeRouteReversed) {
          r = r.reverse();
        }
        return r;
      });
    }
  }

  /** Get bearing and distance for each route leg */
  private getLegInfo() {
    const pos = this.app.data.vessels.self.position;
    return GeoUtils.routeLegs(
      this._route().feature.geometry.coordinates,
      pos
    ).map((l) => {
      return {
        bearing: this.app.formatValueForDisplay(l.bearing, 'deg'),
        distance: this.app.formatValueForDisplay(l.distance, 'm')
      };
    });
  }

  /** get route point metatdata */
  private getPointsMeta() {
    if (
      this._route().feature.properties.coordinatesMeta &&
      Array.isArray(this._route().feature.properties.coordinatesMeta)
    ) {
      const pointsMeta = this._route().feature.properties.coordinatesMeta.map(
        (p) => {
          return {
            name: p?.name ?? '',
            description: p?.description ?? ''
          };
        }
      );
      let idx = 0;
      return pointsMeta.map((pt) => {
        idx++;
        if (pt.href) {
          const id = pt.href.split('/').slice(-1);
          const wpt = this.skres.fromCache('waypoints', id[0]);
          return wpt
            ? {
                index: idx,
                name: `* ${wpt[1].name}`,
                description: `* ${wpt[1].description}`
              }
            : {
                index: idx,
                name: '!wpt reference!',
                description: ''
              };
        } else {
          return {
            index: idx,
            name: pt.name ?? `RtePt-${('000' + String(idx)).slice(-3)}`,
            description: pt.description ?? ``
          };
        }
      });
    } else {
      let idx = 0;
      return this._route().feature.geometry.coordinates.map(() => {
        return {
          index: idx,
          name: `RtePt-${('000' + String(++idx)).slice(-3)}`,
          description: ''
        };
      });
    }
  }

  protected onEdit() {
    this.edit.emit(this.id());
  }

  protected onReverse() {
    this.course.courseReverse();
  }

  protected onGoto(index?: number) {
    if (this.points().length < 2) {
      return;
    }
    if (index === -1) {
      this.course.clearCourse();
      return;
    }
    if (typeof index === 'undefined') {
      this.activate.emit(this.id());
    } else {
      this.course.activateRoute(this.id(), index);
    }
  }

  protected onDelete() {
    this.skres.deleteRoute(this.id());
  }

  protected onPanTo() {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;

    this.panTo.emit({
      center: this._route().feature.geometry.coordinates[0],
      zoomLevel: zoomTo
    });
  }

  protected showNote(id: string) {
    this.skres.showNoteDetails(id);
  }

  protected arrangePoints() {
    this.bottomSheet
      .open(ActiveResourcePropertiesModal, {
        disableClose: true,
        data: {
          title: 'Route Properties',
          resource: [this.id(), this._route(), false],
          type: 'route',
          noButtons: true
        }
      })
      .afterDismissed()
      .subscribe((deactivate: boolean) => {
        if (deactivate) {
          //this.clearDestination();
        }
        //this.focusMap();
      });
  }

  /**
   * @description Show select Group dialog
   * @param id route identifier
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
              await this.skgroups.addToGroup(selGrp.id, 'route', this.id());
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
}
