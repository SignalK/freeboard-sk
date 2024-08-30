import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Text, Stroke } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { SKTrack } from 'src/app/modules';
import { FBFeatureLayerComponent } from '../sk-feature.component';

// ** Freeboard Track resources collection format **
@Component({
  selector: 'ol-map > fb-tracks',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackLayerComponent extends FBFeatureLayerComponent {
  @Input() tracks: Array<SKTrack>;
  @Input() trackStyles: { [key: string]: Style };

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['track'];
    this.parseTracks(this.tracks);
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && 'tracks' in changes) {
      this.source.clear();
      this.parseTracks(changes['tracks'].currentValue);
    }
  }

  parseTracks(tracks: Array<SKTrack> = this.tracks) {
    const fa: Feature[] = [];
    for (const t of tracks) {
      const f = new Feature({
        geometry: new MultiLineString(
          this.parseCoordinates(t.feature.geometry.coordinates)
        ),
        name: t.feature.properties.name
      });
      f.setId('track.' + t.feature.id);
      f.setStyle(this.buildStyle(t));
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }

  // build track style
  buildStyle(trk: SKTrack): Style {
    if (typeof this.trackStyles !== 'undefined') {
      if (trk.feature.properties.skType) {
        return this.setTextLabel(
          this.trackStyles[trk.feature.properties.skType],
          trk.feature.properties.name
        );
      } else {
        return this.setTextLabel(
          this.trackStyles.default,
          trk.feature.properties.name
        );
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.setTextLabel(
        this.layerProperties.style,
        trk.feature.properties.name
      );
    } else {
      // default styles
      const s = new Style({
        stroke: new Stroke({
          color: 'rgb(146,11,153)',
          width: 2,
          lineDash: [5, 5]
        }),
        text: new Text({
          text: '',
          textAlign: 'center'
        })
      });
      return this.setTextLabel(s, trk.feature.properties.name);
    }
  }

  // ** mapify and transform MultiLineString coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCoordinates(mls: Array<any>) {
    const lines = [];
    mls.forEach((line) => lines.push(mapifyCoords(line)));
    return fromLonLatArray(lines);
  }
}
