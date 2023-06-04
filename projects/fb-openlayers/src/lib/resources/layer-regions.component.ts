import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill } from 'ol/style';
import { Polygon, MultiPolygon } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { SKRegion } from 'src/app/modules';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-regions',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegionLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() regions: { [key: string]: any };
  @Input() regionStyles: { [key: string]: Style };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseRegions(this.regions);
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key == 'regions') {
          this.parseRegions(changes[key].currentValue);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key == 'regionStyles') {
          // handle region style change
        } else if (key == 'layerProperties') {
          this.layer.setProperties(properties, false);
        } else {
          properties[key] = changes[key].currentValue;
        }
      }
      this.layer.setProperties(properties, false);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseRegions(regions: { [key: string]: any } = this.regions) {
    const fa: Feature[] = [];
    for (const w in regions) {
      const c = this.parseCoordinates(
        regions[w].feature.geometry.coordinates,
        regions[w].feature.geometry.type
      );
      const f = new Feature({
        geometry:
          regions[w].feature.geometry.type == 'MultiPolygon'
            ? new MultiPolygon(c)
            : new Polygon(c),
        name: regions[w].name
      });
      f.setId('region.' + w);
      f.setStyle(this.buildStyle(w, regions[w]));
      fa.push(f);
    }
    this.features = fa;
  }

  // ** mapify and transform MultiLineString coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCoordinates(coords: Array<any>, geomType) {
    if (geomType == 'MultiPolygon') {
      const multipoly = [];
      coords.forEach((mpoly) => {
        const lines = [];
        mpoly.forEach((poly) => {
          lines.push(mapifyCoords(poly));
        });
        multipoly.push(lines);
      });
      return fromLonLatArray(multipoly);
    } else if (geomType == 'Polygon') {
      const lines = [];
      coords.forEach((line) => lines.push(mapifyCoords(line)));
      return fromLonLatArray(lines);
    }
  }

  // build region style
  buildStyle(id: string, reg): Style {
    if (typeof this.regionStyles !== 'undefined') {
      if (reg.feature.properties.skType) {
        return this.regionStyles[reg.feature.properties.skType];
      } else {
        return this.regionStyles.default;
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.layerProperties.style;
    } else {
      // default styles
      return new Style({
        fill: new Fill({
          color: 'rgba(255,0,255,0.1)'
        }),
        stroke: new Stroke({
          color: 'purple',
          width: 1
        })
      });
    }
  }
}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-regions',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardRegionLayerComponent extends RegionLayerComponent {
  @Input() regions: Array<[string, SKRegion, boolean]>;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    super(changeDetectorRef, mapComponent);
  }

  parseRegions(regions: Array<[string, SKRegion, boolean]> = this.regions) {
    const fa: Feature[] = [];
    for (const w of regions) {
      const c = this.parseCoordinates(
        w[1].feature.geometry.coordinates,
        w[1].feature.geometry.type
      );
      const f = new Feature({
        geometry:
          w[1].feature.geometry.type == 'MultiPolygon'
            ? new MultiPolygon(c)
            : new Polygon(c),
        name: w[1].name
      });
      f.setId('region.' + w[0]);
      f.setStyle(this.buildStyle(w[0], w[1]));
      fa.push(f);
    }
    this.features = fa;
  }
}
