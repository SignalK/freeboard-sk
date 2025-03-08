import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceSet } from './resourceset-class';
import { ResourceSet, CustomResources } from 'src/app/types';
import { processUrlTokens } from 'src/app/app.settings';

// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class SKOtherResources {
  private updateSource: Subject<{ action: string; mode: string }> =
    new Subject();
  public update$(): Observable<{ action: string; mode: string }> {
    return this.updateSource.asObservable();
  }

  private ignore = ['tracks', 'buddies'];

  constructor(
    public dialog: MatDialog,
    public signalk: SignalKClient,
    public app: AppFacade
  ) {}

  // **** ITEMS ****

  // returns true if one or more ResourceSets of any type are selected
  hasSelections(): boolean {
    let result = false;
    Object.entries(this.app.config.selections.resourceSets)
      .filter((r) => !this.ignore.includes(r[0]))
      .forEach((r) => {
        if (r[1].length > 0) {
          result = true;
        }
      });
    return result;
  }

  // retrieve items within url params bounds for all active resource-set-types
  getItemsInBounds() {
    Object.keys(this.app.config.selections.resourceSets)
      .filter((r) => !this.ignore.includes(r))
      .forEach((resType: string) => {
        if (this.app.config.selections.resourceSets[resType].length !== 0) {
          console.log(`getItemsInBounds(${resType})`);
          this.getItems(resType, true);
        }
      });
  }

  /** get items(s) from sk server
   * selected: true= only include selected items
   * noUpdate: true= suppress updateSource event
   */
  getItems(resType: string, selected = false, noUpdate = false) {
    if (this.ignore.includes(resType)) {
      return;
    }
    let rf = '';
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      rf = processUrlTokens(
        this.app.config.resources.fetchFilter,
        this.app.config
      );
      if (rf && rf[0] !== '?') {
        rf = '?' + rf;
      }
    }
    this.app.debug(`${rf}`);
    const path = `/resources/${resType}${rf}`;
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
        /*if (this.app.config.selections.resourceSets[resType]) {
          const k = Object.keys(res);
          this.app.config.selections.resourceSets[resType] =
            this.app.config.selections.resourceSets[resType]
              .map((i) => {
                return k.indexOf(i) !== -1 ? i : null;
              })
              .filter((i) => {
                return i;
              });
        }*/
        if (!noUpdate) {
          this.updateSource.next({ action: 'get', mode: 'resource-set' });
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
