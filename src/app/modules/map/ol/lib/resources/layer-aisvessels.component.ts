import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Circle, Text, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Point, LineString } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { SKVessel } from 'src/app/modules/skresources';
import { fromLonLatArray } from '../util';
import { MapImageRegistry } from '../map-image-registry.service';

// Helper to validate L/B ratio (realistic ship ratios are 2:1 to 12:1)
function isValidLBRatio(length: number, beam: number): boolean {
  if (!length || !beam || beam <= 0 || length <= 0) return false;
  const ratio = length / beam;
  return ratio >= 2 && ratio <= 12;
}

// Helper to create a boat-shaped icon using Canvas
function createBoatShapeIcon(
  lengthMeters: number,
  beamMeters: number,
  mapResolution: number,
  fillColor: string,
  strokeColor: string
): Icon {
  // Convert meters to pixels at current map resolution
  const lengthPixels = lengthMeters / mapResolution;
  const beamPixels = beamMeters / mapResolution;
  
  // Create canvas with some padding for stroke
  const padding = 2;
  const canvasWidth = Math.max(8, beamPixels + padding * 2);
  const canvasHeight = Math.max(16, lengthPixels + padding * 2);
  
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(canvasWidth);
  canvas.height = Math.ceil(canvasHeight);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    // Fallback to simple triangle if canvas fails
    return new Icon({
      src: './assets/img/vessels/self.png',
      scale: 1,
      rotateWithView: true
    });
  }
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Draw boat shape:
  // - Pointed bow at top
  // - Wide beam at middle
  // - Squared stern at bottom
  ctx.beginPath();
  
  // Bow (pointed front) - top center
  ctx.moveTo(centerX, padding);
  
  // Port side (left) going down to beam
  ctx.lineTo(padding, canvas.height * 0.35);
  
  // Port side continuing to stern (slight curve in at stern)
  ctx.lineTo(padding + canvas.width * 0.1, canvas.height - padding);
  
  // Stern (back) - flat bottom
  ctx.lineTo(canvas.width - padding - canvas.width * 0.1, canvas.height - padding);
  
  // Starboard side (right) going up to beam
  ctx.lineTo(canvas.width - padding, canvas.height * 0.35);
  
  // Back to bow
  ctx.closePath();
  
  // Fill
  ctx.fillStyle = fillColor;
  ctx.fill();
  
  // Stroke
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Convert canvas to data URL
  const dataUrl = canvas.toDataURL();
  
  return new Icon({
    src: dataUrl,
    anchor: [canvas.width / 2, canvas.height / 2],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    rotateWithView: true
  });
}

// AIS vessel colors by type
const AIS_COLORS = {
  default: { fill: '#FF00FF', stroke: '#000000' },  // Magenta
  focused: { fill: '#FF0000', stroke: '#000000' },   // Red
  buddy: { fill: '#4CFF00', stroke: '#FFFFFF' },     // Green
  inactive: { fill: '#FFFFFF', stroke: '#FF00DC' },  // White
  // Ship type colors
  30: { fill: '#FF00FF', stroke: '#FFFFFF' },        // Fishing
  40: { fill: '#FFE97F', stroke: '#7F6A00' },        // High-speed
  50: { fill: '#00FFFF', stroke: '#000000' },        // Pilot/Special
  60: { fill: '#0026FF', stroke: '#0026FF' },        // Passenger
  70: { fill: '#009931', stroke: '#000000' },        // Cargo
  80: { fill: '#FF0000', stroke: '#7F0000' },        // Tanker
  90: { fill: '#808080', stroke: '#000000' }         // Other
};

// ** Signal K AIS Vessel targets **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISVesselsLayerComponent extends AISBaseLayerComponent {
  @Input() cogLineLength = 0;
  @Input() scaleToSize = false;
  @Input() mapResolution: number;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['ais-'];
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if ('cogLineLength' in changes) {
      this.cogLineLength = changes['cogLineLength'].currentValue ?? 0;
      this.onUpdateTargets(this.extractKeys(this.targets));
    }
    if ('scaleToSize' in changes || 'mapResolution' in changes) {
      // Re-render all targets when scale or resolution settings change
      this.onUpdateTargets(this.extractKeys(this.targets));
    }
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.extractKeys(this.targets).forEach((id) => {
      this.addTargetWithId(id);
    });
  }

  // update targets
  override onUpdateTargets(ids: Array<string>) {
    if (!this.source) return;
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext)) {
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            const f = this.source.getFeatureById('ais-' + id) as Feature;
            if (f) {
              const target = this.targets.get(id) as SKVessel;
              const label = this.buildLabel(target);
              if (target.position) {
                f.setGeometry(new Point(fromLonLat(target.position)));
              }
              const s = this.buildVesselStyle(
                target,
                label,
                this.isStale(target)
              ).clone();
              f.set('name', label, true);
              f.setStyle(
                this.setTextLabel(
                  this.setRotation(s, target.orientation),
                  label
                )
              );
              this.parseCogLine(id, target);
            } else {
              this.addTargetWithId(id);
            }
          }
        } else {
          this.onRemoveTargets([id]);
        }
      }
    });
  }

  // remove target features
  override onRemoveTargets(ids: Array<string>) {
    ids.forEach((id) => {
      if (id.includes(this.targetContext)) {
        let f = this.source.getFeatureById('ais-' + id) as Feature;
        if (f) {
          this.source.removeFeature(f);
        }
        f = this.source.getFeatureById('cog-' + id) as Feature;
        if (f) {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // label zoom threshold crossed
  override onLabelZoomThreshold(entered: boolean) {
    super.updateLabels();
    this.toggleCogLines(entered);
  }

  // add new target
  addTargetWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id) as SKVessel;
    if (this.okToRenderTarget(id) && target.position) {
      const label = this.buildLabel(target);
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position)),
        name: target.name
      });
      const s = this.buildVesselStyle(
        target,
        label,
        this.isStale(target)
      ).clone();
      f.setId('ais-' + id);
      f.set('name', label, true);
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.source.addFeature(f);
      this.parseCogLine(id, target);
    }
  }

  // build target style
  buildVesselStyle(target: SKVessel, label?: string, setStale = false): Style {
    let s: Style;
    const isMoored = target.state === 'moored';

    const shipClass = target.type.id
      ? Math.abs(Math.floor(target.type.id / 10) * 10)
      : -1;

    // Get vessel dimensions
    const vesselLength = target.design?.length ?? null;
    const vesselBeam = target.design?.beam ?? null;

    // Check L/B ratio is within realistic bounds (2:1 to 12:1)
    const hasValidDimensions = isValidLBRatio(vesselLength, vesselBeam);

    // Check if we should draw to scale (requires valid L/B ratio)
    if (this.scaleToSize && this.mapResolution && hasValidDimensions && !isMoored) {
      // Get color based on ship type/status
      let colorKey: string | number = 'default';
      if (target.id === this.focusId) {
        colorKey = 'focused';
      } else if (setStale) {
        colorKey = 'inactive';
      } else if (target.buddy) {
        colorKey = 'buddy';
      } else if (shipClass !== -1 && AIS_COLORS[shipClass]) {
        colorKey = shipClass;
      }
      
      const colors = AIS_COLORS[colorKey] || AIS_COLORS['default'];
      const boatIcon = createBoatShapeIcon(
        vesselLength,
        vesselBeam,
        this.mapResolution,
        colors.fill,
        colors.stroke
      );
      
      return new Style({
        image: boatIcon,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: 22
        })
      });
    }

    // Fallback: use icon with optional scaling (only if L/B ratio is valid)
    let calculatedScale: number | null = null;
    if (this.scaleToSize && this.mapResolution && hasValidDimensions) {
      // Icon is 24pt (32px) but actual vessel shape is smaller
      // Effective vessel length in icon is ~25.5 pixels
      const EFFECTIVE_ICON_LENGTH = 25.5;
      calculatedScale = vesselLength! / (this.mapResolution * EFFECTIVE_ICON_LENGTH);
      // Clamp scale to reasonable bounds
      calculatedScale = Math.max(0.1, Math.min(calculatedScale, 50));
    }

    // Helper to check if image is an Icon (has getSrc method)
    const isIconImage = (img: any): img is Icon => {
      return img && typeof img.getSrc === 'function';
    };

    // Helper to create scaled icon from an existing icon
    const createScaledIcon = (baseIcon: Icon, scale: number): Icon => {
      return new Icon({
        src: baseIcon.getSrc(),
        scale: scale,
        anchor: baseIcon.getAnchor(),
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        rotateWithView: true,
        rotation: baseIcon.getRotation()
      });
    };

    // Get base icon from registry
    const icon = this.mapImages.getVessel(
      target.id === this.focusId
        ? 'focused'
        : setStale
          ? 'inactive'
          : target.buddy
            ? 'buddy'
            : shipClass === -1
              ? 'default'
              : shipClass,
      isMoored
    );

    if (icon && typeof this.targetStyles === 'undefined') {
      const image = calculatedScale !== null && isIconImage(icon)
        ? createScaledIcon(icon, calculatedScale)
        : icon;
      return new Style({
        image: image,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: isMoored ? 12 : 22
        })
      });
    }

    if (typeof this.targetStyles !== 'undefined') {
      if (target.id === this.focusId && this.targetStyles.focus) {
        s = this.targetStyles.focus;
      } else if (setStale) {
        s = this.targetStyles.inactive ?? this.targetStyles.default;
      } else if (target.type && this.targetStyles[shipClass]) {
        if (target.state && this.targetStyles[shipClass][target.state]) {
          s = this.targetStyles[shipClass][target.state];
        } else {
          s = this.targetStyles[shipClass]['default'];
        }
      } else if (target.buddy && this.targetStyles.buddy) {
        s = this.targetStyles.buddy;
      } else {
        if (target.state && this.targetStyles[target.state]) {
          s = this.targetStyles[target.state];
        } else {
          s = this.targetStyles.default;
        }
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      s = this.layerProperties.style;
    } else {
      // Fallback styles using RegularShape
      if (target.id === this.focusId) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: 'black', width: 1 }),
            rotateWithView: true
          })
        });
      } else if (setStale) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'orange' }),
            stroke: new Stroke({ color: 'black', width: 1 }),
            rotateWithView: true
          })
        });
      } else {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'magenta' }),
            stroke: new Stroke({ color: 'black', width: 1 }),
            rotateWithView: true
          })
        });
      }
    }

    // Apply scale-to-size to the selected style's image
    if (calculatedScale !== null && s) {
      const currentImage = s.getImage();
      if (isIconImage(currentImage)) {
        s = s.clone();
        s.setImage(createScaledIcon(currentImage, calculatedScale));
      }
    }

    return s;
  }

  // add update COG vector
  parseCogLine(id: string, target: SKVessel) {
    if (!this.source || !target.vectors.cog) {
      return;
    }

    let cf = this.source.getFeatureById('cog-' + id) as Feature;
    if (
      !this.okToRenderCogLines ||
      !this.okToRenderTarget(id) ||
      !target.position
    ) {
      if (cf) {
        this.source.removeFeature(cf);
      }
      return;
    }

    if (cf) {
      // update vector
      cf.setGeometry(new LineString(fromLonLatArray(target.vectors.cog)));
      cf.setStyle(this.buildCogLineStyle(id, cf));
    } else {
      // create vector
      cf = new Feature(new LineString(fromLonLatArray(target.vectors.cog)));
      cf.setId('cog-' + id);
      cf.setStyle(this.buildCogLineStyle(id, cf));
      this.source.addFeature(cf);
    }
  }

  // show / hide cog vector
  toggleCogLines(show: boolean) {
    if (show) {
      this.targets.forEach((v: SKVessel, k) => {
        this.parseCogLine(k, v);
      });
    } else {
      this.source.forEachFeature((cl: Feature<LineString>) => {
        if ((cl.getId() as string).includes('cog-')) {
          this.source.removeFeature(cl);
        }
      });
    }
  }

  // build COG vector style
  buildCogLineStyle(id: string, feature: Feature) {
    const opacity =
      this.okToRenderTarget(id) && this.okToRenderCogLines() ? 0.7 : 0;
    const geometry = feature.getGeometry() as LineString;
    const color = `rgba(0,0,0, ${opacity})`;
    const styles = [];
    styles.push(
      new Style({
        stroke: new Stroke({
          color: color,
          width: 1,
          lineDash: [5, 5]
        })
      })
    );
    geometry.forEachSegment((start: Coordinate, end: Coordinate) => {
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 2,
            stroke: new Stroke({
              color: color,
              width: 1
            }),
            fill: new Fill({ color: 'transparent' })
          })
        })
      );
    });
    return styles;
  }

  // ok to show cog lines
  okToRenderCogLines() {
    return this.cogLineLength !== 0 && this.mapZoom >= this.labelMinZoom;
  }
}
