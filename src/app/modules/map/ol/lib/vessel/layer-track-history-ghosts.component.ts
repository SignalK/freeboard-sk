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
import { Style } from 'ol/style';
import ImageStyle from 'ol/style/Image';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { MapImageRegistry } from '../map-image-registry.service';
import { selfVesselIcon } from './layer-vessel.component';
import type { TrackHistoryGhost } from 'src/app/modules/skstream/track-history.service';

/** Opacity of a vessel drawn where it was at the scrubbed time. */
export const GHOST_OPACITY = 0.45;

/** Track history scrubbing (#821): each shown vessel drawn where it was at the
 * scrubbed time, in its own icon at reduced opacity, pointed along its track. */
@Component({
  selector: 'ol-map > fb-track-history-ghosts',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TrackHistoryGhostLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  private layer: VectorLayer<VectorSource>;
  private source: VectorSource;

  @Input() ghosts: TrackHistoryGhost[] = [];
  @Input() iconScale: number;
  @Input() zIndex: number;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent,
    protected mapImages: MapImageRegistry
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
    if (changes['ghosts'] || changes['iconScale']) {
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
    return (this.ghosts ?? []).map((g, i) => {
      const f = new Feature(new Point(fromLonLat(g.position)));
      f.setId(`ghost.${i}`);
      const icon = this.icon(g);
      icon.setOpacity(GHOST_OPACITY);
      icon.setRotateWithView(true);
      icon.setRotation(g.heading);
      f.setStyle(new Style({ image: icon }));
      return f;
    });
  }

  /** The vessel's own icon, as a fresh instance to rotate and fade. */
  private icon(g: TrackHistoryGhost): ImageStyle {
    if (g.context === 'self') {
      return selfVesselIcon(this.mapImages, this.iconScale);
    }
    const shipClass =
      typeof g.typeId === 'number'
        ? Math.abs(Math.floor(g.typeId / 10) * 10)
        : 'default';
    return this.mapImages.getVessel(shipClass, false).clone();
  }
}
