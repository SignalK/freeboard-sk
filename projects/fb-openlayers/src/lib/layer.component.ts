import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {Layer} from 'ol/layer';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
// import VectorImageLayer from 'ol/layer/VectorImage';
import VectorTileSource from 'ol/source/VectorTile';
import {Cluster, ImageWMS, OSM, Source, TileImage, TileWMS, WMTS, XYZ} from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import {MapComponent} from './map.component';
import {Extent, LayerType, SourceType} from './models';
import {osmLayer, osmSource} from './util';
import {AsyncSubject} from 'rxjs';

@Component({
  selector: 'ol-map > ol-layer',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: any;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() layerType: LayerType;
  @Input() sourceType: SourceType;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() sourceOptions: any;
  @Input() style: any;
  @Input() properties: { [index: string]: any };

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {

    switch (this.layerType) {
      case LayerType.IMAGE:
        this.source = new ImageWMS(this.sourceOptions);
        this.layer = new ImageLayer(Object.assign(this, {...this.properties}));
        break;
      case LayerType.TILE:
        this.source = this.getTileSource(this.sourceOptions);
        this.layer = new TileLayer(Object.assign(this, {...this.properties}));
        break;
      case LayerType.VECTOR_TILE:
        this.source = new VectorTileSource(this.sourceOptions);
        this.layer = new VectorTileLayer(Object.assign(this, {...this.properties}));
        break;
      case LayerType.VECTOR:
        if (this.sourceOptions.sourceType === SourceType.CLUSTER) {
          this.source = new Cluster(this.sourceOptions);
          this.layer = new VectorLayer(Object.assign(this, {...this.properties}));
        } else {
          this.source = new VectorSource(this.sourceOptions);
          this.layer = new VectorLayer(Object.assign(this, {...this.properties}));
        }
        break;
      default:
        this.layer = osmLayer();
        break;
    }

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
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        properties[key] = changes[key].currentValue;
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

  getLayer(): Layer {
    return this.layer;
  }

  getMap() {
    return this.mapComponent.getMap();
  }

  getSource(): Source {
    let olSource = this.layer.getSource();
    if (olSource instanceof Cluster) {
      olSource = olSource.getSource();
    }
    return olSource;
  }

  getUrl(): string {
    if (this.source instanceof ImageWMS) {
      return this.source.getUrl();
    }
    if (this.source instanceof WMTS) {
      return this.source.getUrls()[0];
    }
    if (this.source instanceof TileWMS) {
      return this.source.getUrls()[0];
    } else {
      return '';
    }
  }

  updateParams(name?: string, value?: any) {
    const params = this.source.getParams();
    if (name && value) {
      params[name.toUpperCase()] = value;
    }
    params['T'] = new Date().getMilliseconds();
    this.source.updateParams(params); // {'TIME': startDate.toISOString()}
  }

  private getTileSource(sourceOptions: any) {

    switch (sourceOptions.sourceType) {
      case SourceType.IMAGEWMS:
        return new ImageWMS(sourceOptions);
      case SourceType.OSM:
        return new OSM(sourceOptions);
      case SourceType.TILEWMS:
        return new TileWMS(sourceOptions);
      case SourceType.TILEIMAGE:
        return new TileImage(sourceOptions);
      case SourceType.WMTS:
        return new WMTS(sourceOptions);
      case SourceType.XYZ:
        return new XYZ(sourceOptions);
      default:
        return osmSource();
    }
  }

}
