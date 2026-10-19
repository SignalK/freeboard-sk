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
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBResourceSets } from 'src/app/types';
import { SKResourceSet } from 'src/app/modules/skresources';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > fb-resource-sets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ResourceSetLayerComponent extends FBFeatureLayerComponent {
  protected features: Array<Feature> = [];

  @Input() collection?: string;
  @Input() resourceSets: FBResourceSets = [];

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['rset'];
    this.parseResourceSets(this.resourceSets);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && 'resourceSets' in changes) {
      this.source.clear();
      this.parseResourceSets(changes['resourceSets'].currentValue);
    }
  }

  // process resource sets
  parseResourceSets(resourceSets: FBResourceSets) {
    this.features = [];
    for (const r of resourceSets) {
      if (r[2]) {
        this.parseResources(r[1]);
      }
    }
    this.source.addFeatures(this.features);
  }

  // process a resource set

  parseResources(rSet: SKResourceSet) {
    const fa: Feature[] = [];
    let count = 0;
    for (const w of rSet.values?.features ?? []) {
      const props = w.properties ?? {};
      let f: Feature | undefined;
      if (w.geometry.type === 'Point') {
        f = new Feature({
          geometry: new Point(fromLonLat(w.geometry.coordinates)),
          name: props.name ?? `Point ${count}`
        });
      }
      if (w.geometry.type === 'MultiPoint') {
        f = new Feature({
          geometry: new MultiPoint(fromLonLatArray(w.geometry.coordinates)),
          name: props.name ?? `Pt ${count}`
        });
      } else if (w.geometry.type === 'LineString') {
        f = new Feature({
          geometry: new LineString(fromLonLatArray(w.geometry.coordinates)),
          name: props.name ?? `L${count}`
        });
      } else if (w.geometry.type === 'MultiLineString') {
        f = new Feature({
          geometry: new MultiLineString(
            fromLonLatArray(w.geometry.coordinates)
          ),
          name: props.name ?? `L${count}`
        });
      } else if (w.geometry.type === 'Polygon') {
        f = new Feature({
          geometry: new Polygon(fromLonLatArray(w.geometry.coordinates)),
          name: props.name ?? `P${count}`
        });
      } else if (w.geometry.type === 'MultiPolygon') {
        f = new Feature({
          geometry: new MultiPolygon(fromLonLatArray(w.geometry.coordinates)),
          name: props.name ?? `P${count}`
        });
      }
      if (!f) {
        continue;
      }
      f.setId(`rset.${this.collection}.${rSet.id}.${count}`);
      // set style
      if (typeof rSet.styles !== 'undefined') {
        let rs: Style;
        if (typeof props.styleRef !== 'undefined') {
          rs = this.buildStyle(
            rSet.styles[props.styleRef] ?? {},
            w.geometry.type
          );
        } else if (typeof props.style !== 'undefined') {
          rs = this.buildStyle(props.style, w.geometry.type);
        } else {
          rs = this.buildStyle(rSet.styles.default ?? {}, w.geometry.type);
        }
        f.setStyle(this.setTextLabel(rs, props.name));
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
