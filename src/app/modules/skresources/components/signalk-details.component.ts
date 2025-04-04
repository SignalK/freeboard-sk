/***********************************
Signal K Details list component
    <signalk-details-list>
***********************************/
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { PipesModule } from '../../../lib/pipes';

@Component({
  selector: 'signalk-details-list',
  imports: [MatTooltipModule, CommonModule, PipesModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./signalk-details.component.css'],
  template: `
    <div class="sk-details">
      <div class="title">
        <div>{{ title }}</div>
      </div>
      <div class="content">
        @for(item of items; track item) {
        <div class="item">
          @if(item[0] === 0 && item[2] === null) {
          <span class="sectionname">{{ item[1] }}</span>
          } @if(item[2] !== null) {
          <div class="pathvalue">
            <div class="path" [matTooltip]="item[1]">{{ item[1] }}</div>
            @if(item[1] === 'latitude') {
            <div class="value" [matTooltip]="item[2]">
              {{
                item[2] | coords : app.config.selections.positionFormat : true
              }}
            </div>
            } @else if (item[1] === 'longitude') {
            <div class="value" [matTooltip]="item[2]">
              {{
                item[2] | coords : app.config.selections.positionFormat : false
              }}
            </div>
            } @else {
            <div class="value" [matTooltip]="item[2]">{{ item[2] }}</div>
            }
          </div>
          }
        </div>
        }
      </div>
    </div>
  `
})
export class SignalKDetailsComponent {
  @Input() title = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() details: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public items: any;

  constructor(protected app: AppFacade) {}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private section(u: Array<any>): Array<any> {
    const result = [];
    u.forEach((i) => {
      const p = i[0].split('.');
      if (p.length === 1) {
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
      if (i[1] !== prevParent) {
        prevParent = i[1];
        if (processedParents.indexOf(i[1]) === -1) {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private flatten(u: Array<any>): Array<any> {
    let paths = [];
    u.forEach((i) => {
      if (typeof i[1] === 'object' && i[1] !== null) {
        paths = paths.concat(this.processObject(i[0], i[1]));
      } else {
        paths.push([i[0], i[1]]);
      }
    });
    return paths;
  }

  // ** process object values **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processObject(parent: string, obj: any) {
    let paths = [];
    const u = Object.entries(obj);
    u.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    u.forEach((i) => {
      if (typeof i[1] === 'object' && i[1] !== null) {
        paths = paths.concat(this.processObject(parent + '.' + i[0], i[1]));
      } else {
        paths.push([parent + '.' + i[0], i[1]]);
      }
    });
    return paths;
  }
}
