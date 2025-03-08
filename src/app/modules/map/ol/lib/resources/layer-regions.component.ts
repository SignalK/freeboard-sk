import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { Polygon, MultiPolygon } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBRegions, Regions } from 'src/app/types';

@Component({
  selector: 'ol-map > sk-regions-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegionsBaseComponent extends FBFeatureLayerComponent {
  @Input() regionStyles: { [key: string]: Style };

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['region'];
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && 'regions' in changes) {
      this.source.clear();
      this.parseRegions(changes['regions']);
    }
  }

  parseRegions(change: SimpleChange) {
    // overridable function
  }

  // build region feature style
  buildStyle(id: string, reg: any): Style {
    // default style
    let theStyle = this.setTextLabel(
      new Style({
        fill: new Fill({
          color: 'rgba(255,0,255,0.1)'
        }),
        stroke: new Stroke({
          color: 'purple',
          width: 1
        }),
        text: new Text({
          text: '',
          offsetY: 0
        })
      }),
      reg.name
    );

    if (this.regionStyles) {
      if (
        reg.feature.properties?.skIcon &&
        this.regionStyles[reg.feature.properties.skIcon]
      ) {
        theStyle = this.setTextLabel(
          this.regionStyles[reg.feature.properties.skIcon],
          reg.name
        );
      } else if (this.regionStyles.default) {
        theStyle = this.setTextLabel(this.regionStyles.default, reg.name);
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      theStyle = this.setTextLabel(this.layerProperties.style, reg.name);
    }

    return theStyle;
  }

  // mapify and transform MultiLineString coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCoordinates(coords: Array<any>, geomType: 'Polygon' | 'MultiPolygon') {
    if (geomType === 'MultiPolygon') {
      const multipoly = [];
      coords.forEach((mpoly) => {
        const lines = [];
        mpoly.forEach((poly) => {
          lines.push(mapifyCoords(poly));
        });
        multipoly.push(lines);
      });
      return fromLonLatArray(multipoly);
    } else if (geomType === 'Polygon') {
      const lines = [];
      coords.forEach((line) => lines.push(mapifyCoords(line)));
      return fromLonLatArray(lines);
    }
  }
}

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-regions',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegionLayerComponent extends RegionsBaseComponent {
  @Input() regions: Regions;

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseSKRegions(this.regions);
  }

  override parseRegions(change: SimpleChange) {
    this.parseSKRegions(change.currentValue);
  }

  parseSKRegions(regions: Regions = this.regions) {
    const fa: Feature[] = [];
    for (const r in regions) {
      const c = this.parseCoordinates(
        regions[r].feature.geometry.coordinates,
        regions[r].feature.geometry.type
      );
      const f = new Feature({
        geometry:
          regions[r].feature.geometry.type === 'MultiPolygon'
            ? new MultiPolygon(c)
            : new Polygon(c),
        name: regions[r].name
      });
      f.setId('region.' + r);
      f.set('name', regions[r].name);
      f.set('icon', 'region');
      f.setStyle(this.buildStyle(r, regions[r]));
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }
}

// Freeboard resource collection format
@Component({
  selector: 'ol-map > fb-regions',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardRegionLayerComponent extends RegionsBaseComponent {
  @Input() regions: FBRegions = [];

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseFBRegions(this.regions);
  }

  override parseRegions(regions: SimpleChange) {
    this.parseFBRegions(regions.currentValue);
  }

  parseFBRegions(regions: FBRegions = this.regions) {
    const fa: Feature[] = [];
    for (const r of regions) {
      const c = this.parseCoordinates(
        r[1].feature.geometry.coordinates,
        r[1].feature.geometry.type
      );
      const f = new Feature({
        geometry:
          r[1].feature.geometry.type === 'MultiPolygon'
            ? new MultiPolygon(c)
            : new Polygon(c),
        name: r[1].name
      });
      f.setId('region.' + r[0]);
      f.set('name', r[1].name);
      f.set('icon', 'region');
      f.setStyle(this.buildStyle(r[0], r[1]));
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }
}
