import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AISBaseLayerComponent } from './ais-base.component';

// ** Signal K AIS targets track  **
@Component({
  selector: 'ol-map > ais-targets-track',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISTargetsTrackLayerComponent extends AISBaseLayerComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() tracks: Map<string, any> = new Map();
  @Input() tracksMinZoom = 10;
  @Input() override mapZoom = 10;
  @Input() showTracks = true;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.reloadTracks();
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.layer) {
      const keys = Object.keys(changes);
      if (
        keys.includes('tracks') &&
        changes['tracks'].previousValue.size === 0
      ) {
        this.reloadTracks();
      } else {
        if (keys.includes('tracksMinZoom')) {
          if (typeof this.mapZoom !== 'undefined') {
            this.reloadTracks();
          }
        }
        if (keys.includes('mapZoom')) {
          if (typeof this.tracksMinZoom !== 'undefined') {
            if (
              changes['mapZoom'].currentValue >= this.tracksMinZoom &&
              changes['mapZoom'].previousValue < this.tracksMinZoom
            ) {
              this.reloadTracks();
            } else if (
              changes['mapZoom'].currentValue < this.tracksMinZoom &&
              changes['mapZoom'].previousValue >= this.tracksMinZoom
            ) {
              this.source.clear();
            }
          }
        }
      }
    }
  }

  okToRenderTracks() {
    return this.mapZoom >= this.tracksMinZoom;
  }

  reloadTracks() {
    if (!this.tracks || !this.source) {
      return;
    }
    this.source.clear();
    if (this.okToRenderTracks) {
      this.onUpdateTargets(this.extractKeys(this.tracks));
    }
  }

  // update track features
  override onUpdateTargets(ids: Array<string>) {
    if (this.okToRenderTracks) {
      ids.forEach((id: string) => {
        if (id.includes(this.targetContext)) {
          const f = this.source.getFeatureById('track-' + id) as Feature;
          if (this.okToRenderTarget(id)) {
            if (this.tracks.has(id)) {
              const track = this.tracks.get(id);
              if (f) {
                f.setGeometry(
                  new MultiLineString(this.parseCoordinates(track))
                );
                f.setStyle(this.buildStyle(id));
              } else {
                this.addTrackWithId(id);
              }
            }
          } else {
            this.source.removeFeature(f);
          }
        }
      });
    }
  }

  // remove track features
  override onRemoveTargets(ids: Array<string>) {
    ids.forEach((w) => {
      const f = this.source.getFeatureById('track-' + w) as Feature;
      if (f) {
        this.source.removeFeature(f);
      }
    });
  }

  // add new track feature
  addTrackWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.tracks.has(id)) {
      return;
    }
    const track = this.tracks.get(id);
    const f = new Feature({
      geometry: new MultiLineString(this.parseCoordinates(track))
    });
    f.setId('track-' + id);
    f.setStyle(this.buildStyle(id));
    this.source.addFeature(f);
  }

  // build track style
  buildStyle(id: string): Style {
    const rgb = id.indexOf('aircraft') !== -1 ? '0, 0, 255' : '255, 0, 255';
    let color =
      this.mapZoom < this.tracksMinZoom ? `rgba(${rgb},0)` : `rgba(${rgb},1)`;
    color = this.showTracks ? `rgba(${rgb},1)` : `rgba(${rgb},0)`;
    if (this.layerProperties && this.layerProperties.style) {
      const cs = this.layerProperties.style.clone();
      const ls = cs.getStroke();
      ls.setColor(color);
      cs.setStroke(ls);
      return cs;
    } else {
      return new Style({
        stroke: new Stroke({
          width: 1,
          color: color,
          lineDash: [2, 2]
        })
      });
    }
  }

  // ** mapify and transform MultiLineString coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCoordinates(trk: Array<any>) {
    // ** handle dateline crossing **
    const tc = trk.map((mls) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lines: Array<any> = [];
      mls.forEach((line) => lines.push(mapifyCoords(line)));
      return lines;
    });
    return fromLonLatArray(tc);
  }
}
