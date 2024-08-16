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
import { Style, Stroke, Text, Fill, Circle } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';

@Component({
  selector: 'ol-map > racing-start-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RacingStartLineLayerComponent
  extends FBFeatureLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() startLine: LineString;
  @Input() racecourseStyles: { [key: string]: Style };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    super(mapComponent, changeDetectorRef);
    this.labelPrefixes = ['race-startline'];
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseCourse();
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (['markers', 'startLine', 'finishLine'].some((k) => k in changes)) {
      this.parseCourse();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCourse() {
    if (!this.source) {
      return;
    }
    this.source.clear();
    const fa: Feature[] = [];
    if (Array.isArray(this.startLine) && this.startLine.length === 2) {
      const sl = new Feature({
        geometry: new LineString(
          fromLonLatArray(mapifyCoords(this.startLine as any))
        ),
        name: 'start'
      });
      sl.setId('race-start-line');
      sl.setStyle(this.racecourseStyles.startLine);
      fa.push(sl);

      const sp = new Feature({
        geometry: new Point(fromLonLat(this.startLine[0])),
        name: 'pin'
      });
      sp.setId('race-start-pin');
      sp.setStyle(this.racecourseStyles.startPin);
      fa.push(sp);

      const sb = new Feature({
        geometry: new Point(fromLonLat(this.startLine[1])),
        name: 'boat'
      });
      sb.setId('race-start-boat');
      sb.setStyle(this.racecourseStyles.startBoat);
      fa.push(sb);

      this.source.addFeatures(fa);
      this.updateLabels();
    }
  }
}
