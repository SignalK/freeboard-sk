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
import { Style, Stroke, Text, Fill, Circle, RegularShape } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';

@Component({
  selector: 'ol-map > racing-start-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
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
    if (['startLine'].some((k) => k in changes)) {
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
      sl.setStyle(this.buildStyle(sl));
      fa.push(sl);
      this.source.addFeatures(fa);
      this.updateLabels();
    }
  }

  // Style function
  buildStyle(feature: Feature) {
    const geometry = feature.getGeometry() as LineString;
    const styles = [];
    let ptFill: Fill;
    let bgWidth: number;

    if (typeof this.racecourseStyles === 'undefined') {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        return styles;
      }
    }

    // line style
    const s = Array.isArray(this.racecourseStyles.startLine)
      ? this.racecourseStyles.startLine[
          this.racecourseStyles.startLine.length - 1
        ]
      : this.racecourseStyles.startLine;
    bgWidth = s.getStroke().getWidth() + 1;
    const bgColor = 'white';
    ptFill = new Fill({
      color: s?.getStroke().getColor()
    });

    // background
    styles.push(
      new Style({
        stroke: new Stroke({
          color: bgColor,
          width: bgWidth
        })
      })
    );
    // line
    styles.push(this.racecourseStyles.startLine);

    // point styles
    const l = geometry.getCoordinates().length;
    geometry.forEachSegment((start, end) => {
      styles.push(
        new Style({
          geometry: new Point(start),
          image: new RegularShape({
            radius: 4,
            stroke: new Stroke({
              width: 1,
              color: bgColor
            }),
            fill: ptFill,
            points: 4,
            angle: Math.PI / 4
          })
        })
      );
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 3,
            stroke: new Stroke({
              width: 1,
              color: bgColor
            }),
            fill: ptFill
          })
        })
      );
    });
    return styles;
  }
}
