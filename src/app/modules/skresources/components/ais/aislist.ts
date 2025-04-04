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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AppFacade } from 'src/app/app.facade';
import { SKVessel } from 'src/app/modules';
import { Position } from 'src/app/types';

//** AIS Dialog **
@Component({
  selector: 'ais-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aislist.html',
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
    MatSlideToggleModule
  ]
})
export class AISListComponent {
  @Input() aisTargets: Map<string, SKVessel>;
  @Input() focusId: string;
  @Output() select: EventEmitter<string[]> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() properties: EventEmitter<string> = new EventEmitter();
  @Output() focusVessel: EventEmitter<string> = new EventEmitter();
  @Output() pan: EventEmitter<{ center: Position; zoomLevel: number }> =
    new EventEmitter();

  aisAvailable = [];
  onlyIMO = false;
  filterList = [];
  filterText = '';
  someSel = false;
  allSel = false;
  shipTypes = [
    {
      id: 10,
      description: 'Unspecified',
      selected: false,
      icon: './assets/img/ais_active.svg'
    },
    {
      id: 20,
      description: 'Wing in Ground',
      selected: false,
      icon: './assets/img/ais_active.svg'
    },
    {
      id: 30,
      description: 'Pleasure',
      selected: false,
      icon: './assets/img/ais_active.svg'
    },
    {
      id: 40,
      description: 'High Speed',
      selected: false,
      icon: './assets/img/ais_highspeed.svg'
    },
    {
      id: 50,
      description: 'Special',
      selected: false,
      icon: './assets/img/ais_special.svg'
    },
    {
      id: 60,
      description: 'Passenger',
      selected: false,
      icon: './assets/img/ais_passenger.svg'
    },
    {
      id: 70,
      description: 'Cargo',
      selected: false,
      icon: './assets/img/ais_cargo.svg'
    },
    {
      id: 80,
      description: 'Tanker',
      selected: false,
      icon: './assets/img/ais_tanker.svg'
    },
    {
      id: 90,
      description: 'Other',
      selected: false,
      icon: './assets/img/ais_other.svg'
    }
  ];

  constructor(public app: AppFacade) {}

  ngOnInit() {
    this.initItems();
    this.alignSelections();
  }

  close() {
    this.closed.emit();
  }

  initItems() {
    this.aisAvailable = [];
    // ** if no selections made then select all as a default
    const selectAll =
      this.app.config.selections.aisTargets &&
      Array.isArray(this.app.config.selections.aisTargets)
        ? false
        : true;

    this.aisTargets.forEach((value: SKVessel, key: string) => {
      let selected: boolean;
      if (selectAll) {
        selected = true;
      } else {
        selected =
          this.app.config.selections.aisTargets.indexOf(key) !== -1
            ? true
            : false;
      }
      this.aisAvailable.push([key, value, selected]);
    });
    this.aisAvailable.sort((a, b) => {
      const x = a[1].name ? a[1].name.toUpperCase() : 'zzz' + a[1].mmsi;
      const y = b[1].name ? b[1].name.toUpperCase() : 'zzz' + b[1].mmsi;
      return x <= y ? -1 : 1;
    });
    this.checkSelections();
    this.filterList = this.aisAvailable.slice(0);
  }

  alignSelections() {
    this.shipTypes.forEach((i) => {
      i.selected = this.app.config.selections.aisTargetTypes.includes(i.id);
    });
    this.onlyIMO = this.app.config.selections.aisTargetTypes.includes(-999);
  }

  toggleFilterType(e: boolean) {
    this.app.config.selections.aisFilterByShipType = e;
    if (e) {
      this.alignSelections();
    }
    this.app.saveConfig();
  }

  shipTypeSelect(e: boolean, id: number) {
    const t = [].concat(this.app.config.selections.aisTargetTypes);
    if (e) {
      t.push(id);
    } else {
      if (t.includes(id)) {
        t.splice(t.indexOf(id), 1);
      }
    }
    this.onlyIMO = t.includes(-999);
    this.app.config.selections.aisTargetTypes = [].concat(t);
    this.alignSelections();
    this.app.saveConfig();
  }

  checkSelections() {
    let c = false;
    let u = false;
    this.aisAvailable.forEach((i) => {
      c = i[2] ? true : c;
      u = !i[2] ? true : u;
    });
    this.allSel = c && !u ? true : false;
    this.someSel = c && u ? true : false;
  }

  selectAll(value: boolean) {
    this.aisAvailable.forEach((i) => {
      i[2] = value;
    });
    this.someSel = false;
    this.allSel = value ? true : false;
    this.emitSelected();
  }

  itemSelect(e: boolean, id: string) {
    this.aisAvailable.forEach((i) => {
      if (i[0] === id) {
        i[2] = e;
      }
    });
    this.checkSelections();
    this.emitSelected();
  }

  itemProperties(id: string) {
    this.properties.emit(id);
  }

  emitSelected() {
    let selection = this.aisAvailable
      .map((i) => {
        return i[2] === true ? i[0] : null;
      })
      .filter((i) => {
        return i;
      });
    if (this.allSel) {
      selection = null;
    }
    this.select.emit(selection);
  }

  filterKeyUp(e: string) {
    this.filterText = e;
    this.filterList = this.aisAvailable.filter((i) => {
      const n = i[1].name ? i[1].name.toUpperCase() : i[1].mmsi;
      if (n && n.toLowerCase().indexOf(this.filterText.toLowerCase()) !== -1) {
        return i;
      }
    });
  }

  focus(id?: string) {
    this.focusVessel.emit(id);
  }

  emitCenter(position: Position) {
    this.pan.emit({
      center: position,
      zoomLevel: this.app.config.map.zoomLevel
    });
  }
}
