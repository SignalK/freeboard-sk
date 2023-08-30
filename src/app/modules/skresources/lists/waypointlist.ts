import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { AppInfo } from 'src/app/app.info';
import { Position } from 'src/app/lib/geoutils';
import {
  FBWaypoints,
  FBWaypoint,
  FBResourceSelect,
  SKPosition
} from 'src/app/types';

@Component({
  selector: 'waypoint-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './waypointlist.html',
  styleUrls: ['./resourcelist.css']
})
export class WaypointListComponent {
  @Input() waypoints: FBWaypoints;
  @Input() activeWaypoint: string;
  @Input() editingWaypointId: string;
  @Output() select: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() delete: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() goto: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() deactivate: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() refresh: EventEmitter<void> = new EventEmitter();
  @Output() properties: EventEmitter<FBResourceSelect> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() center: EventEmitter<Position> = new EventEmitter();
  @Output() notes: EventEmitter<FBResourceSelect> = new EventEmitter();

  filterList = [];
  filterText = '';
  someSel = false;
  allSel = false;
  disableRefresh = false;

  constructor(public app: AppInfo) {}

  ngOnInit() {
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
    if (
      this.editingWaypointId &&
      this.editingWaypointId.indexOf('waypoint') !== -1
    ) {
      this.disableRefresh = true;
    } else {
      this.disableRefresh = false;
    }
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
    this.filterList.forEach((i: FBWaypoint) => {
      c = i[2] ? true : c;
      u = !i[2] ? true : u;
    });
    this.allSel = c && !u ? true : false;
    this.someSel = c && u ? true : false;
  }

  selectAll(value: boolean) {
    this.filterList.forEach((i: FBWaypoint) => {
      i[2] = value;
    });
    this.someSel = false;
    this.allSel = value ? true : false;
    this.select.emit({ id: 'all', value: value });
  }

  itemSelect(e: boolean, id: string) {
    this.filterList.forEach((i: FBWaypoint) => {
      if (i[0] == id) {
        i[2] = e;
      }
    });
    this.checkSelections();
    this.select.emit({ id: id, value: e });
  }

  emitCenter(position: Position) {
    this.center.emit(position);
  }

  itemProperties(id: string) {
    this.properties.emit({ id: id, type: 'waypoint' });
  }

  itemDelete(id: string) {
    this.delete.emit({ id: id });
  }

  itemGoTo(id: string) {
    this.itemSelect(true, id); // ensure active resource is selected
    this.goto.emit({ id: id });
  }

  itemClearActive() {
    this.deactivate.emit({ id: null });
  }

  itemRefresh() {
    this.refresh.emit();
  }

  itemViewNotes(id: string) {
    this.notes.emit({ id: id });
  }

  filterKeyUp(e: string) {
    this.filterText = e;
    this.doFilter();
    this.sortFilter();
  }

  doFilter() {
    if (this.filterText.length === 0) {
      this.filterList = this.waypoints;
    } else {
      this.filterList = this.waypoints.filter((i: FBWaypoint) => {
        if (i[1].name) {
          if (
            i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase()) != -1
          ) {
            return i;
          }
        }
      });
    }
    this.checkSelections();
  }

  sortFilter() {
    this.filterList.sort((a, b) => {
      const x = a[1].name || 'zzz';
      const y = b[1].name || 'zzz';
      return x.toUpperCase() <= y.toUpperCase() ? -1 : 1;
    });
  }
}
