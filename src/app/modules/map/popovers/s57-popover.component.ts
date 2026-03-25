import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PopoverComponent } from './popover.component';
import { AppFacade } from 'src/app/app.facade';

// S-57 object class readable names
const S57_NAMES: { [key: string]: string } = {
  SOUNDG: 'Sounding',
  DEPCNT: 'Depth Contour',
  OBSTRN: 'Obstruction',
  UWTROC: 'Underwater Rock',
  WRECKS: 'Wreck',
  LIGHTS: 'Light',
  BOYLAT: 'Lateral Buoy',
  BOYCAR: 'Cardinal Buoy',
  BOYISD: 'Isolated Danger Buoy',
  BOYSAW: 'Safe Water Buoy',
  BOYSPP: 'Special Purpose Buoy',
  BCNLAT: 'Lateral Beacon',
  BCNCAR: 'Cardinal Beacon',
  BCNISD: 'Isolated Danger Beacon',
  BCNSAW: 'Safe Water Beacon',
  BCNSPP: 'Special Purpose Beacon',
  LNDMRK: 'Landmark',
  SLCONS: 'Shoreline Construction',
  RESARE: 'Restricted Area',
  ACHARE: 'Anchorage Area',
  CBLSUB: 'Submarine Cable',
  PIPSOL: 'Submarine Pipeline',
  BERTHS: 'Berth',
  MORFAC: 'Mooring Facility',
  DISMAR: 'Distance Mark',
  CURENT: 'Current',
  TOPMAR: 'Top Mark',
  RTPBCN: 'Radar Transponder Beacon',
  RDOSTA: 'Radio Station',
  RADSTA: 'Radar Station',
  FOGSIG: 'Fog Signal',
  PILBOP: 'Pilot Boarding Place',
  CGUSTA: 'Coast Guard Station',
  RSCSTA: 'Rescue Station',
  SISTAT: 'Signal Station',
  SISTAW: 'Signal Station Warning',
  HRBFAC: 'Harbour Facility',
  SMCFAC: 'Small Craft Facility',
  CRANES: 'Crane',
  GATCON: 'Gate',
  BRIDGE: 'Bridge',
  CONVYR: 'Conveyor',
  PIPOHD: 'Overhead Pipeline',
  CBLOHD: 'Overhead Cable',
  OFSPLF: 'Offshore Platform',
  LITFLT: 'Light Float',
  LITVES: 'Light Vessel',
  FSHFAC: 'Fishing Facility'
};

// S-57 layers that are clickable discrete objects (not area fills)
export const S57_CLICKABLE_LAYERS = new Set([
  // Navaids
  'LIGHTS', 'BOYLAT', 'BOYCAR', 'BOYISD', 'BOYSAW', 'BOYSPP',
  'BCNLAT', 'BCNCAR', 'BCNISD', 'BCNSAW', 'BCNSPP', 'TOPMAR',
  'RTPBCN', 'RDOSTA', 'RADSTA', 'FOGSIG', 'LITFLT', 'LITVES',
  // Hazards
  'OBSTRN', 'UWTROC', 'WRECKS',
  // 'SOUNDG', // too dense — depth values already shown as labels on chart
  // Landmarks & structures
  'LNDMRK', 'SLCONS', 'BRIDGE', 'OFSPLF', 'PILBOP',
  'CRANES', 'GATCON', 'MORFAC', 'BERTHS', 'HRBFAC', 'SMCFAC',
  // Cables & pipes
  'CBLSUB', 'CBLOHD', 'PIPSOL', 'PIPOHD',
  // Services
  'CGUSTA', 'RSCSTA', 'SISTAT', 'SISTAW',
  // Other discrete
  'DISMAR', 'CURENT', 'FSHFAC', 'CONVYR',
  // Restricted areas (line/point features)
  'RESARE', 'ACHARE'
]);

// S-57 attribute value decodings
const COLOUR_CODES: { [key: string]: string } = {
  '1': 'White', '2': 'Black', '3': 'Red', '4': 'Green',
  '5': 'Blue', '6': 'Yellow', '7': 'Grey', '8': 'Brown',
  '9': 'Amber', '10': 'Violet', '11': 'Orange', '12': 'Magenta',
  '13': 'Pink'
};

const WATLEV_CODES: { [key: string]: string } = {
  '1': 'Partly submerged', '2': 'Always dry', '3': 'Always under water',
  '4': 'Covers and uncovers', '5': 'Awash', '6': 'Subject to flooding',
  '7': 'Floating'
};

const CATOBS_CODES: { [key: string]: string } = {
  '1': 'Snag/stump', '2': 'Wellhead', '3': 'Diffuser',
  '4': 'Crib', '5': 'Fish haven', '6': 'Foul area',
  '7': 'Foul ground', '8': 'Ice boom', '9': 'Ground tackle',
  '10': 'Boom'
};

const CATWRK_CODES: { [key: string]: string } = {
  '1': 'Non-dangerous', '2': 'Dangerous', '3': 'Distributed remains',
  '4': 'Mast showing', '5': 'Hull showing'
};

const BOYSHP_CODES: { [key: string]: string } = {
  '1': 'Conical (nun)', '2': 'Can (cylindrical)', '3': 'Spherical',
  '4': 'Pillar', '5': 'Spar', '6': 'Barrel', '7': 'Super-buoy',
  '8': 'Ice buoy'
};

const BCNSHP_CODES: { [key: string]: string } = {
  '1': 'Stake/pole', '2': 'Withy', '3': 'Tower', '4': 'Lattice',
  '5': 'Pile', '6': 'Cairn', '7': 'Buoyant'
};

const CATLAM_CODES: { [key: string]: string } = {
  '1': 'Port', '2': 'Starboard', '3': 'Preferred channel starboard',
  '4': 'Preferred channel port'
};

const CATLIT_CODES: { [key: string]: string } = {
  '1': 'Directional', '4': 'Leading', '5': 'Aero',
  '6': 'Air obstruction', '7': 'Fog detector', '8': 'Flood',
  '9': 'Strip', '10': 'Subsidiary', '11': 'Spotlight',
  '12': 'Front', '13': 'Rear', '14': 'Lower', '15': 'Upper'
};

const LITCHR_CODES: { [key: string]: string } = {
  '1': 'Fixed', '2': 'Flashing', '3': 'Long flashing',
  '4': 'Quick flashing', '5': 'Very quick flashing',
  '6': 'Ultra quick flashing', '7': 'Isophase', '8': 'Occulting',
  '9': 'Interrupted quick', '10': 'Interrupted very quick',
  '11': 'Morse code', '12': 'Fixed/flashing',
  '25': 'Quick + long flash', '26': 'VQ + long flash',
  '27': 'UQ + long flash', '28': 'Alternating',
  '29': 'Fixed & alternating flashing'
};

const CONDTN_CODES: { [key: string]: string } = {
  '1': 'Under construction', '2': 'Ruined', '3': 'Under reclamation',
  '5': 'Planned'
};

const STATUS_CODES: { [key: string]: string } = {
  '1': 'Permanent', '2': 'Occasional', '3': 'Recommended',
  '4': 'Not in use', '5': 'Intermittent', '6': 'Reserved',
  '7': 'Temporary', '8': 'Private', '9': 'Mandatory',
  '11': 'Extinguished', '12': 'Illuminated', '13': 'Historic',
  '14': 'Public', '15': 'Synchronized', '16': 'Watched',
  '17': 'Un-watched', '18': 'Doubtful'
};

const RESTRN_CODES: { [key: string]: string } = {
  '1': 'Anchoring prohibited', '2': 'Anchoring restricted',
  '3': 'Fishing prohibited', '4': 'Fishing restricted',
  '5': 'Trawling prohibited', '6': 'Trawling restricted',
  '7': 'Entry prohibited', '8': 'Entry restricted',
  '9': 'Dredging prohibited', '10': 'Dredging restricted',
  '11': 'Diving prohibited', '12': 'Diving restricted',
  '13': 'No wake', '14': 'Area to be avoided',
  '27': 'Speed restricted'
};

const COLPAT_CODES: { [key: string]: string } = {
  '1': 'Horizontal stripes', '2': 'Vertical stripes',
  '3': 'Diagonal stripes', '4': 'Squared',
  '5': 'Border stripes', '6': 'Single colour'
};

const TOPSHP_CODES: { [key: string]: string } = {
  '1': 'Cone, point up', '2': 'Cone, point down',
  '3': 'Sphere', '4': 'Two spheres', '5': 'Cylinder',
  '6': 'Board', '7': 'X-shape', '8': 'Upright cross',
  '9': 'Cube, point up', '10': 'Two cones point to point',
  '11': 'Two cones base to base', '12': 'Rhombus',
  '13': 'Two cones point up', '14': 'Two cones point down',
  '33': 'Flag'
};

const CATCAM_CODES: { [key: string]: string } = {
  '1': 'North', '2': 'East', '3': 'South', '4': 'West'
};

const CATSPM_CODES: { [key: string]: string } = {
  '1': 'Firing danger area', '2': 'Target', '3': 'Marker ship',
  '4': 'Degaussing range', '5': 'Barge', '6': 'Cable',
  '7': 'Spoil ground', '8': 'Outfall', '9': 'ODAS',
  '10': 'Recording', '11': 'Seaplane anchorage', '12': 'Recreation zone',
  '13': 'Private', '14': 'Mooring', '15': 'LANBY',
  '16': 'Leading', '17': 'Measured distance', '18': 'Notice',
  '19': 'TSS', '20': 'No anchoring', '21': 'No berthing',
  '22': 'No overtaking', '23': 'No two-way traffic',
  '24': 'Reduced wake', '25': 'Speed limit',
  '26': 'Stop', '27': 'Warning', '28': 'Sound ship siren',
  '39': 'Environmental', '45': 'AIS', '51': 'No entry'
};

// Map attribute codes to their decode tables
const DECODE_TABLES: { [key: string]: { [key: string]: string } } = {
  COLOUR: COLOUR_CODES,
  WATLEV: WATLEV_CODES,
  CATOBS: CATOBS_CODES,
  CATWRK: CATWRK_CODES,
  BOYSHP: BOYSHP_CODES,
  BCNSHP: BCNSHP_CODES,
  CATLAM: CATLAM_CODES,
  CATLIT: CATLIT_CODES,
  LITCHR: LITCHR_CODES,
  CONDTN: CONDTN_CODES,
  STATUS: STATUS_CODES,
  RESTRN: RESTRN_CODES,
  COLPAT: COLPAT_CODES,
  TOPSHP: TOPSHP_CODES,
  CATCAM: CATCAM_CODES,
  CATSPM: CATSPM_CODES
};

// Properties to show and their display order/labels
const PROP_DISPLAY: { key: string; label: string }[] = [
  { key: 'OBJNAM', label: 'Name' },
  { key: 'NOBJNM', label: 'Local Name' },
  { key: 'INFORM', label: 'Information' },
  { key: 'NINFOM', label: 'Note' },
  // Depth/sounding
  { key: 'DEPTH', label: 'Depth' },
  { key: 'VALSOU', label: 'Depth' },
  { key: 'DRVAL1', label: 'Min Depth' },
  { key: 'DRVAL2', label: 'Max Depth' },
  { key: 'VALDCO', label: 'Contour Depth' },
  // Hazard details
  { key: 'CATWRK', label: 'Type' },
  { key: 'CATOBS', label: 'Type' },
  { key: 'WATLEV', label: 'Water Level' },
  // Navaid details
  { key: 'CATLAM', label: 'Lateral' },
  { key: 'CATCAM', label: 'Cardinal' },
  { key: 'CATSPM', label: 'Purpose' },
  { key: 'BOYSHP', label: 'Shape' },
  { key: 'BCNSHP', label: 'Shape' },
  { key: 'TOPSHP', label: 'Top Mark' },
  { key: 'COLOUR', label: 'Colour' },
  { key: 'COLPAT', label: 'Pattern' },
  // Light details
  { key: 'LITCHR', label: 'Character' },
  { key: 'CATLIT', label: 'Category' },
  { key: 'SIGPER', label: 'Period' },
  { key: 'VALNMR', label: 'Range' },
  { key: 'HEIGHT', label: 'Height' },
  // Restrictions
  { key: 'RESTRN', label: 'Restriction' },
  // Physical
  { key: 'CONDTN', label: 'Condition' },
  { key: 'STATUS', label: 'Status' },
  { key: 'CONRAD', label: 'Radar Conspicuous' },
  { key: 'CONVIS', label: 'Visually Conspicuous' },
  { key: 'VERLEN', label: 'Vertical Clearance' },
  { key: 'HORLEN', label: 'Length' },
  { key: 'HORWID', label: 'Width' }
];

function decodeValue(key: string, val: unknown): string {
  const s = String(val);
  const table = DECODE_TABLES[key];
  if (!table) {
    return s;
  }
  // Handle comma-separated multi-values (e.g. COLOUR "1,3")
  const parts = s.split(',');
  const decoded = parts.map((p) => table[p.trim()] || p.trim());
  return decoded.join(', ');
}

const DEPTH_KEYS = new Set(['DEPTH', 'VALSOU', 'DRVAL1', 'DRVAL2', 'VALDCO']);
const HEIGHT_KEYS = new Set(['HEIGHT', 'VERLEN', 'HORLEN', 'HORWID']);

@Component({
  selector: 's57-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    PopoverComponent
  ],
  template: `
    <ap-popover [title]="_title" [canClose]="canClose" (closed)="handleClose()">
      @for (prop of displayProps; track prop.key) {
        <div style="display:flex; padding: 2px 0;">
          <div style="font-weight:bold; min-width: 100px;">{{ prop.label }}:</div>
          <div style="flex: 1 1 auto; text-align: right;">{{ prop.value }}</div>
        </div>
      }
      @if (displayProps.length === 0) {
        <div style="color: #888;">No details available</div>
      }
    </ap-popover>
  `
})
export class S57PopoverComponent {
  @Input() title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() properties: { [key: string]: any };
  @Input() canClose: boolean;
  @Output() closed: EventEmitter<void> = new EventEmitter();

  private app = inject(AppFacade);
  _title: string;
  displayProps: { key: string; label: string; value: string }[] = [];

  private formatValue(key: string, val: unknown): string {
    if (DEPTH_KEYS.has(key)) {
      const n = parseFloat(String(val));
      if (isNaN(n)) return String(val);
      return this.app.formatValueForDisplay(n, 'm', true);
    }
    if (HEIGHT_KEYS.has(key)) {
      const n = parseFloat(String(val));
      if (isNaN(n)) return String(val);
      return this.app.formatValueForDisplay(n, 'm', true);
    }
    if (key === 'SIGPER') {
      const n = parseFloat(String(val));
      return isNaN(n) ? String(val) : n + 's';
    }
    if (key === 'VALNMR') {
      const n = parseFloat(String(val));
      return isNaN(n) ? String(val) : n + ' NM';
    }
    if (key === 'CONRAD' || key === 'CONVIS') {
      return val === 1 || val === '1' ? 'Yes' : 'No';
    }
    return decodeValue(key, val);
  }

  ngOnChanges() {
    if (!this.properties) {
      return;
    }
    const layer = this.properties['layer'] || '';
    this._title = this.title || S57_NAMES[layer] || layer || 'Chart Feature';

    this.displayProps = [];
    for (const prop of PROP_DISPLAY) {
      const val = this.properties[prop.key];
      if (val === undefined || val === null || val === '') {
        continue;
      }
      this.displayProps.push({
        key: prop.key,
        label: prop.label,
        value: this.formatValue(prop.key, val)
      });
    }
  }

  handleClose() {
    this.closed.emit();
  }
}
