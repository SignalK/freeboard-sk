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
import { fromLonLatArray, splitAtAntimeridian, lineDashFor } from '../util';
import { AISBaseLayerComponent } from './ais-base.component';
import { ILineStyle } from 'src/app/types';

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
  @Input() aisTrackStyle: ILineStyle;

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
        if (keys.includes('tracksMinZoom') || keys.includes('aisTrackStyle')) {
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
    const isAircraft = id.indexOf('aircraft') !== -1;
    if (isAircraft) {
      const visible = this.showTracks ? 1 : 0;
      return new Style({
        stroke: new Stroke({ width: 1, color: `rgba(0,0,255,${visible})`, lineDash: [2, 2] })
      });
    }
    // vessel track — use configured style
    const st = this.aisTrackStyle;
    const color = this.showTracks
      ? (st ? st.color : '#ff00ff')
      : 'rgba(0,0,0,0)';
    const width = st ? st.width : 1;
    const lineDash = st ? lineDashFor(st.dash) : [2, 2];
    if (this.layerProperties && this.layerProperties.style) {
      const cs = this.layerProperties.style.clone();
      const ls = cs.getStroke();
      ls.setColor(color);
      cs.setStroke(ls);
      return cs;
    } else {
      return new Style({
        stroke: new Stroke({ width, color, lineDash })
      });
    }
  }

  // ** split at antimeridian and transform MultiLineString coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCoordinates(trk: Array<any>) {
    // ** handle dateline crossing **
    const tc = trk.map((mls) =>
      mls.flatMap((line) => splitAtAntimeridian(line))
    );
    return fromLonLatArray(tc);
  }
}
