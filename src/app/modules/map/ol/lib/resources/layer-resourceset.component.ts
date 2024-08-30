import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import {
  Point,
  MultiPoint,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon
} from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray } from '../util';
import { SKResourceSet } from 'src/app/modules';
import { FBFeatureLayerComponent } from '../sk-feature.component';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > fb-resource-sets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourceSetLayerComponent extends FBFeatureLayerComponent {
  protected features: Array<Feature>;

  @Input() collection: string;
  @Input() resourceSets: Array<SKResourceSet> = [];
  @Input() selected: Array<string> = [];

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['rset'];
    this.parseResourceSets(this.resourceSets);
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && 'resourceSets' in changes) {
      this.source.clear();
      this.parseResourceSets(changes['resourceSets'].currentValue);
    }
  }

  // process resource sets
  parseResourceSets(resourceSets: Array<SKResourceSet>) {
    this.features = [];
    for (const r of resourceSets) {
      if (this.selected.includes(r.id)) {
        this.parseResources(r);
      }
    }
    this.source.addFeatures(this.features);
  }

  // process a resource set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseResources(rSet: { [key: string]: any }) {
    const fa: Feature[] = [];
    let count = 0;
    for (const w of rSet.values.features) {
      let f: Feature;
      if (w.geometry.type === 'Point') {
        f = new Feature({
          geometry: new Point(fromLonLat(w.geometry.coordinates)),
          name: w.properties.name ?? `Point ${count}`
        });
      }
      if (w.geometry.type === 'MultiPoint') {
        f = new Feature({
          geometry: new MultiPoint(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name ?? `Pt ${count}`
        });
      } else if (w.geometry.type === 'LineString') {
        f = new Feature({
          geometry: new LineString(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name ?? `L${count}`
        });
      } else if (w.geometry.type === 'MultiLineString') {
        f = new Feature({
          geometry: new MultiLineString(
            fromLonLatArray(w.geometry.coordinates)
          ),
          name: w.properties.name ?? `L${count}`
        });
      } else if (w.geometry.type === 'Polygon') {
        f = new Feature({
          geometry: new Polygon(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name ?? `P${count}`
        });
      } else if (w.geometry.type === 'MultiPolygon') {
        f = new Feature({
          geometry: new MultiPolygon(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name ?? `P${count}`
        });
      }
      if (!f) {
        continue;
      }
      f.setId(`rset.${this.collection}.${rSet.id}.${count}`);
      // set style
      if (typeof rSet.styles !== 'undefined') {
        let rs: Style;
        if (typeof w.properties.styleRef !== 'undefined') {
          rs = this.buildStyle(
            rSet.styles[w.properties.styleRef],
            w.geometry.type
          );
        } else if (typeof w.properties.style !== 'undefined') {
          rs = this.buildStyle(w.properties.style, w.geometry.type);
        } else {
          rs = this.buildStyle(rSet.styles.default, w.geometry.type);
        }
        f.setStyle(this.setTextLabel(rs, w.properties.name));
      }
      fa.push(f);
      count++;
    }
    this.features = this.features.concat(fa);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildStyle(styleDef: { [key: string]: any }, geom: string): Style {
    const s = new Style();
    if (geom === 'Point' || geom === 'MulitPoint') {
      s.setImage(
        new Circle({
          radius: styleDef.width ?? 5,
          fill: new Fill({ color: styleDef.fill ?? 'blue' }),
          stroke: new Stroke({
            color: styleDef.stroke ?? 'blue',
            width: 2,
            lineDash: styleDef.lineDash ?? [1]
          })
        })
      );
      s.setText(
        new Text({
          text: '',
          offsetY: -20
        })
      );
    } else {
      s.setFill(new Fill({ color: styleDef.fill ?? 'blue' }));
      s.setStroke(
        new Stroke({
          color: styleDef.stroke ?? 'blue',
          width: styleDef.width ?? 2,
          lineDash: styleDef.lineDash ?? [1]
        })
      );
    }
    return s;
  }
}
