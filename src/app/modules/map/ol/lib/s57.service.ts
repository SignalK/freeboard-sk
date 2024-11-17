import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Feature } from 'ol';
import { Subject } from 'rxjs';
import * as xml2js from 'xml2js';
import { Style } from 'ol/style';

interface Symbol {
  image: HTMLImageElement;
  width: number;
  height: number;
  originX: number;
  originY: number;
  pivotX: number;
  pivotY: number;
  locationX: number;
  locationY: number;
}

export interface Lookup {
  name: string;
  geometryType: GeometryType;
  lookupTable: LookupTable;
  instruction: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any;
  id: number;
  displayPriority: DisplayPriority;
  displayCategory: DisplayCategory;
}

export interface Options {
  shallowDepth: number;
  safetyDepth: number;
  deepDepth: number;
  graphicsStyle: string;
  boundaries: string;
  colors: number;
}

export const DefaultOptions: Options = {
  shallowDepth: 2,
  safetyDepth: 3,
  deepDepth: 6,
  graphicsStyle: 'Paper', //Simplified or Paper
  boundaries: 'Plain', // Plain or Symbolized
  colors: 4 // 2 or 4
};

interface ColorTable {
  symbolfile: string;
  colors: Map<string, string>;
}

enum GeometryType {
  POINT = 0,
  LINES = 1,
  AREA = 2
}

export enum DisplayPriority {
  PRIO_NODATA = 0, // no data fill area pattern
  PRIO_GROUP1 = 1, // S57 group 1 filled areas
  PRIO_AREA_1 = 2, // superimposed areas
  PRIO_AREA_2 = 3, // superimposed areas also water features
  PRIO_SYMB_POINT = 4, // point symbol also land features
  PRIO_SYMB_LINE = 5, // line symbol also restricted areas
  PRIO_SYMB_AREA = 6, // area symbol also traffic areas
  PRIO_ROUTEING = 7, // routeing lines
  PRIO_HAZARDS = 8, // hazards
  PRIO_MARINERS = 9 // VRM, EBL, own ship
}

export enum DisplayCategory {
  DISPLAYBASE = 0, //
  STANDARD = 1, //
  OTHER = 2, // O for OTHER
  MARINERS_STANDARD = 3, // Mariner specified
  MARINERS_OTHER = 4, // value not defined
  DISP_CAT_NUM = 5 // value not defined
}

enum LookupTable {
  SIMPLIFIED = 0,
  PAPER_CHART = 1,
  LINES = 2,
  PLAIN = 3,
  SYMBOLIZED = 4
}

@Injectable({
  providedIn: 'root'
})
export class S57Service {
  private chartSymbols: Map<string, Symbol> = new Map<string, Symbol>();
  private colorTables: ColorTable[] = [];
  private selectedColorTable = 0;
  private chartSymbolsImage: HTMLImageElement;
  private lookups: Lookup[] = [];
  private lookupStartIndex: Map<string, number> = new Map<string, number>();
  private styles: Map<string, Style> = new Map<string, Style>();
  public refresh: Subject<void> = new Subject<void>();

  //options

  public options: Options = DefaultOptions;

  private attMatch = new RegExp('([A-Za-z0-9]{6})([0-9,\\?]*)');

  constructor(private http: HttpClient) {
    http
      .get('assets/s57/chartsymbols.xml', { responseType: 'text' })
      .subscribe((symbolsXml) => {
        const parser = new xml2js.Parser({ strict: false, trim: true });
        parser.parseString(symbolsXml, (err, symbolsJs) => {
          this.processSymbols(symbolsJs);
          this.processLookup(symbolsJs);
          this.processColors(symbolsJs);
        });

        this.refresh.next();
        const image = new Image();
        image.onload = () => {
          this.chartSymbolsImage = image;
          this.refresh.next();
        };
        image.src =
          'assets/s57/' + this.colorTables[this.selectedColorTable].symbolfile;
      });
  }

  public getStyle(key: string): Style {
    return this.styles[key];
  }

  public setStyle(key: string, style: Style) {
    this.styles[key] = style;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isChanged(currentValue: any, newValue: any): boolean {
    let changed = false;
    const keys = Object.keys(newValue);
    for (let i = 0; i < keys.length; i++) {
      if (currentValue[keys[i]] !== newValue[keys[i]]) {
        changed = true;
        break;
      }
    }
    return changed;
  }

  public SetOptions(options: Options) {
    if (this.isChanged(this.options, options)) {
      this.options = Object.assign({}, options);
      this.refresh.next();
    }
  }

  public getLookup(lookupIndex: number): Lookup {
    return this.lookups[lookupIndex];
  }

  public getColor(colorName: string): string {
    return this.colorTables[this.selectedColorTable].colors.get(colorName);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processColors(symbolsJson: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (
      symbolsJson['CHARTSYMBOLS']['COLOR-TABLES'][0]['COLOR-TABLE'] as any[]
    ).forEach((colortable) => {
      const colorTable: ColorTable = {
        symbolfile: colortable['GRAPHICS-FILE'][0]['$']['NAME'],
        colors: new Map<string, string>()
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colors = colortable['COLOR'] as any[];
      colors.forEach((color) => {
        colorTable.colors.set(
          color['$']['NAME'],
          'RGBA(' +
            color['$']['R'] +
            ', ' +
            color['$']['G'] +
            ', ' +
            color['$']['B'] +
            ',1)'
        );
      });
      this.colorTables.push(colorTable);
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processSymbols(symbolsJson: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (symbolsJson['CHARTSYMBOLS']['SYMBOLS'][0]['SYMBOL'] as any[]).forEach(
      (symbol) => {
        const bitmap = symbol['BITMAP'];
        if (bitmap) {
          this.chartSymbols.set(symbol['NAME'][0], {
            image: null,
            pivotX: parseInt(bitmap[0]['PIVOT'][0]['$']['X']),
            pivotY: parseInt(bitmap[0]['PIVOT'][0]['$']['Y']),
            originX: parseInt(bitmap[0]['ORIGIN'][0]['$']['X']),
            originY: parseInt(bitmap[0]['ORIGIN'][0]['$']['Y']),
            width: parseInt(bitmap[0]['$']['WIDTH']),
            height: parseInt(bitmap[0]['$']['HEIGHT']),
            locationX: parseInt(bitmap[0]['GRAPHICS-LOCATION'][0]['$']['X']),
            locationY: parseInt(bitmap[0]['GRAPHICS-LOCATION'][0]['$']['Y'])
          });
        }
      }
    );
  }

  private compareLookup(a: Lookup, b: Lookup): number {
    const lt = a.lookupTable - b.lookupTable;
    if (lt !== 0) return lt;
    const ir = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    if (ir !== 0) return ir;
    const c1 = Object.keys(a.attributes).length;
    const c2 = Object.keys(a.attributes).length;
    if (c1 !== c2) return c2 - c1;
    return a.id - b.id;
  }

  private getGeometryType(type: string): GeometryType {
    switch (type) {
      case 'Line':
        return GeometryType.LINES;
        break;
      case 'Area':
        return GeometryType.AREA;
        break;
      default:
        return GeometryType.POINT;
    }
  }

  private getLookupTable(table: string): LookupTable {
    switch (table) {
      case 'Simplified':
        return LookupTable.SIMPLIFIED;
        break;
      case 'Paper':
        return LookupTable.PAPER_CHART;
        break;
      case 'Lines':
        return LookupTable.LINES;
        break;
      case 'Plain':
        return LookupTable.PLAIN;
        break;
      default:
        return LookupTable.SYMBOLIZED;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processLookup(symbolsJson: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (symbolsJson['CHARTSYMBOLS']['LOOKUPS'][0]['LOOKUP'] as any[]).forEach(
      (lookup) => {
        const lup: Lookup = {
          name: lookup['$']['NAME'],
          instruction: lookup['INSTRUCTION'][0],
          lookupTable: this.getLookupTable(lookup['TABLE-NAME'][0]),
          geometryType: this.getGeometryType(lookup['TYPE'][0]),
          displayCategory: this.getDisplayCategory(lookup['DISPLAY-CAT'][0]),
          attributes: {},
          id: parseInt(lookup['$']['ID']),
          displayPriority: this.getDisplayPriority(lookup['DISP-PRIO'][0])
        };
        const attributes = lookup['ATTRIB-CODE'];
        if (attributes) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (attributes as any[]).forEach((att) => {
            lup.attributes[att['$']['INDEX']] = att['_'];
          });
        }
        this.lookups.push(lup);
      }
    );
    // sort
    this.lookups = this.lookups.sort(this.compareLookup);
    // build index
    let lastkey = '';
    this.lookups.forEach((lup, index) => {
      const key =
        lup.lookupTable + ',' + lup.name.toUpperCase() + ',' + lup.geometryType;
      if (key !== lastkey) {
        this.lookupStartIndex.set(key, index);
        lastkey = key;
      }
    });
  }

  public getSymbol(key: string): Symbol {
    const icon = this.chartSymbols.get(key);
    if (icon && this.chartSymbolsImage) {
      if (!icon.image) {
        icon.image = new Image(icon.width, icon.height);
        createImageBitmap(
          this.chartSymbolsImage,
          icon.locationX,
          icon.locationY,
          icon.width,
          icon.height
        ).then((bitmap) => {
          const canvas = document.createElement('CANVAS') as HTMLCanvasElement;
          canvas.height = icon.height;
          canvas.width = icon.width;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          icon.image.src = canvas.toDataURL();
          //this.refresh.next()
        });
        return icon;
      } else {
        return icon;
      }
    } else {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private propertyCompare(a: any, b: string): number {
    const t = typeof a;
    let b1: number;
    switch (t) {
      case 'number':
        b1 = parseInt(b);
        return a - b1;
      case 'string':
        return (a as string).localeCompare(b);
      default:
        return -1;
    }
  }

  public selectLookup(feature: Feature): number {
    const props = feature.getProperties();
    const properties = {};
    Object.keys(props).forEach((k) => {
      properties[k.toUpperCase()] = props[k];
    });

    const geometry = feature.getGeometry();
    const name = properties['LAYER'];
    const geomType = geometry.getType();

    let lookupTable = LookupTable.PAPER_CHART;
    let type = GeometryType.POINT;
    if (geomType === 'Polygon') {
      type = GeometryType.AREA;
    } else if (geomType === 'LineString') {
      type = GeometryType.LINES;
    }
    switch (type) {
      case GeometryType.POINT:
        {
          if (this.options.graphicsStyle === 'Paper') {
            lookupTable = LookupTable.PAPER_CHART;
          } else {
            lookupTable = LookupTable.SIMPLIFIED;
          }
        }
        break;
      case GeometryType.LINES:
        lookupTable = LookupTable.LINES;
        break;
      case GeometryType.AREA:
        {
          if (this.options.boundaries === 'Plain') {
            lookupTable = LookupTable.PLAIN;
          } else {
            lookupTable = LookupTable.SYMBOLIZED;
          }
        }
        break;
    }

    let best = -1;

    const startIndex = this.lookupStartIndex.get(
      lookupTable + ',' + name.toUpperCase() + ',' + type
    );
    let currentIndex = startIndex;
    if (currentIndex) {
      let lup = this.lookups[currentIndex];
      let lmatch = 0;
      while (
        lup.name.localeCompare(name, 'en', { sensitivity: 'base' }) === 0 &&
        lup.geometryType === type &&
        lup.lookupTable === lookupTable
      ) {
        let nmatch = 0;
        Object.keys(lup.attributes).forEach((k) => {
          const v = lup.attributes[k];
          const parts = this.attMatch.exec(v);
          const key = parts[1].toUpperCase();
          const value = parts[2].toUpperCase();
          if (value === ' ') {
            nmatch++;
            return;
          }
          if (value === '?') return;
          if (this.propertyCompare(properties[key], value) === 0) {
            nmatch++;
          }
        });
        // According to S52 specs, match must be perfect,
        // and the first 100% match is selected
        if (Object.keys(lup.attributes).length === nmatch && nmatch > lmatch) {
          best = currentIndex;
          lmatch = nmatch;
        }
        currentIndex++;
        lup = this.lookups[currentIndex];
      }
      // If no match found, return the first LUP in the list which has no attributes
      if (best === -1) {
        let currentIndex = startIndex;
        let lup = this.lookups[currentIndex];
        while (
          lup.name.localeCompare(name, 'en', { sensitivity: 'base' }) === 0 &&
          lup.geometryType === type &&
          lup.lookupTable === lookupTable
        ) {
          if (Object.keys(lup.attributes).length === 0) {
            best = currentIndex;
            break;
          }
          currentIndex++;
          lup = this.lookups[currentIndex];
        }
      }
      return best;
    }
    return -1;
  }

  private getDisplayCategory(dispCategory: string): DisplayCategory {
    switch (dispCategory) {
      case 'Displaybase':
        return DisplayCategory.DISPLAYBASE;
      case 'Standard':
        return DisplayCategory.STANDARD;
      case 'Mariners':
        return DisplayCategory.MARINERS_STANDARD;
      default:
        return DisplayCategory.OTHER;
    }
  }

  private getDisplayPriority(dispPrio: string): DisplayPriority {
    switch (dispPrio) {
      case 'Group 1':
        return DisplayPriority.PRIO_GROUP1;
        break;
      case 'Area 1':
        return DisplayPriority.PRIO_AREA_1;
        break;
      case 'Area 2':
        return DisplayPriority.PRIO_AREA_2;
        break;
      case 'Point Symbol':
        return DisplayPriority.PRIO_SYMB_POINT;
        break;
      case 'Line Symbol':
        return DisplayPriority.PRIO_SYMB_LINE;
        break;
      case 'Area Symbol':
        return DisplayPriority.PRIO_SYMB_AREA;
        break;
      case 'Routing':
        return DisplayPriority.PRIO_ROUTEING;
        break;
      case 'Hazards':
        return DisplayPriority.PRIO_HAZARDS;
        break;
      case 'Mariners':
        return DisplayPriority.PRIO_MARINERS;
        break;
      default:
        return DisplayPriority.PRIO_NODATA;
        break;
    }
  }

  // the interface of this service
}
