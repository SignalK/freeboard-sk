/***********************************
Signal K Details list component
    <signalk-details-list>
***********************************/
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'signalk-details-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./signalk-details.component.css'],
  template: `
    <div class="sk-details">
      <div class="title">
        <div>{{ title }}</div>
      </div>
      <div class="content">
        <div class="item" *ngFor="let item of items">
          <span class="sectionname" *ngIf="item[0] == 0 && item[2] == null">{{
            item[1]
          }}</span>
          <div class="pathvalue" *ngIf="item[2] != null">
            <div class="path" [matTooltip]="item[1]">{{ item[1] }}</div>
            <div class="value" [matTooltip]="item[2]">{{ item[2] }}</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SignalKDetailsComponent {
  @Input() title = '';
  @Input() details: any;

  public items: any;

  //constructor() { }

  ngOnChanges() {
    if (this.details) {
      this.parseEntries();
    } else {
      this.items = [];
    }
  }

  // ** parse items
  parseEntries() {
    const u = Object.entries(this.details);
    u.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    this.items = this.section(this.flatten(u));
  }

  private section(u: Array<any>): Array<any> {
    const result = [];
    u.forEach((i) => {
      const p = i[0].split('.');
      if (p.length == 1) {
        result.push([0, '', p[0], typeof i[1] !== 'object' ? i[1] : null]);
      } else {
        const pp = p.slice(0, p.length - 1).join('.');
        result.push([p.length - 1, pp, p[p.length - 1], i[1]]);
      }
    });
    // ** sort **
    result.sort((a, b) => {
      return a[1] < b[1] ? -1 : 1;
    });
    let prevParent: string = null;
    const processedParents = [];
    u = [];
    result.forEach((i) => {
      if (i[1] != prevParent) {
        prevParent = i[1];
        if (processedParents.indexOf(i[1]) == -1) {
          //
          processedParents.push(i[1]);
          u.push([0, i[1], null]);
        }
      }
      u.push([i[0], i[2], i[3]]);
    });
    return u;
  }

  // ** flatten object values to .paths **
  private flatten(u: Array<any>): Array<any> {
    let paths = [];
    u.forEach((i) => {
      if (typeof i[1] === 'object' && i[1] != null) {
        paths = paths.concat(this.processObject(i[0], i[1]));
      } else {
        paths.push([i[0], i[1]]);
      }
    });
    return paths;
  }

  // ** process object values **
  private processObject(parent: string, obj: any) {
    let paths = [];
    const u = Object.entries(obj);
    u.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    u.forEach((i) => {
      if (typeof i[1] === 'object' && i[1] != null) {
        paths = paths.concat(this.processObject(parent + '.' + i[0], i[1]));
      } else {
        paths.push([parent + '.' + i[0], i[1]]);
      }
    });
    return paths;
  }
}
