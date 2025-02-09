// Signal K Icon Resources

import { Injectable } from '@angular/core';
import { Style, Icon, Text } from 'ol/style';
import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from 'src/app/app.info';

interface SKIconMeta {
  id: string;
  group: string;
  format: string;
}

const SK_ICONS_PATH = 'resources/icons';

@Injectable({ providedIn: 'root' })
export class SignalKIcons {
  private _styles = {};
  private fetched = false;
  private _iconFiles = [];

  constructor(private app: AppInfo, private signalk: SignalKClient) {}

  get styles() {
    this.init();
    return this._styles;
  }

  get files(): Array<string> {
    this.init();
    return this._iconFiles;
  }

  // check for Signal K Icon resources and initialise data structures
  init() {
    /*this.signalk.api.get(this.app.skApiVersion, SK_ICONS_PATH).subscribe(
      (r: SKIconMeta[]) => {
        this.app.data.skIcons.hasApi = true;
        this.buildStyles(r);
        this.fetched = true;
      },
      () => {
        this.app.debug('No Signal K Icons available!');
        this.app.data.skIcons.hasApi = false;
        this._styles = {};
        this.fetched = true;
      }
    );*/
    if (Object.keys(this._styles).length === 0 && !this.fetched) {
      const poi = [
        'anchorage',
        'boatramp',
        'bridge',
        'business',
        'dam',
        'ferry',
        'hazard',
        'inlet',
        'lock',
        'marina',
        'dock',
        'turning-basin',
        'radio-call-point',
        'transhipment-dock',
        'notice-to-mariners'
      ];
      poi.forEach((p) => {
        this._iconFiles.push(`${p}.svg`);
        const i = new Icon({
          src: `./assets/img/poi/${p}.svg`,
          rotateWithView: false,
          scale: 0.65,
          anchor: [1, 37],
          anchorXUnits: 'pixels',
          anchorYUnits: 'pixels',
          opacity: 1
        });
        this._styles[p] = new Style({
          image: i,
          text: new Text({
            text: '',
            offsetY: -30
          })
        });
      });
    }
  }

  private buildStyles(icons: SKIconMeta[]) {
    if (!Array.isArray(icons)) {
      this._styles = {};
      return;
    }
    icons.forEach((i) => {
      this._styles[i.id] = new Style({
        image: this.buildImage(i.id),
        text: new Text({
          text: '',
          offsetY: -30
        })
      });
    });
  }

  private buildImage(id: string) {
    const path = `${this.signalk.api.endpoint.replace(
      '/v1/',
      `/v${this.app.skApiVersion}/`
    )}${SK_ICONS_PATH}`;
    return new Icon({
      src: `${path}/${id}`,
      rotateWithView: false,
      scale: 1.65,
      anchor: [1, 37],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    });
  }
}
