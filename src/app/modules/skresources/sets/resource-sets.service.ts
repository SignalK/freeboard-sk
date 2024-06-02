import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from 'src/app/app.info';
import { SKResourceSet } from './resource-set';
import { ResourceSet, CustomResources } from 'src/app/types';

// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class SKOtherResources {
  private updateSource: Subject<{ action: string; mode: string }> =
    new Subject();
  public update$(): Observable<{ action: string; mode: string }> {
    return this.updateSource.asObservable();
  }

  private ignore = ['tracks'];

  constructor(
    public dialog: MatDialog,
    public signalk: SignalKClient,
    public app: AppInfo
  ) {}

  // **** ITEMS ****

  /** get items(s) from sk server
   * selected: true= only include selected items
   * noUpdate: true= suppress updateSource event
   */
  getItems(resType: string, selected = false) {
    if (this.ignore.includes(resType)) {
      return;
    }
    const path = `/resources/${resType}`;
    this.signalk.api
      .get(this.app.skApiVersion, path)
      .subscribe((res: CustomResources) => {
        this.app.data.resourceSets[resType] = [];
        const items = this.processItems(res);
        if (selected) {
          if (!this.app.config.selections.resourceSets[resType]) {
            this.app.config.selections.resourceSets[resType] = [];
          }
          this.app.data.resourceSets[resType] = items.filter((i) => {
            return this.app.config.selections.resourceSets[resType].includes(
              i.id
            )
              ? true
              : false;
          });
        } else {
          this.app.data.resourceSets[resType] = items;
        }

        // ** clean up selections
        if (this.app.config.selections.resourceSets[resType]) {
          const k = Object.keys(res);
          this.app.config.selections.resourceSets[resType] =
            this.app.config.selections.resourceSets[resType]
              .map((i) => {
                return k.indexOf(i) !== -1 ? i : null;
              })
              .filter((i) => {
                return i;
              });
        }
      });
  }

  // ** process data and apply styles
  private processItems(res: CustomResources) {
    let resList = [];
    if (!Array.isArray(res)) {
      // convert returned object to array
      resList = Object.entries(res);
    }
    // check for ResourceSet
    if (
      resList.length !== 0 &&
      (resList[0].length === 2 ||
        resList[0][1].type ||
        resList[0][1].type === 'ResourceSet')
    ) {
      return this.processResourceSet(resList);
    } else {
      return this.processOther(resList);
    }
  }

  private resourceSelected() {
    this.updateSource.next({ action: 'selected', mode: 'resource-set' });
  }

  private processResourceSet(resList: Array<[string, ResourceSet]>) {
    const items = [];
    // process ResourceSet
    resList.forEach((r: [string, ResourceSet]) => {
      const t = new SKResourceSet(r[1]);
      t.id = r[0].toString();
      // apply default / styleRefs to features
      if (t.values?.features) {
        t.values.features.forEach((f) => {
          if (f.properties.styleRef) {
            //styleRef
            if (t.styles && t.styles[f.properties.styleRef]) {
              f.properties.style = t.styles[f.properties.styleRef];
            } else if (t.styles['default']) {
              f.properties.style = t.styles['default'];
            }
          } else if (!f.properties.style) {
            // no style (use default)
            if (t.styles && t.styles['default']) {
              f.properties.style = t.styles['default'];
            }
          }
          // fall through= use defined style
          // enforce min style
          if (!f.properties.style.lineDash) {
            f.properties.style.lineDash = [1];
          }
          if (!f.properties.style.width) {
            f.properties.style.width = f.geometry.type === 'Point' ? 4 : 2;
          }
        });
        items.push(t);
      }
    });
    return items;
  }

  // ** process Non ResourceSet responses into generic return value
  private processOther(resList: Array<unknown>) {
    const items = [];
    resList.forEach((r) => {
      const i = {};
      if (r['id'] || r['urn']) {
        i['id'] = r['id'] ?? r['urn'];
        i['type'] = r['type'] ?? 'unknown';
        i['name'] = r['name'] ?? '';
        i['description'] = r['description'] ?? '';
        items.push(i);
      }
    });
    return items;
  }
}
