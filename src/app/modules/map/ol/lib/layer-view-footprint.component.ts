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
import { Coordinate } from 'ol/coordinate';
import { Polygon } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style } from 'ol/style';
import { MapComponent } from './map.component';

const footprintStyle = new Style({
  fill: new Fill({ color: 'rgba(57, 73, 171, 0.08)' }),
  stroke: new Stroke({ color: '#3949ab', width: 2, lineDash: [8, 6] })
});

/**
 * Outlines what another map is showing, e.g. the main chart's viewport drawn
 * on the split view's overview pane.
 */
@Component({
  selector: 'ol-map > fb-view-footprint',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ViewFootprintComponent implements OnInit, OnChanges, OnDestroy {
  /**
   * Closed ring in EPSG:3857 render space, world offset included, so it lands
   * in the world copy the other map is looking at. Drawn only, never stored.
   */
  @Input() ring: Coordinate[] | null = null;
  @Input() zIndex: number;

  private layer: VectorLayer<VectorSource>;
  private feature = new Feature();

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.applyRing();
    this.layer = new VectorLayer({
      source: new VectorSource({ features: [this.feature] }),
      style: footprintStyle,
      zIndex: this.zIndex
    });
    this.mapComponent.getMap()?.addLayer(this.layer);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.ring) {
      this.applyRing();
    }
    if (changes.zIndex && this.layer) {
      this.layer.setZIndex(this.zIndex);
    }
  }

  ngOnDestroy() {
    if (this.layer) {
      this.mapComponent.getMap()?.removeLayer(this.layer);
      this.layer = null;
    }
  }

  private applyRing() {
    this.feature.setGeometry(
      this.ring?.length > 3 ? new Polygon([this.ring]) : undefined
    );
  }
}
