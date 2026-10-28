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
import { Style, Stroke, Icon, Fill, Text } from 'ol/style';
import { Point } from 'ol/geom';
import View from 'ol/View';
import { fromLonLat, getPointResolution } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { AsyncSubject } from 'rxjs';
import { Options } from 'ol/style/Icon';
import { MapImageRegistry } from '../map-image-registry.service';
import { actualSizeIconScale } from 'src/app/lib/vessel-icon-scale';
import {
  DEFAULT_OWN_VESSEL_ICON,
  OwnVesselIconType,
  OwnVesselIcons
} from 'src/app/modules/icons/vessels';

/** Symbol id used to override the own-vessel marker. */
export const VESSEL_SELF_MARKER = 'vessel-self';

/** A symbol provider's own-vessel override, which stands in for the default
 * icon only: choosing any other icon type draws that built-in instead. */
export function selfVesselOverride(
  mapImages: MapImageRegistry,
  iconType: OwnVesselIconType = DEFAULT_OWN_VESSEL_ICON
): Icon | null {
  return iconType === DEFAULT_OWN_VESSEL_ICON
    ? mapImages.getExternalSymbol(VESSEL_SELF_MARKER)
    : null;
}

/** The own-vessel icon at `iconScale`: the symbol provider override for the
 * default icon type, else the built-in icon for `iconType`. A fresh instance,
 * so per-render heading rotation does not mutate a shared one. */
export function selfVesselIcon(
  mapImages: MapImageRegistry,
  iconScale?: number,
  iconType: OwnVesselIconType = DEFAULT_OWN_VESSEL_ICON
): Icon {
  const ext = selfVesselOverride(mapImages, iconType);
  if (ext) {
    const img = ext.clone();
    img.setRotateWithView(true);
    if (iconScale) {
      img.setScale(Math.abs(iconScale));
    }
    return img;
  }
  const def =
    OwnVesselIcons[iconType] ?? OwnVesselIcons[DEFAULT_OWN_VESSEL_ICON];
  return new Icon({
    src: def.path,
    anchor: [0.5, 0.5],
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction',
    scale: iconScale ? Math.abs(iconScale) : def.scale,
    rotateWithView: true
  } as Options);
}

const fixedVesselStyle = new Style({
  image: new Icon({
    src: './assets/img/vessels/self_fixed.png',
    anchor: [22.5, 50],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    size: [50, 50],
    scale: 0.5,
    rotateWithView: false
  })
});

/** Opacity applied to the vessel icon while its position is stale. */
export const STALE_VESSEL_OPACITY = 0.4;

/** Opacity applied to the own-vessel icon while another vessel is selected. */
export const INACTIVE_VESSEL_OPACITY = 0.5;

/** Drawn over the vessel when its position is no longer being updated.
 * Deliberately unmissable: the whole point of #672 is that a transient
 * message at the bottom of the screen is not. Centred on the vessel position
 * so it reads as "this fix is unknown" rather than as a separate marker. */
const staleVesselStyle = new Style({
  text: new Text({
    text: '?',
    font: 'bold 44px Roboto, "Helvetica Neue", sans-serif',
    fill: new Fill({ color: 'red' }),
    // outlines the glyph itself, keeping it legible over a dark chart
    stroke: new Stroke({ color: '#ffffff', width: 1 })
  })
});

// ** Freeboard Vessel component **
@Component({
  selector: 'ol-map > fb-vessel',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class VesselComponent implements OnInit, OnDestroy, OnChanges {
  protected layer?: Layer;
  public source?: VectorSource;
  protected features?: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();

  @Input() id?: string;
  @Input() activeId?: string | null;
  @Input() position?: Coordinate | null;
  @Input() heading = 0;
  @Input() vesselStyles?: { [key: string]: Style };
  @Input() fixedLocation?: boolean;
  /** Position is no longer being updated — dim the icon and flag it. */
  @Input() stale = false;
  @Input() iconScale = 1;
  @Input() actualSize = false;
  @Input() lengthOverall: number | null = null;
  @Input() beam: number | null = null;
  @Input() iconType: OwnVesselIconType = DEFAULT_OWN_VESSEL_ICON;
  /** Symbol overrides load after the map starts, and again after a login, so
   * the style is rebuilt each time they do. Without this a `vessel-self`
   * override only appears on the next unrelated style change, which then looks
   * as if that setting was ignored. */
  @Input() symbolsRevision = 0;
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: { [index: string]: any };

  vessel?: Feature;
  selfStyle?: Style;
  private view?: View;
  private scaledIcon: Icon | null = null;
  inactiveStyle?: Style;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent,
    protected mapImages: MapImageRegistry
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const fa = [];
    this.parseVessel();
    if (this.vessel) {
      fa.push(this.vessel);
    }

    this.source = new VectorSource({ features: fa });
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
    if (map) {
      this.view = map.getView();
      this.view.on('change:resolution', this.onResolutionChange);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (
          key === 'id' ||
          key === 'activeId' ||
          key === 'position' ||
          key === 'heading' ||
          key === 'stale'
        ) {
          if (this.source) {
            if (this.actualSize && key === 'position') {
              // Metres per pixel is latitude-dependent, so the scale is stale
              // after a position change even when the zoom has not moved.
              this.generateSelfStyle();
            }
            this.parseVessel();
          }
        } else if (
          key === 'vesselStyles' ||
          key === 'iconScale' ||
          key === 'actualSize' ||
          key === 'lengthOverall' ||
          key === 'beam' ||
          key === 'iconType' ||
          key === 'symbolsRevision'
        ) {
          if (this.source) {
            this.generateSelfStyle();
            this.parseVessel();
          }
        } else if (key === 'layerProperties') {
          this.layer.setProperties(properties, false);
        } else {
          properties[key] = changes[key].currentValue;
        }
      }
      this.layer.setProperties(properties, false);
    }
  }

  private onResolutionChange = () => {
    if (!this.actualSize || !this.vessel) {
      return;
    }
    this.generateSelfStyle();
    this.parseVessel();
  };

  /** A custom icon has no size until its image loads. Rebuild the style once
   * it does so actual-size scaling uses the real dimensions. */
  private onScaledIconChange = () => {
    const icon = this.scaledIcon;
    if (!icon || icon.getSize() === null) {
      return;
    }
    this.scaledIcon = null;
    icon.unlistenImageChange(this.onScaledIconChange);
    if (this.actualSize && this.vessel) {
      this.generateSelfStyle();
      this.parseVessel();
    }
  };

  ngOnDestroy() {
    this.view?.un('change:resolution', this.onResolutionChange);
    this.scaledIcon?.unlistenImageChange(this.onScaledIconChange);
    this.scaledIcon = null;
    this.view = undefined;
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = undefined;
    }
  }

  parseVessel() {
    const position = this.position;
    if (!Array.isArray(position) || position.length < 2) {
      if (this.vessel) {
        this.source?.removeFeature(this.vessel);
        this.vessel = undefined;
      }
      return;
    }
    const coords = fromLonLat([position[0], position[1]]);
    if (!this.vessel) {
      this.vessel = new Feature(new Point(coords));
      this.source?.addFeature(this.vessel);
    } else {
      (this.vessel.getGeometry() as Point).setCoordinates(coords);
    }
    this.vessel.setId(this.id ?? 'self');
    const s = this.buildStyle();
    if (s) {
      const im = (s as Style).getImage();
      if (im) {
        if (this.fixedLocation) {
          im.setRotation(0);
        } else {
          im.setRotation(this.heading);
        }
        // set both ways: the styles are shared module-level instances, so a
        // dimmed icon would otherwise stay dimmed after position resumes
        im.setOpacity(
          this.stale
            ? STALE_VESSEL_OPACITY
            : s === this.inactiveStyle
              ? INACTIVE_VESSEL_OPACITY
              : 1
        );
      }
      this.vessel.setStyle(this.stale ? [s, staleVesselStyle] : s);
    }
  }

  // default self style with specified scale
  generateSelfStyle() {
    this.selfStyle = new Style({ image: this.selfIcon() });
    this.inactiveStyle = undefined;
  }

  private generateInactiveStyle() {
    this.inactiveStyle = new Style({ image: this.selfIcon() });
  }

  private selfIcon(): Icon {
    this.scaledIcon?.unlistenImageChange(this.onScaledIconChange);
    this.scaledIcon = null;
    const icon = selfVesselIcon(this.mapImages, this.iconScale, this.iconType);
    if (this.actualSize) {
      const size = icon.getSize();
      const metresPerPixel = this.metresPerPixel();
      if (metresPerPixel !== undefined) {
        const def =
          OwnVesselIcons[this.iconType] ??
          OwnVesselIcons[DEFAULT_OWN_VESSEL_ICON];
        const metrics = size ?? [def.width, def.height];
        icon.setScale(
          actualSizeIconScale(
            {
              width: metrics[0],
              height: metrics[1],
              scale: this.iconScale
            },
            { lengthOverall: this.lengthOverall, beam: this.beam },
            metresPerPixel
          )
        );
      }
      if (size === null) {
        this.scaledIcon = icon;
        icon.listenImageChange(this.onScaledIconChange);
      }
    }
    return icon;
  }

  private metresPerPixel(): number | undefined {
    const map = this.mapComponent.getMap();
    const view = map?.getView();
    const resolution = view?.getResolution();
    const position = this.position;
    if (!view || !resolution || !position || position.length < 2) {
      return undefined;
    }
    const coordinate = fromLonLat([position[0], position[1]]);
    return getPointResolution(
      view.getProjection(),
      resolution,
      coordinate,
      'm'
    );
  }

  // build target style
  buildStyle(): Style | undefined {
    if (!this.selfStyle) {
      this.generateSelfStyle();
    }
    // default style with speciifed scale
    let cs = this.selfStyle;

    if (this.vesselStyles) {
      // use supplied styles
      if (this.fixedLocation) {
        if (this.vesselStyles.fixed) {
          cs = this.vesselStyles.fixed;
        }
      } else {
        if (this.activeId && this.activeId !== this.id) {
          if (this.vesselStyles.inactive) {
            cs = this.vesselStyles.inactive;
          }
        } else {
          if (this.vesselStyles.default) {
            cs = this.vesselStyles.default;
          }
        }
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      cs = this.layerProperties.style;
    } else {
      // use default styles
      if (this.fixedLocation) {
        cs = fixedVesselStyle;
      } else {
        if (this.activeId && this.activeId !== this.id) {
          if (!this.inactiveStyle) {
            this.generateInactiveStyle();
          }
          cs = this.inactiveStyle;
        }
      }
    }
    return cs;
  }
}
