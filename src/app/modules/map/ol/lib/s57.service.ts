import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Style, Fill, Stroke, Icon, Text } from 'ol/style';
import { Feature } from 'ol';
import { Subject } from 'rxjs';
import * as xml2js from 'xml2js';
import { Point } from 'ol/geom';

const DRGARE = 46; // Dredged area
const DEPARE = 42; // Depth Area

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

interface Lookup {
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

enum DisplayPriority {
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


enum DisplayCategory {
  DISPLAYBASE = 0,        //
  STANDARD = 1,           //
  OTHER = 2,              // O for OTHER
  MARINERS_STANDARD = 3,  // Mariner specified
  MARINERS_OTHER = 4,     // value not defined
  DISP_CAT_NUM = 5        // value not defined
}

enum LookupTable {
  SIMPLIFIED = 0,
  PAPER_CHART = 1,
  LINES = 2,
  PLAIN = 3,
  SYMBOLIZED = 4
}

const LOOKUPINDEXKEY = '$lupIndex';

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
  public refresh: Subject<void> = new Subject<void>();
  private selectedSafeContour = 1000;

  //options

  private options: Options = DefaultOptions;

  private attMatch = new RegExp('([A-Za-z0-9]{6})([0-9,\\?]*)');
  private instructionMatch = new RegExp('([A-Z][A-Z])\\((.*)\\)');

  constructor(private http: HttpClient) {
    http.get('assets/s57/chartsymbols.xml',{ responseType: "text" }).subscribe((symbolsXml) => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processColors(symbolsJson: any) {
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
            color['$']['G']  +
            ', ' +
            color['$']['B']  +
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
    const ir = a.name.localeCompare(b.name,"en", { sensitivity: "base" });
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
      const key = lup.lookupTable + ',' + lup.name.toUpperCase() + ',' + lup.geometryType;
      if (key !== lastkey) {
        this.lookupStartIndex.set(key, index);
        lastkey = key;
      }
    });
  }

  private getSymbol(key: string): Symbol {
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

  private propertyCompare(a:any, b:string):number {
    let t = typeof a;
    switch(t) {
      case "number":  let b1 = parseInt(b);return a-b1;
      case "string": return (a as string).localeCompare(b);
      default: return -1
    }
  }

  private selectLookup(feature: Feature): number {
    const properties = feature.getProperties();    
    const geometry = feature.getGeometry();
    const name = properties['layer'];
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

    let startIndex = this.lookupStartIndex.get(
      lookupTable + ',' + name.toUpperCase() + ',' + type
    );
    let currentIndex = startIndex;
    if (currentIndex) {
      let lup = this.lookups[currentIndex];
      let lmatch = 0;
      while (
        lup.name.localeCompare(name,"en", { sensitivity: "base" }) === 0 &&
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
          if (this.propertyCompare(properties[key],value) == 0) {
            nmatch++;
          }
        });
        // According to S52 specs, match must be perfect,
        // and the first 100% match is selected
        if (Object.keys(lup.attributes).length == nmatch && nmatch > lmatch) {
          best = currentIndex;
          lmatch = nmatch;
        }
        currentIndex++;
        lup = this.lookups[currentIndex];
      }
      // If no match found, return the first LUP in the list which has no attributes
      if (best==-1) {
        let currentIndex = startIndex;
        let lup = this.lookups[currentIndex];
        while (
          lup.name.localeCompare(name,"en", { sensitivity: "base" }) === 0 &&
          lup.geometryType === type &&
          lup.lookupTable === lookupTable
        ) {
          if(Object.keys(lup.attributes).length==0) {
             best=currentIndex;
             break;
          }
          currentIndex++;
          lup = this.lookups[currentIndex];
        }
      }
      return  best;
    }
    return -1;
  }

  private getSymbolStyle(symbolName: string): Style {
    const symbol = this.getSymbol(symbolName);
    if (symbol) {
      return new Style({
        image: new Icon({
          width: symbol.width,
          height: symbol.height,
          img: symbol.image,
          opacity: 1,
          anchorXUnits: 'pixels',
          anchorYUnits: 'pixels',
          anchor: [symbol.pivotX, symbol.pivotY]
        })
      });
    }
    return null;
  }

  private stripQuotes(text: string): string {
    return text.substring(1).substring(0, text.length - 2);
  }

  //TODO implement more parameters
  private getTextStyle(text: string, params: string[]): Style {
    if (typeof text !== 'string') {
      //debugger;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let textBaseline: any = 'middle';
    let offsetY = 0;
    if (params[1] === '3') {
      textBaseline = 'top';
      offsetY = 15;
    } else if (params[1] === '1') {
      textBaseline = 'bottom';
      offsetY = -15;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let textAlign: any = 'left';
    let offsetX = 15;
    if (params[0] === '2') {
      textAlign = 'right';
      offsetX = -15;
    } else if (params[0] === '1') {
      textAlign = 'center';
      offsetX = 0;
    }

    if (text) {
      let tx = text;
      if (typeof tx !== 'string') {
        tx = text.toString();
      }
      return new Style({
        text: new Text({
          text: tx,
          textAlign: textAlign,
          textBaseline: textBaseline,
          scale: 1.5,
          offsetX: offsetX,
          offsetY: offsetY
        })
      });
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTextStyleTX(featureProperties: any, parameters: string): Style {
    const params = parameters.split(',');
    const text = featureProperties[params[0]];   
    if (!text) {
      return null;
    }
    return this.getTextStyle(text, params.slice(1));
  }

  //TODO format string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTextStyleTE(featureProperties: any, parameters: string): Style {
    const params = parameters.split(',');
    const text = featureProperties[this.stripQuotes(params[1])];   
    const format = this.stripQuotes(params[0]);
    if (!text || !format) {
      return null;
    }
    const formatted = format.replace(/%[0-9]*.?[0-9]*l?[sfd]/, text);
    return this.getTextStyle(formatted, params.slice(2));
  }

  private getDefaultStyle(): Style {
    return new Style({
      fill: new Fill({
        color: 'rgba(#224, 209, 14, 0.8)'
      }),
      stroke: new Stroke({
        color: '#444',
        width: 1
      })
    });
  }

  private getDisplayCategory(dispCategory: string): DisplayCategory {
    switch (dispCategory) {
      case 'Displaybase':
        return DisplayCategory.DISPLAYBASE
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

  private getAreaStyle(colorName: string): Style {
    const color =
      this.colorTables[this.selectedColorTable].colors.get(colorName);
    if (color) {
      return new Style({
        fill: new Fill({
          color: color
        }),
      });
    }
    return null;
  }

  private getLineStyle(params: string): Style {
    const parts = params.split(',');
    const color = this.colorTables[this.selectedColorTable].colors.get(
      parts[2]
    );
    const width = parseInt(parts[1]);
    const lineStyle = parts[0];
    let lineDash = null;
    switch (lineStyle) {
      case 'DASH':
        lineDash = [4, 4];
        break;
      case 'SOLD':
        lineDash = null;
        break;
      default:
        console.debug('Unsupported linestyle:', lineStyle);
    }
    return new Style({
      stroke: new Stroke({
        color: color,
        width: width,
        lineDash: lineDash
      })
    });
  }

  //https://github.com/OpenCPN/OpenCPN/blob/20a781ecc507443e5aaa1d33d0cb91852feb07ee/libs/s52plib/src/s52cnsy.cpp#L5809
  private GetCSTOPMAR01(feature: Feature): string[] {
    let rulestring: string = null;
    const featureProperties = feature.getProperties();
    if (!featureProperties['TOPSHP']) {
      rulestring = 'SY(QUESMRK1)';
    } else {
      let floating = false;
      const layer = featureProperties['layer'];
      if (layer === 'LITFLT' || layer === 'LITVES' || layer.startsWith('BOY')) {
        floating = true;
      }
      const topshp = featureProperties['TOPSHP'];
      if (floating) {
        switch (topshp) {
          case 1:
            rulestring = 'SY(TOPMAR02)';
            break;
          case 2:
            rulestring = 'SY(TOPMAR04)';
            break;
          case 3:
            rulestring = 'SY(TOPMAR10)';
            break;
          case 4:
            rulestring = 'SY(TOPMAR12)';
            break;

          case 5:
            rulestring = 'SY(TOPMAR13)';
            break;
          case 6:
            rulestring = 'SY(TOPMAR14)';
            break;
          case 7:
            rulestring = 'SY(TOPMAR65)';
            break;
          case 8:
            rulestring = 'SY(TOPMAR17)';
            break;

          case 9:
            rulestring = 'SY(TOPMAR16)';
            break;
          case 10:
            rulestring = 'SY(TOPMAR08)';
            break;
          case 11:
            rulestring = 'SY(TOPMAR07)';
            break;
          case 12:
            rulestring = 'SY(TOPMAR14)';
            break;

          case 13:
            rulestring = 'SY(TOPMAR05)';
            break;
          case 14:
            rulestring = 'SY(TOPMAR06)';
            break;
          case 17:
            rulestring = 'SY(TMARDEF2)';
            break;
          case 18:
            rulestring = 'SY(TOPMAR10)';
            break;

          case 19:
            rulestring = 'SY(TOPMAR13)';
            break;
          case 20:
            rulestring = 'SY(TOPMAR14)';
            break;
          case 21:
            rulestring = 'SY(TOPMAR13)';
            break;
          case 22:
            rulestring = 'SY(TOPMAR14)';
            break;

          case 23:
            rulestring = 'SY(TOPMAR14)';
            break;
          case 24:
            rulestring = 'SY(TOPMAR02)';
            break;
          case 25:
            rulestring = 'SY(TOPMAR04)';
            break;
          case 26:
            rulestring = 'SY(TOPMAR10)';
            break;

          case 27:
            rulestring = 'SY(TOPMAR17)';
            break;
          case 28:
            rulestring = 'SY(TOPMAR18)';
            break;
          case 29:
            rulestring = 'SY(TOPMAR02)';
            break;
          case 30:
            rulestring = 'SY(TOPMAR17)';
            break;

          case 31:
            rulestring = 'SY(TOPMAR14)';
            break;
          case 32:
            rulestring = 'SY(TOPMAR10)';
            break;
          case 33:
            rulestring = 'SY(TMARDEF2)';
            break;
          default:
            rulestring = 'SY(TMARDEF2)';
            break;
        }
      } else {
        switch (topshp) {
          case 1:
            rulestring = 'SY(TOPMAR22)';
            break;
          case 2:
            rulestring = 'SY(TOPMAR24)';
            break;
          case 3:
            rulestring = 'SY(TOPMAR30)';
            break;
          case 4:
            rulestring = 'SY(TOPMAR32)';
            break;

          case 5:
            rulestring = 'SY(TOPMAR33)';
            break;
          case 6:
            rulestring = 'SY(TOPMAR34)';
            break;
          case 7:
            rulestring = 'SY(TOPMAR85)';
            break;
          case 8:
            rulestring = 'SY(TOPMAR86)';
            break;

          case 9:
            rulestring = 'SY(TOPMAR36)';
            break;
          case 10:
            rulestring = 'SY(TOPMAR28)';
            break;
          case 11:
            rulestring = 'SY(TOPMAR27)';
            break;
          case 12:
            rulestring = 'SY(TOPMAR14)';
            break;

          case 13:
            rulestring = 'SY(TOPMAR25)';
            break;
          case 14:
            rulestring = 'SY(TOPMAR26)';
            break;
          case 15:
            rulestring = 'SY(TOPMAR88)';
            break;
          case 16:
            rulestring = 'SY(TOPMAR87)';
            break;

          case 17:
            rulestring = 'SY(TMARDEF1)';
            break;
          case 18:
            rulestring = 'SY(TOPMAR30)';
            break;
          case 19:
            rulestring = 'SY(TOPMAR33)';
            break;
          case 20:
            rulestring = 'SY(TOPMAR34)';
            break;

          case 21:
            rulestring = 'SY(TOPMAR33)';
            break;
          case 22:
            rulestring = 'SY(TOPMAR34)';
            break;
          case 23:
            rulestring = 'SY(TOPMAR34)';
            break;
          case 24:
            rulestring = 'SY(TOPMAR22)';
            break;

          case 25:
            rulestring = 'SY(TOPMAR24)';
            break;
          case 26:
            rulestring = 'SY(TOPMAR30)';
            break;
          case 27:
            rulestring = 'SY(TOPMAR86)';
            break;
          case 28:
            rulestring = 'SY(TOPMAR89)';
            break;

          case 29:
            rulestring = 'SY(TOPMAR22)';
            break;
          case 30:
            rulestring = 'SY(TOPMAR86)';
            break;
          case 31:
            rulestring = 'SY(TOPMAR14)';
            break;
          case 32:
            rulestring = 'SY(TOPMAR30)';
            break;
          case 33:
            rulestring = 'SY(TMARDEF1)';
            break;
          default:
            rulestring = 'SY(TMARDEF1)';
            break;
        }
      }
    }

    return rulestring ? [rulestring] : [];
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4494C40-L4494C40
  private GetCSLIGHTS05(feature: Feature): string[] {
    let rulestring: string = null;
    const featureProperties = feature.getProperties();

    if (featureProperties['COLOUR']) {
      const colVals = featureProperties['COLOUR'].split(',') as string[];
      if (colVals.length === 1) {
        if (colVals[0] === '3') {
          rulestring = 'SY(LIGHTS11)';
        } else if (colVals[0] === '4') {
          rulestring = 'SY(LIGHTS12)';
        } else if (
          colVals[0] === '1' ||
          colVals[0] === '6' ||
          colVals[0] === '13'
        ) {
          rulestring = 'SY(LIGHTS13)';
        }
      } else if (colVals.length === 2) {
        if (colVals.includes('1') && colVals.includes('3')) {
          rulestring = 'SY(LIGHTS11)';
        } else if (colVals.includes('1') && colVals.includes('4')) {
          rulestring = 'SY(LIGHTS12)';
        }
      }
    }
    return rulestring ? [rulestring] : [];
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L5597
  private GetSeabed01(drval1: number, drval2: number): string[] {
    let retval: string[] = ['AC(DEPIT)'];

    if (drval1 >= 0 && drval2 > 0) {
      retval = ['AC(DEPVS)'];
    }
    if (this.options.colors === 2) {
      if (
        drval1 >= this.options.safetyDepth &&
        drval2 > this.options.safetyDepth
      ) {
        retval = ['AC(DEPDW)'];
      }
    } else {
      if (
        drval1 >= this.options.shallowDepth &&
        drval2 > this.options.shallowDepth
      ) {
        retval = ['AC(DEPMS)'];
      }
      if (
        drval1 >= this.options.safetyDepth &&
        drval2 > this.options.safetyDepth
      ) {
        retval = ['AC(DEPMD)'];
      }
      if (
        drval1 >= this.options.deepDepth && 
        drval2 > this.options.deepDepth) {
        retval = ['AC(DEPDW)'];
      }
    }    
    // debug
    // retval.push("LS(DASH,1,DEPSC)")

    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4295
  private GetCSDEPCNT02(feature: Feature): string[] {
    let rulestring: string = null;
    const featureProperties = feature.getProperties();
    const geometry = feature.getGeometry();

    //const safe = false;
    let drval1 = 0;
    let depth_value = -1;
    let valdco = 0;
    let quapos = 0;
    let objl = 0;

    if (featureProperties['OBJL']) {
      objl = parseInt(featureProperties['OBJL']);
    }

    if (DEPARE === objl && geometry.getType() === 'LineString') {
      if (featureProperties['DRVAL1']) {
        drval1 = parseFloat(featureProperties['DRVAL1']);
      }
      depth_value = drval1;
    } else {
      if (featureProperties['VALDCO']) {
        valdco = parseFloat(featureProperties['VALDCO']);
        depth_value = valdco;
      }
    }
    if (depth_value < this.options.safetyDepth) {
      return [];
    }

    if (featureProperties['QUAPOS']) {
      quapos = parseFloat(featureProperties['QUAPOS']);
      if (quapos > 2 && quapos < 10) {
        if (depth_value === this.selectedSafeContour) {
          rulestring = 'LS(DASH,2,DEPSC)';
        }
        //  else {
        //   rulestring="LS(DASH,1,DEPCN)"

        // }
      }
    } else {
      if (depth_value === this.selectedSafeContour) {
        rulestring = 'LS(SOLD,2,DEPSC)';
      }
      // else {
      //   rulestring="LS(SOLD,1,DEPCN)"

      // }
    }

    return rulestring ? [rulestring] : [];
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4247
  private getCSDEPARE01(feature: Feature): string[] {
    let retval: string[] = [];

    const featureProperties = feature.getProperties();

    let drval1:number = -1

    const dv1 = parseFloat(featureProperties['DRVAL1']);
    if(!Number.isNaN(dv1)) {
      drval1=dv1
    }

    let drval2:number=drval1+0.01;
    const dv2 = parseFloat(featureProperties['DRVAL2']);
    if(!Number.isNaN(dv2)) {
      drval2=dv2
    }

    retval = this.GetSeabed01(drval1, drval2);

    const objl = featureProperties['OBJL'];
    if (parseInt(objl) === DRGARE) {
      retval.push('AP(DRGARE01)');
      retval.push('LS(DASH,1,CHGRF)');

      //  if (featureProperties["RESTRN"]) {

      //  }
    }

    return retval;
  }

  private evalCS(feature: Feature, instruction: string): string[] {    
    let retval: string[] = [];
    const instrParts = this.instructionMatch.exec(instruction);
    if (instrParts && instrParts.length > 1) {
      switch (instrParts[2]) {
        case 'LIGHTS05':
          retval = this.GetCSLIGHTS05(feature);
          break;
        case 'DEPCNT02':
          retval = this.GetCSDEPCNT02(feature);
          break;
        case 'DEPARE01':
        case 'DEPARE02':
          retval = this.getCSDEPARE01(feature);
          break;
        case 'TOPMAR01':
          retval = this.GetCSTOPMAR01(feature);
          break;
        default:
          console.debug('Unsupported CS:' + instruction);
      }
    }
    return retval;
  }

  private getStylesFromRules(lup: Lookup, feature: Feature): Style[] {
    const styles: Style[] = [];
    if (lup) {
      const properties = feature.getProperties();  

      const instructions = lup.instruction.split(';');      

      //PreProcess CS
      for (let i = 0; i < instructions.length; i++) {
        if (instructions[i].startsWith('CS')) {
          const conditionals = this.evalCS(feature, instructions[i]);
          instructions.splice(i, 1, ...conditionals);
        }
      }
      instructions.forEach((instruction) => {
        const instrParts = this.instructionMatch.exec(instruction);
        if (instrParts && instrParts.length > 1) {
          let style: Style = null;
          switch (instrParts[1]) {
            case 'SY':
              style = this.getSymbolStyle(instrParts[2]);
              break;
            case 'AC':
              style = this.getAreaStyle(instrParts[2]);
              break;
            case 'TX':
              style = this.getTextStyleTX(properties, instrParts[2]);
              break;
            case 'TE':
              style = this.getTextStyleTE(properties, instrParts[2]);
              break;
            case 'LS':
              style = this.getLineStyle(instrParts[2]);
              break;
            default:
              console.debug('Unsupported instruction:' + instruction);
          }
          if (style !== null) {
            styles.push(style);
          }
        }
      });
    }

    return styles;
  }

  private updateSafeContour(feature: Feature): number {
    const properties = feature.getProperties();
    if (properties['DRVAL1']) {
      const drval1 = properties['DRVAL1'];
      if (
        drval1 >= this.options.safetyDepth &&
        drval1 < this.selectedSafeContour
      ) {
        this.selectedSafeContour = drval1;
      }
      return drval1;
    }
    if (properties['VALDCO']) {
      const valdco = properties['VALDCO'];
      if (
        valdco >= this.options.safetyDepth &&
        valdco < this.selectedSafeContour
      ) {
        this.selectedSafeContour = valdco;
      }
      return valdco;
    }
    return 0;
  }


  private layerOrder(feature:Feature):number {
    const properties=feature.getProperties();

    const layer = properties["layer"];
    switch(layer) {
      case "SEAARE":return 1;
      case "DEPARE":return 2;
      case "DEPCNT":return 3;
      case "LNDARE":return 4;
      case "BUAARE":return 6;
      default: return 99;
    }
  }

  // the interface of this service

  public renderOrder = (feature1: Feature, feature2: Feature): number => {
    const l1 = this.layerOrder(feature1);
    const l2 = this.layerOrder(feature2);   
    const o1 = this.updateSafeContour(feature1);
    const o2 = this.updateSafeContour(feature2);
    let lupIndex1 = feature1[LOOKUPINDEXKEY];
    let lupIndex2 = feature1[LOOKUPINDEXKEY];
    if (!lupIndex1) {
      lupIndex1 = this.selectLookup(feature1);
      feature1[LOOKUPINDEXKEY] = lupIndex1;
    }
    if (!lupIndex2) {
      lupIndex2 = this.selectLookup(feature2);
      feature2[LOOKUPINDEXKEY] = lupIndex2;
    }    

    if (l1 !== l2 ) {
      return l1-l2;
    }   

    if (lupIndex1 >= 0 && lupIndex2 >= 0) {
      const c1 = this.lookups[lupIndex1].displayPriority;
      const c2 = this.lookups[lupIndex2].displayPriority;
      if (c1 != c2) {
        return c1-c2;
      }
    }

    if (o1 !== o2) {    
      return o1 - o2;
    }
  
    return 0;
  };
  

  public getStyle = (feature: Feature): Style[] => {    
    const props = feature.getProperties();
    const lupIndex = feature[LOOKUPINDEXKEY];
    if (lupIndex >= 0) {
      const lup = this.lookups[lupIndex];
      // simple feature filter
      if ( lup.displayCategory == DisplayCategory.DISPLAYBASE || lup.displayCategory == DisplayCategory.STANDARD || lup.displayCategory == DisplayCategory.MARINERS_STANDARD||lup.name == "DEPCNT") {
        return this.getStylesFromRules(lup, feature);
      }
    }
    return null;
  };
}
