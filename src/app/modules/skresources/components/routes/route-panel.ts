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
import { TemporaryRouteService } from 'src/app/modules/course/temporary-route.service';
import { isTemporaryRoute } from 'src/app/modules/course/temporary-route';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';

import { RemarkModule } from 'ngx-remark';
import { markdownProcessor } from '../../../../lib/markdown';

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
import { ActiveResourcePropertiesModal } from '../active-resource-dialog';
import { editsRouteBuffer } from '../route-reorder.util';
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
  protected readonly mdProcessor = markdownProcessor;
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
    // Read the live() signal (not the plain get() Map lookup) so the Save/Edit
    // label re-evaluates when the buffer's saved/dirty state changes.
    const b = this.routeBuffers.live().find((x) => x.routeId === this.id());
    return !!b && (!b.saved || b.dirty);
  });
  /** True for a drawn route that was never saved: START follows it as a
   *  temporary route. */
  protected isDraft = computed(() => {
    const b = this.routeBuffers.live().find((x) => x.routeId === this.id());
    return !!b && !b.saved;
  });
  protected isTemporary = computed(() => isTemporaryRoute(this._route()));
  /** Whether this is the route being followed. Read from course data so it
   *  updates when the course changes. */
  /** Whether this route has edits not yet saved to the server, whose point
   *  order the Course API follows. */
  protected hasUnsavedEdits = computed(() => {
    // live() makes this re-evaluate when a buffer changes.
    this.routeBuffers.live();
    return editsRouteBuffer(this.routeBuffers.getForRoute(this.id()));
  });
  protected isActive = computed(() => {
    this.course.courseData();
    return !!this.id() && this.app.data.activeRoute === this.id();
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
  protected course = inject(CourseService);
  private temporaryRoutes = inject(TemporaryRouteService);
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
      return pointsMeta.map((pt, index) => {
        if (pt.href) {
          const id = pt.href.split('/').slice(-1);
          const wpt = this.skres.fromCache('waypoints', id[0]);
          return wpt
            ? {
                index,
                name: `* ${wpt[1].name}`,
                description: `* ${wpt[1].description}`
              }
            : {
                index,
                name: '!wpt reference!',
                description: ''
              };
        } else {
          return {
            index,
            name: pt.name ?? `RtePt-${('000' + String(index + 1)).slice(-3)}`,
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
    } else if (this.isDraft()) {
      this.temporaryRoutes.start(this.id(), index);
    } else {
      this.course.activateRoute(this.id(), index);
    }
  }

  /** Rejoin the route at point `index` (in the order it is followed): head
   *  straight there, then follow the route on. */
  protected onRejoin(index: number) {
    this.course.rejoinRouteAt(index);
  }

  protected onSkip(index: number) {
    this.course.skipRoutePoint(index);
  }

  protected async onDelete() {
    const b = this.routeBuffers.get(this.id());
    if (b && !b.saved) {
      // Unsaved draft — just discard the live buffer and close; no server
      // round-trip, so this is the only close trigger.
      this.routeBuffers.delete(this.id());
      this.infoPanel.close();
      return;
    }
    // Saved route (clean or dirty) — only drop the live buffer and close the
    // panel once the server delete is confirmed and succeeds; a cancel or
    // failure leaves the route (and any dirty edits) intact. hiddenSaved=false
    // so the registry's hidden event reports a permanent delete, not a hide.
    const ok = await this.skres.deleteRoute(this.id());
    if (ok) {
      if (b) {
        this.routeBuffers.delete(this.id(), false);
      }
      this.infoPanel.close();
    }
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
