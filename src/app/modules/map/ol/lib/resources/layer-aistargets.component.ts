import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { AsyncSubject } from 'rxjs';
import { AISBaseLayerComponent } from './ais-base.component';

// ** Signal K non-vessel targets **
@Component({
  selector: 'ol-map > ais-targets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AISTargetsLayerComponent
  extends AISBaseLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }
}
