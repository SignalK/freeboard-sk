import { signal } from '@angular/core';
import { FBResource } from 'src/app/types';
import { SKResourceService, SKSelection } from '../resources.service';

/**
 * Base class for Resource Lists
 */
export class ResourceListBase {
  protected collection!: SKSelection;
  protected filterText = '';
  protected someSel = false;
  protected allSel = false;
  protected fullList: Array<any> = [];
  protected filteredList = signal<any>([]);

  constructor(
    collection: SKSelection,
    protected skres: SKResourceService
  ) {
    this.collection = collection;
  }

  /**
   * Handle filter key event
   * @param value Text used to filter the fullList
   */
  protected filterKeyUp(value: string) {
    this.filterText = value ?? '';
    this.doFilter();
  }

  /**
   * filter & sort resource entries
   */
  protected doFilter() {
    const sortList = () => {
      fl.sort((a, b) => a[1].name.localeCompare(b[1].name));
    };
    let fl: Array<FBResource>;
    if (this.filterText.length === 0) {
      fl = this.fullList.slice(0);
    } else {
      fl = this.fullList.filter((item) => {
        return item[1].name
          ?.toLowerCase()
          .includes(this.filterText?.toLowerCase());
      });
    }
    sortList();
    this.filteredList.update(() => fl.slice(0));
    this.alignSelections();
  }

  /**
   * Align select all / some / none checkbox with entry selections
   */
  protected alignSelections() {
    let c = false;
    let u = false;
    this.filteredList().forEach((i: FBResource) => {
      c = i[2] ? true : c;
      u = !i[2] ? true : u;
    });
    this.allSel = c && !u ? true : false;
    this.someSel = c && u ? true : false;
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected toggleAll(checked: boolean) {
    // fullList update
    this.fullList.forEach((item) => (item[2] = checked));
    // filteredList update
    this.filteredList.update((fl: FBResource[]) => {
      fl.forEach((item) => (item[2] = checked));
      return fl;
    });
    if (checked) {
      this.skres.selectionUnfilter(this.collection);
    } else {
      this.skres.selectionClear(this.collection);
    }
    this.someSel = false;
    this.allSel = checked ? true : false;
  }

  /**
   * @description Toggle item selection
   * @param checked Item is checked
   */
  protected toggleItem(checked: boolean, id: string): number {
    let idx: number;
    // fullList update
    idx = this.fullList.findIndex((item) => item[0] === id);
    if (idx !== -1) {
      this.fullList[idx][2] = checked;
    }
    // filteredList update
    this.filteredList.update((fl) => {
      idx = fl.findIndex((item) => item[0] === id);
      if (idx !== -1) {
        fl[idx][2] = checked;
      }
      return fl;
    });

    this.alignSelections();
    const countFullList = this.fullList.length;
    const countSelected = this.fullList.filter((i) => i[2]).length;
    const fullSel = countFullList === countSelected;
    if (!this.skres.selectionIsFiltered(this.collection) && !fullSel) {
      // update selections array to contain selected items
      const sel = this.fullList
        .filter((item) => item[2])
        .map((item) => item[0]);
      this.skres.selectionClear(this.collection);
      this.skres.selectionAdd(this.collection, sel);
    } else if (this.skres.selectionIsFiltered(this.collection) && fullSel) {
      this.skres.selectionUnfilter(this.collection);
    }
    return idx;
  }
}
