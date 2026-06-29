import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal
} from '@angular/core';
import { RouteBufferRegistry } from 'src/app/modules/plotterext/route-buffer.registry';
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
import { InfoPanelFacade } from 'src/app/modules/info-panel/info-panel.facade';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKRoute } from '../../resource-classes';
import { SKResourceService } from '../../resources.service';
import { FBNotes, Position } from 'src/app/types';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  interacting = input<boolean>(false);

  activate = output<string>();
  edit = output<string>();
  panTo = output<{
    center: Position;
    zoomLevel: number;
  }>();

  protected _route = linkedSignal(() => this.route());
  /** True when this id refers to a route with pending unsaved changes — a
   *  never-saved draft or a stored route edited but not yet re-saved: the panel
   *  shows "Save" instead of "Edit" and acts locally. A saved + clean buffer is
   *  treated as a normal stored route (shows "Edit"). */
  protected isUnsaved = computed(() => {
    const b = this.routeBuffers.get(this.id());
    return !!b && (!b.saved || b.dirty);
  });
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
  private routeBuffers = inject(RouteBufferRegistry);
  private infoPanel = inject(InfoPanelFacade);
  private course = inject(CourseService);
  protected skgroups = inject(SKResourceGroupService);
  private dialog = inject(MatDialog);
  private bottomSheet = inject(MatBottomSheet);
  private destroyRef = inject(DestroyRef);

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
    const b = this.routeBuffers.get(this.id());
    if (b && !b.saved) {
      // Unsaved draft — just discard the live buffer.
      this.routeBuffers.delete(this.id());
    } else {
      // Saved route (clean or dirty) — delete the stored resource, dropping any
      // live buffer too. hiddenSaved=false so the registry's hidden event
      // reports a permanent delete, not a hide.
      if (b) {
        this.routeBuffers.delete(this.id(), false);
      }
      this.skres.deleteRoute(this.id());
    }
    // The route no longer exists — close the panel so its now-stale actions
    // (Save/Edit/Start…) don't linger. A draft delete fires no server delta, so
    // closing here is the only trigger; for a saved route this just makes the
    // close immediate rather than waiting on the delete delta round-trip.
    this.infoPanel.close();
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

  protected addNote() {
    this.skres.showNoteEditor({
      type: 'route',
      href: { id: this.id(), exists: true }
    });
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      if (!glist.length) {
        this.app
          .showConfirm(
            'There are currently no groups defined.\nYou will need to first create a group and then add the resource.\n\nDo you want to create a new group?',
            'Group'
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
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
        .pipe(takeUntilDestroyed(this.destroyRef))
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
