import { Injectable } from '@angular/core';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';

// ** Signal K custom resource collections used by Freeboard features
@Injectable({ providedIn: 'root' })
export class FBCustomResourceService {
  constructor(
    public signalk: SignalKClient,
    public app: AppFacade
  ) {}

  /**
   * @description Check status and initialise custom resource paths required for Freeboard features
   * @param noCreate Collections only checked for, not created when missing
   * @returns object items to be added to this.app.featureFlags
   */
  public async initCustomCollections(noCreate: string[] = []) {
    const rcs: Record<string, boolean> = {};
    await Promise.all(
      this.app.CUSTOM_RESOURCES.map(async (cr) => {
        rcs[cr.featureKey] = await this.checkCustomCollection(
          cr.name,
          cr.description,
          (cr.createIfMissing ?? true) && !noCreate.includes(cr.name)
        );
      })
    );
    return rcs;
  }

  /**
   * @description Check for supplied custom resource collection
   * @param name Name of resource collection to check
   * @param description Collection description.
   * @param createIfMissing Create the collection when it is not found.
   * @returns true if collection is available on the Signal K server
   */
  private checkCustomCollection(
    name: string,
    description: string,
    createIfMissing = true
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(this.app.skApiVersion, `resources/${name}`)
        .subscribe(
          () => resolve(true),
          () => {
            if (!createIfMissing) {
              resolve(false);
              return;
            }
            this.signalk
              .post(`/plugins/resources-provider/_config/${name}`, {
                description: description
              })
              .subscribe({
                next: () => resolve(true),
                error: () => resolve(false)
              });
          }
        );
    });
  }
}
