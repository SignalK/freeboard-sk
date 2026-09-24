import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { HistoryTrack } from 'src/app/modules/skstream/track-history';

/** Feature id prefix of a history segment (`trackhistory.<n>`). */
export const TRACK_HISTORY_ID = 'trackhistory';

// Solid and translucent, so recorded history reads as background to the
// dashed fresh trail and AIS tracks drawn in the same colours.
const SELF_STYLE = new Style({
  stroke: new Stroke({ color: 'rgba(252, 3, 132, 0.45)', width: 2.5 })
});
const AIS_STYLE = new Style({
  stroke: new Stroke({ color: 'rgba(255, 0, 255, 0.4)', width: 2 })
});

/** Recorded track history (#821): one feature per recorded segment, so a
 * tapped segment can say when it was recorded. Each feature carries its
 * vessel `context`, its lon/lat `line` and the `times` of its points. */
@Component({
  selector: 'ol-map > fb-track-history',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TrackHistoryLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  private layer: VectorLayer<VectorSource>;
  private source: VectorSource;

  @Input() tracks: Map<string, HistoryTrack>;
  @Input() zIndex: number;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource({ features: this.buildFeatures() });
    this.layer = new VectorLayer({ source: this.source, zIndex: this.zIndex });
    this.mapComponent.getMap()?.addLayer(this.layer);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.layer) {
      return;
    }
    if (changes['tracks']) {
      this.source.clear();
      this.source.addFeatures(this.buildFeatures());
    }
    if (changes['zIndex']) {
      this.layer.setZIndex(this.zIndex);
    }
  }

  ngOnDestroy() {
    this.mapComponent.getMap()?.removeLayer(this.layer);
    this.layer = null;
  }

  private buildFeatures(): Feature[] {
    const features: Feature[] = [];
    this.tracks?.forEach((track) => {
      const style = track.context === 'self' ? SELF_STYLE : AIS_STYLE;
      track.lines.forEach((line, i) => {
        if (line.length < 2) {
          return;
        }
        const f = new Feature({
          geometry: new LineString(fromLonLatArray(mapifyCoords(line))),
          context: track.context,
          line,
          times: track.times?.[i]
        });
        f.setId(`${TRACK_HISTORY_ID}.${features.length}`);
        f.setStyle(style);
        features.push(f);
      });
    });
    return features;
  }
}
