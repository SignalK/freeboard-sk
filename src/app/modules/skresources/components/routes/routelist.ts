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

import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import {
  FBRoutes,
  FBRoute,
  FBResourceSelect
} from 'src/app/types/resources/freeboard';

@Component({
  selector: 'route-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routelist.html',
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
export class RouteListComponent {
  @Input() routes: FBRoutes;
  @Input() activeRoute: string;
  @Input() editingRouteId: string;
  @Output() select: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() delete: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() activate: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() deactivate: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() refresh: EventEmitter<void> = new EventEmitter();
  @Output() properties: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() points: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() notes: EventEmitter<{ id: string; readOnly: boolean }> =
    new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();

  filterList = [];
  filterText = '';
  someSel = false;
  allSel = false;
  disableRefresh = false;

  constructor(public app: AppFacade) {}

  ngOnInit() {
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
    this.disableRefresh =
      this.editingRouteId && this.editingRouteId.indexOf('route') !== -1;
  }

  close() {
    this.closed.emit();
  }

  initItems() {
    this.doFilter();
    this.sortFilter();
    this.checkSelections();
  }

  checkSelections() {
    let c = false;
    let u = false;
    this.filterList.forEach((i: FBRoute) => {
      c = i[2] ? true : c;
      u = !i[2] ? true : u;
    });
    this.allSel = c && !u ? true : false;
    this.someSel = c && u ? true : false;
  }

  selectAll(value: boolean) {
    this.filterList.forEach((i) => {
      i[2] = value;
    });
    this.someSel = false;
    this.allSel = value ? true : false;
    this.select.emit({ id: 'all', value: value });
  }

  itemSelect(e: boolean, id: string) {
    this.filterList.forEach((i) => {
      if (i[0] === id) {
        i[2] = e;
      }
    });
    this.checkSelections();
    this.select.emit({ id: id, value: e });
  }

  itemProperties(id: string) {
    this.properties.emit({ id: id, type: 'route' });
  }
  itemViewPoints(id: string) {
    this.points.emit({ id: id });
  }
  itemViewNotes(rte: FBRoute) {
    this.notes.emit({
      id: rte[0],
      readOnly: rte[1].feature?.properties?.readOnly ?? false
    });
  }

  itemSetActive(id: string) {
    this.itemSelect(true, id); // ensure active resource is selected
    this.activate.emit({ id: id });
  }
  itemClearActive(id: string) {
    this.deactivate.emit({ id: id });
  }

  itemDelete(id: string) {
    this.delete.emit({ id: id });
  }

  itemRefresh() {
    this.refresh.emit();
  }

  filterKeyUp(e: string) {
    this.filterText = e;
    this.doFilter();
    this.sortFilter();
  }

  doFilter() {
    if (this.filterText.length === 0) {
      this.filterList = this.routes;
    } else {
      this.filterList = this.routes.filter((i: FBRoute) => {
        if (
          i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase()) !== -1
        ) {
          return i;
        }
      });
    }
    this.checkSelections();
  }

  sortFilter() {
    this.filterList.sort((a, b) => {
      const x = a[1].name.toUpperCase();
      const y = b[1].name.toUpperCase();
      return x <= y ? -1 : 1;
    });
  }

  km2Nm(v: number) {
    return Convert.kmToNauticalMiles(v);
  }
}
