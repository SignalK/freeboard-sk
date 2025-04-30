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
import { FBTracks } from 'src/app/types';

// ** Freeboard Track resources collection format **
@Component({
  selector: 'ol-map > fb-tracks',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TrackLayerComponent extends FBFeatureLayerComponent {
  @Input() tracks: FBTracks;
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

  parseTracks(tracks: FBTracks = this.tracks) {
    const fa: Feature[] = [];
    for (const t of tracks) {
      const f = new Feature({
        geometry: new MultiLineString(
          this.parseCoordinates(t[1].feature.geometry.coordinates)
        ),
        name: t[1].feature.properties.name
      });
      f.setId('track.' + t[1].feature.id);
      f.setStyle(this.buildStyle(t[1]));
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
