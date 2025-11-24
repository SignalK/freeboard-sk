import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';

import { ResourceGroupDialog } from './group-dialog';

import { ActionResult } from 'src/app/types';

export interface SKResourceGroup {
  name: string;
  description: string;
  routes?: Array<string>;
  waypoints?: Array<string>;
  charts?: Array<string>;
}
interface GroupResponse {
  [index: string]: SKResourceGroup;
}
export type FBResourceGroup = [string, SKResourceGroup, boolean?];
export type FBResourceGroups = Array<FBResourceGroup>;

// ** Signal K resource group operations
@Injectable({ providedIn: 'root' })
export class SKResourceGroupService {
  constructor(
    private dialog: MatDialog,
    private signalk: SignalKClient,
    private app: AppFacade
  ) {}

  // ******** SK Resource Group operations ********************

  /**
   * @description Fetch resource groups from Signal K server.
   * @returns Promise<FBResourceGroups> (rejects with HTTPErrorResponse)
   */
  public listFromServer(): Promise<FBResourceGroups> {
    return new Promise((resolve, reject) => {
      const skf = this.signalk.api.get(
        this.app.skApiVersion,
        `/resources/groups`
      );
      skf?.subscribe(
        (res: GroupResponse) => {
          const list: any = [];
          Object.entries(res).forEach((item) => {
            list.push([item[0], item[1], false]);
          });
          list.sort((a, b) => {
            const x = a[1].name?.toLowerCase();
            const y = b[1].name?.toLowerCase();
            return x > y ? 1 : -1;
          });
          resolve(list);
        },
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }

  /**
   * @description Fetch resource group with specified identifier from Signal K server.
   * @param id  Resource group identifier
   * @returns Promise<SKResourceGroup> (rejects with HTTPErrorResponse)
   */
  private fromServer(id: string): Promise<SKResourceGroup> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/groups/${id}`)
        .subscribe(
          (res: SKResourceGroup) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Delete resource group from server
   * @param id
   * @returns Promise<void> (rejects with HTTPErrorResponse)
   */
  private deleteFromServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/groups/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Put resource group to server
   * @param id Resource identifier
   * @param data Resource data
   * @returns Promise<ActionResult> (rejects with HTTPErrorResponse)
   */
  public putToServer(id: string, data: SKResourceGroup): Promise<any> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/groups/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Post resource to server
   * @param data Resource data
   * @returns Promise<ActionResult> (rejects with HTTPErrorResponse)
   */
  public postToServer(data: SKResourceGroup): Promise<any> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/groups`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  // ******** UI methods ****************************

  /**
   * @description Fetch Group with supplied id and display edit dialog
   * @param id route identifier. undefined = new group
   */
  async editGroupinfo(id?: string) {
    let grp: SKResourceGroup;
    if (!id) {
      // new group
      grp = {
        name: '',
        description: '',
        routes: [],
        waypoints: [],
        charts: []
      };
    } else {
      // edit group
      try {
        this.app.sIsFetching.set(true);
        grp = await this.fromServer(id);
        this.app.sIsFetching.set(false);
      } catch (err) {
        this.app.sIsFetching.set(false);
        this.app.parseHttpErrorResponse(err as HttpErrorResponse);
        return;
      }
    }
    this.dialog
      .open(ResourceGroupDialog, {
        disableClose: true,
        data: {
          addMode: !id,
          group: grp
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; group: SKResourceGroup }) => {
        if (r.save) {
          if (id) {
            this.putToServer(id, r.group).catch((err) =>
              this.app.parseHttpErrorResponse(err)
            );
          } else {
            this.postToServer(r.group);
          }
        }
      });
  }

  /**
   * @description Confirm deletion of Resource Group with supplied id
   * @param id Group identifier
   */
  deleteGroup(id: string) {
    if (!id) {
      return;
    }
    this.app
      .showConfirm(
        'Do you want to delete this Group from the server?\n',
        'Delete Group:',
        'YES',
        'NO'
      )
      .subscribe(async (result: { ok: boolean }) => {
        if (result && result.ok) {
          try {
            await this.deleteFromServer(id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  /**
   * @description Add resource to a group
   * @param grpId Group identifier
   * @param resType Resource type (route, waypoint, chart)
   * @param resId Resource identifier(s)
   */
  async addToGroup(grpId: string, resType: string, resId: string | string[]) {
    if (!resId) {
      return;
    }
    if (!Array.isArray(resId)) {
      resId = [resId];
    }

    const grp = await this.fromServer(grpId);

    if (resType === 'route') {
      if (!Array.isArray(grp.routes)) {
        grp.routes = [];
      }
      const newids = resId.filter((i) => !grp.routes.includes(i));
      grp.routes = grp.routes.concat(newids);
    }
    if (resType === 'waypoint') {
      if (!Array.isArray(grp.waypoints)) {
        grp.waypoints = [];
      }
      const newids = resId.filter((i) => !grp.waypoints.includes(i));
      grp.waypoints = grp.waypoints.concat(newids);
    }
    if (resType === 'chart') {
      if (!Array.isArray(grp.charts)) {
        grp.charts = [];
      }
      const newids = resId.filter((i) => !grp.charts.includes(i));
      grp.charts = grp.routes.concat(newids);
    }
    await this.putToServer(grpId, grp);
  }
}
