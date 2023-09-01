import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Style, Fill, Stroke, Icon, Text } from 'ol/style';
import { Feature } from 'ol'
import { Subject } from 'rxjs';

const DRGARE = 46   // Dredged area
const DEPARE = 42   // Depth Area

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
  name: string
  geometryType: GeometryType;
  lookupTable: LookupTable;
  instruction: string;
  attributes: any;
  id: number;
  displayPriority: DisplayPriority;
}

export interface Options {
  shallowDepth: number;
  safetyDepth: number;
  deepDepth: number;
  graphicsStyle: string;
  boundaries: string;
  colors: number;
}

export const DefaultOptions:Options = {
  shallowDepth:2,
  safetyDepth: 3,
  deepDepth: 6,
  graphicsStyle:"Paper", //Simplified or Paper
  boundaries:"Plain", // Plain or Symbolized
  colors:4 // 2 or 4

}


interface ColorTable {
  symbolfile: string;
  colors: Map<string, string>
}

enum GeometryType {
  POINT = 0,
  LINES = 1,
  AREA = 2
}

enum DisplayPriority {
  PRIO_NODATA = 0,      // no data fill area pattern
  PRIO_GROUP1 = 1,      // S57 group 1 filled areas
  PRIO_AREA_1 = 2,      // superimposed areas
  PRIO_AREA_2 = 3,      // superimposed areas also water features
  PRIO_SYMB_POINT = 4,  // point symbol also land features
  PRIO_SYMB_LINE = 5,   // line symbol also restricted areas
  PRIO_SYMB_AREA = 6,   // area symbol also traffic areas
  PRIO_ROUTEING = 7,    // routeing lines
  PRIO_HAZARDS = 8,     // hazards
  PRIO_MARINERS = 9,    // VRM, EBL, own ship
}

enum LookupTable {
  SIMPLIFIED = 0,
  PAPER_CHART = 1,
  LINES = 2,
  PLAIN = 3,
  SYMBOLIZED = 4
}

const LOOKUPINDEXKEY = "$lupIndex"


@Injectable({
  providedIn: 'root'
})
export class S57Service {

  private chartSymbols: Map<string, Symbol> = new Map<string, Symbol>();
  private colorTables: ColorTable[] = [];
  private selectedColorTable: number = 0;
  private chartSymbolsImage: HTMLImageElement;
  private lookups: Lookup[] = [];
  private lookupStartIndex: Map<string, number> = new Map<string, number>();
  public refresh: Subject<void> = new Subject<void>();
  private selectedSafeContour:number = 1000

  //options

  private options:Options = DefaultOptions

  private attMatch = new RegExp('([A-Za-z0-9]{6})([0-9,\\?]*)')
  private instructionMatch = new RegExp('([A-Z][A-Z])\\((.*)\\)')

  constructor(private http: HttpClient) {

    http.get("assets/s57/chartsymbols.json").subscribe((symbolsJson) => {
      this.processSymbols(symbolsJson)
      this.processLookup(symbolsJson)
      this.processColors(symbolsJson)
      this.refresh.next()
      let image = new Image();
      image.onload = () => {
        this.chartSymbolsImage = image;
        this.refresh.next()
      }
      image.src = "assets/s57/" + this.colorTables[this.selectedColorTable].symbolfile
    });
  }

  private isChanged(currentValue:any,newValue:any):boolean {
    let changed = false
    let keys=Object.keys(newValue)
    for (let i = 0; i < keys.length; i++) {
      if(currentValue[keys[i]] != newValue[keys[i]]) {
        changed=true;
        break;
      }
    }
    return changed;
  }

  public SetOptions(options:Options) {

    if(this.isChanged(this.options,options)) {
      this.options =  Object.assign({},options)
      this.refresh.next();  
    }
  }

  private processColors(symbolsJson: any) {
    (symbolsJson["chartsymbols"]["color-tables"]["color-table"] as any[]).forEach((colortable) => {
      let colorTable: ColorTable = { symbolfile: colortable["graphics-file"]["_name"], colors: new Map<string, string>() }
      let colors = colortable["color"] as any[]
      colors.forEach((color) => {
        colorTable.colors.set(color["_name"], "rgba(" + color["_r"] + ", " + color["_g"] + ", " + color["_b"] + ",1)")
      })
      this.colorTables.push(colorTable);
    });
  }

  private processSymbols(symbolsJson: any) {
    (symbolsJson["chartsymbols"]["symbols"]["symbol"] as any[]).forEach((symbol) => {
      let bitmap = symbol["bitmap"]
      if (bitmap) {
        this.chartSymbols.set(symbol["name"], {
          image: null,
          pivotX: parseInt(bitmap["pivot"]["_x"]),
          pivotY: parseInt(bitmap["pivot"]["_y"]),
          originX: parseInt(bitmap["origin"]["_x"]),
          originY: parseInt(bitmap["origin"]["_y"]),
          width: parseInt(bitmap["_width"]),
          height: parseInt(bitmap["_height"]),
          locationX: parseInt(bitmap["graphics-location"]["_x"]),
          locationY: parseInt(bitmap["graphics-location"]["_y"]),
        })
      }
    });
  }


  private compareLookup(a: Lookup, b: Lookup): number {
    let lt = a.lookupTable - b.lookupTable;
    if (lt != 0) return lt
    let ir = a.name.localeCompare(b.name)
    if (ir != 0) return ir
    let c1 = Object.keys(a.attributes).length
    let c2 = Object.keys(a.attributes).length
    if (c1 != c2) return c2 - c1
    return a.id - b.id
  }

  private getGeometryType(type: string): GeometryType {
    switch (type) {
      case "Line": return GeometryType.LINES; break;
      case "Area": return GeometryType.AREA; break;
      default: return GeometryType.POINT;
    }
  }

  private getLookupTable(table: string): LookupTable {
    switch (table) {
      case "Simplified": return LookupTable.SIMPLIFIED; break;
      case "Paper": return LookupTable.PAPER_CHART; break;
      case "Lines": return LookupTable.LINES; break;
      case "Plain": return LookupTable.PLAIN; break;
      default: return LookupTable.SYMBOLIZED
    }
  }

  private processLookup(symbolsJson: any) {
    (symbolsJson["chartsymbols"]["lookups"]["lookup"] as any[]).forEach((lookup) => {
      let lup: Lookup = {
        name: lookup["_name"],
        instruction: lookup["instruction"],
        lookupTable: this.getLookupTable(lookup["table-name"]),
        geometryType: this.getGeometryType(lookup["type"]),
        attributes: {},
        id: parseInt(lookup["_id"]),
        displayPriority: this.getDisplayPriority(lookup["disp-prio"]),
      }
      let attributes = lookup["attrib-code"]
      if (attributes) {
        (attributes as any[]).forEach((att) => {
          lup.attributes[att["_index"]] = att["__text"]
        })
      }
      this.lookups.push(lup)

    });
    // sort
    this.lookups = this.lookups.sort(this.compareLookup)
    // build index
    let lastkey = ""
    this.lookups.forEach((lup, index) => {
      let key = lup.lookupTable + "," + lup.name + "," + lup.geometryType
      if (key != lastkey) {
        this.lookupStartIndex.set(key, index);
        lastkey = key
      }
    })
  }

  private getSymbol(key: string): Symbol {
    let icon = this.chartSymbols.get(key)
    if (icon && this.chartSymbolsImage) {
      if (!icon.image) {
        icon.image = new Image(icon.width, icon.height)
        createImageBitmap(this.chartSymbolsImage, icon.locationX, icon.locationY, icon.width, icon.height).then((bitmap) => {
          let canvas = document.createElement("CANVAS") as HTMLCanvasElement
          canvas.height = icon.height
          canvas.width = icon.width
          let ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0);
          icon.image.src = canvas.toDataURL();
          //this.refresh.next()       
        })
        return icon
      } else {
        return icon;
      }
    } else {
      return null;
    }
  }

  private selectLookup(feature: Feature): number {
    let properties = feature.getProperties();
    let geometry = feature.getGeometry();
    let name = properties["layer"]
    let geomType = geometry.getType()
    let lookupTable = LookupTable.PAPER_CHART
    let type = GeometryType.POINT;
    if (geomType == "Polygon") {
      type = GeometryType.AREA
    } else if (geomType == "LineString") {
      type = GeometryType.LINES
    }
    switch (type) {
      case GeometryType.POINT: {
        if (this.options.graphicsStyle == "Paper") {
          lookupTable = LookupTable.PAPER_CHART
        } else {
          lookupTable = LookupTable.SIMPLIFIED
        }
      }; break;
      case GeometryType.LINES: lookupTable = LookupTable.LINES; break
      case GeometryType.AREA: {
        if (this.options.boundaries == "Plain") {
          lookupTable = LookupTable.PLAIN
        } else {
          lookupTable = LookupTable.SYMBOLIZED
        }
      }; break;
    }

    let best = -1

    let startIndex = this.lookupStartIndex.get(lookupTable + "," + name + "," + type);
    if (startIndex) {
      let lup = this.lookups[startIndex]
      best = startIndex
      let lmatch = 0
      while (lup.name == name && lup.geometryType == type && lup.lookupTable == lookupTable) {
        let nmatch = 0
        Object.keys(lup.attributes).forEach((k) => {
          let v = lup.attributes[k]
          let parts = this.attMatch.exec(v)
          let key = parts[1].toUpperCase()
          let value = parts[2].toUpperCase()
          if (value == " ") {
            nmatch++;
            return;
          }
          if (value == "?") return
          if (properties[key] == value) {
            nmatch++
          }
        })
        if (nmatch >= lmatch) {
          best = startIndex
          lmatch = nmatch
        }
        startIndex++
        lup = this.lookups[startIndex]
      }
      return best;

    }
    return -1;
  }

  private getSymbolStyle(symbolName: string): Style {
    let symbol = this.getSymbol(symbolName);
    if (symbol) {
      return new Style({
        image: new Icon({
          imgSize: [symbol.width, symbol.height],
          img: symbol.image,
          opacity: 1,
          anchorXUnits: 'pixels',
          anchorYUnits: 'pixels',
          anchor: [symbol.pivotX, symbol.pivotY]
        })
      })
    }
    return null
  }


  private stripQuotes(text: string): string {
    return text.substring(1).substring(0, text.length - 2)
  }

  //TODO implement more parameters
  private getTextStyle(text: string, params: string[]): Style {
    if( typeof text !== 'string') {
      debugger;
      return null
    }

    let textBaseline: any = 'middle'
    let offsetY = 0;
    if (params[1] == "3") {
      textBaseline = 'top';
      offsetY = 15;
    } else if (params[1] == "1") {
      textBaseline = 'bottom';
      offsetY = -15
    }

    let textAlign: any = 'left';
    let offsetX = 15;
    if (params[0] == "2") {
      textAlign = 'right';
      offsetX = -15;
    } else if (params[0] == "1") {
      textAlign = 'center';
      offsetX = 0
    }


    if (text) {
      let tx = text
      if (typeof tx !== 'string') {
        tx = text.toString()
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

  private getTextStyleTX(featureProperties: any, parameters: string): Style {
    let params = parameters.split(",");
    let text = featureProperties[params[0]];
    if(!text) {
      return null;
    }
    return this.getTextStyle(text, params.slice(1))
  }

  //TODO format string
  private getTextStyleTE(featureProperties: any, parameters: string): Style {
    let params = parameters.split(",");
    let text = featureProperties[this.stripQuotes(params[1])];
    let format = this.stripQuotes(params[0]);
    if(!text || !format) {
      return null;
    }
    let formatted=format.replace(/%[0-9]*.?[0-9]*l?[sfd]/,text)
    return this.getTextStyle(formatted, params.slice(2))
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


  private getDisplayPriority(dispPrio: string): DisplayPriority {
    switch (dispPrio) {
      case "Group 1": return DisplayPriority.PRIO_GROUP1; break;
      case "Area 1": return DisplayPriority.PRIO_AREA_1; break;
      case "Area 2": return DisplayPriority.PRIO_AREA_2; break;
      case "Point Symbol": return DisplayPriority.PRIO_SYMB_POINT; break;
      case "Line Symbol": return DisplayPriority.PRIO_SYMB_LINE; break;
      case "Area Symbol": return DisplayPriority.PRIO_SYMB_AREA; break;
      case "Routing": return DisplayPriority.PRIO_ROUTEING; break;
      case "Hazards": return DisplayPriority.PRIO_HAZARDS; break;
      case "Mariners": return DisplayPriority.PRIO_MARINERS; break;
      default: return DisplayPriority.PRIO_NODATA; break;
    }
  }


  private getAreaStyle(colorName:string): Style {
    let color = this.colorTables[this.selectedColorTable].colors.get(colorName)
    if (color) {
      return new Style({
        fill: new Fill({
          color: color
        }),
      });
    }
    return null;
  }

  private getLineStyle(params:string):Style {
    let parts=params.split(",")
    let color = this.colorTables[this.selectedColorTable].colors.get(parts[2])
    let width=parseInt(parts[1]);
    let lineStyle=parts[0];
    let lineDash=null
    switch(lineStyle) {
      case "DASH":lineDash=[4,4];break;
      case "SOLD":lineDash=null;break;
      default:console.debug("Unsupported linestyle:",lineStyle)
    }
    return new Style({
      stroke: new Stroke({
        color: color,
        width:width,
        lineDash:lineDash
      }),
    });
  }

   //https://github.com/OpenCPN/OpenCPN/blob/20a781ecc507443e5aaa1d33d0cb91852feb07ee/libs/s52plib/src/s52cnsy.cpp#L5809
   private GetCSTOPMAR01(feature:Feature): string[] {
    let rulestring: string = null
    let featureProperties = feature.getProperties()
    if (!featureProperties["TOPSHP"]) {
       rulestring="SY(QUESMRK1)"
    } else {
      let floating = false
      let layer = featureProperties["layer"]
      if(layer =="LITFLT" || layer == "LITVES" || layer.startsWith("BOY")) {
        floating = true
      }
      let topshp = featureProperties["TOPSHP"]
      if(floating) {
        switch(topshp) {
          case 1 : rulestring = "SY(TOPMAR02)"; break;
          case 2 : rulestring = "SY(TOPMAR04)"; break;
          case 3 : rulestring = "SY(TOPMAR10)"; break;
          case 4 : rulestring = "SY(TOPMAR12)"; break;

          case 5 : rulestring = "SY(TOPMAR13)"; break;
          case 6 : rulestring = "SY(TOPMAR14)"; break;
          case 7 : rulestring = "SY(TOPMAR65)"; break;
          case 8 : rulestring = "SY(TOPMAR17)"; break;

          case 9 : rulestring = "SY(TOPMAR16)"; break;
          case 10: rulestring = "SY(TOPMAR08)"; break;
          case 11: rulestring = "SY(TOPMAR07)"; break;
          case 12: rulestring = "SY(TOPMAR14)"; break;

          case 13: rulestring = "SY(TOPMAR05)"; break;
          case 14: rulestring = "SY(TOPMAR06)"; break;
          case 17: rulestring = "SY(TMARDEF2)"; break;
          case 18: rulestring = "SY(TOPMAR10)"; break;

          case 19: rulestring = "SY(TOPMAR13)"; break;
          case 20: rulestring = "SY(TOPMAR14)"; break;
          case 21: rulestring = "SY(TOPMAR13)"; break;
          case 22: rulestring = "SY(TOPMAR14)"; break;

          case 23: rulestring = "SY(TOPMAR14)"; break;
          case 24: rulestring = "SY(TOPMAR02)"; break;
          case 25: rulestring = "SY(TOPMAR04)"; break;
          case 26: rulestring = "SY(TOPMAR10)"; break;

          case 27: rulestring = "SY(TOPMAR17)"; break;
          case 28: rulestring = "SY(TOPMAR18)"; break;
          case 29: rulestring = "SY(TOPMAR02)"; break;
          case 30: rulestring = "SY(TOPMAR17)"; break;

          case 31: rulestring = "SY(TOPMAR14)"; break;
          case 32: rulestring = "SY(TOPMAR10)"; break;
          case 33: rulestring = "SY(TMARDEF2)"; break;
          default: rulestring = "SY(TMARDEF2)"; break;
        }
      } else {
        switch(topshp) {
          case 1 : rulestring = "SY(TOPMAR22)"; break;
          case 2 : rulestring = "SY(TOPMAR24)"; break;
          case 3 : rulestring = "SY(TOPMAR30)"; break;
          case 4 : rulestring = "SY(TOPMAR32)"; break;

          case 5 : rulestring = "SY(TOPMAR33)"; break;
          case 6 : rulestring = "SY(TOPMAR34)"; break;
          case 7 : rulestring = "SY(TOPMAR85)"; break;
          case 8 : rulestring = "SY(TOPMAR86)"; break;

          case 9 : rulestring = "SY(TOPMAR36)"; break;
          case 10: rulestring = "SY(TOPMAR28)"; break;
          case 11: rulestring = "SY(TOPMAR27)"; break;
          case 12: rulestring = "SY(TOPMAR14)"; break;

          case 13: rulestring = "SY(TOPMAR25)"; break;
          case 14: rulestring = "SY(TOPMAR26)"; break;
          case 15: rulestring = "SY(TOPMAR88)"; break;
          case 16: rulestring = "SY(TOPMAR87)"; break;

          case 17: rulestring = "SY(TMARDEF1)"; break;
          case 18: rulestring = "SY(TOPMAR30)"; break;
          case 19: rulestring = "SY(TOPMAR33)"; break;
          case 20: rulestring = "SY(TOPMAR34)"; break;

          case 21: rulestring = "SY(TOPMAR33)"; break;
          case 22: rulestring = "SY(TOPMAR34)"; break;
          case 23: rulestring = "SY(TOPMAR34)"; break;
          case 24: rulestring = "SY(TOPMAR22)"; break;

          case 25: rulestring = "SY(TOPMAR24)"; break;
          case 26: rulestring = "SY(TOPMAR30)"; break;
          case 27: rulestring = "SY(TOPMAR86)"; break;
          case 28: rulestring = "SY(TOPMAR89)"; break;

          case 29: rulestring = "SY(TOPMAR22)"; break;
          case 30: rulestring = "SY(TOPMAR86)"; break;
          case 31: rulestring = "SY(TOPMAR14)"; break;
          case 32: rulestring = "SY(TOPMAR30)"; break;
          case 33: rulestring = "SY(TMARDEF1)"; break;
          default: rulestring = "SY(TMARDEF1)"; break;
        }
      }
    }

    
    return rulestring ? [rulestring] : []
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4494C40-L4494C40
  private GetCSLIGHTS05(feature:Feature): string[] {
    let rulestring: string = null
    let featureProperties = feature.getProperties()

    if (featureProperties["COLOUR"]) {
      let colVals = featureProperties["COLOUR"].split(",") as string[]
      if (colVals.length == 1) {
        if (colVals[0] == "3") {
          rulestring = "SY(LIGHTS11)"
        } else if (colVals[0] == "4") {
          rulestring = "SY(LIGHTS12)"
        } else if (colVals[0] == "1" || colVals[0] == "6" || colVals[0] == "13") {
          rulestring = "SY(LIGHTS13)"
        }
      } else if (colVals.length == 2) {
        if (colVals.includes("1") && colVals.includes("3")) {
          rulestring = "SY(LIGHTS11)"
        } else if (colVals.includes("1") && colVals.includes("4")) {
          rulestring = "SY(LIGHTS12)"
        }
      }
    }  
    return rulestring ? [rulestring] : []
  }


  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L5597
  private GetSeabed01(drval1: number, drval2: number): string[] {
    let retval: string[] = ["AC(DEPIT)"];
    let shallow = true;

    if (drval1 >= 0 && drval2 > 0) {
      retval = ["AC(DEPVS)"];
    }
    if (this.options.colors == 2) {
      if (drval1 >= this.options.safetyDepth && drval2 > this.options.safetyDepth) {
        retval = ["AC(DEPDW)"];
        shallow = false;
      }
    } else {
      if (drval1 >= this.options.shallowDepth && drval2 > this.options.shallowDepth) {
        retval = ["AC(DEPMS)"];
      }
      if (drval1 >= this.options.safetyDepth && drval2 > this.options.safetyDepth) {
        retval = ["AC(DEPMD)"]
        shallow = false;
      }
      if (drval1 >= this.options.deepDepth && drval2 > this.options.deepDepth) {
        retval = ["AC(DEPDW)"];
        shallow = false;
      }
    }

    if (shallow) {
      retval.push("AP(DIAMOND1)")
    }

    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4295
  private GetCSDEPCNT02(feature: Feature): string[] {
    let rulestring: string = null
    let featureProperties = feature.getProperties()
    let geometry = feature.getGeometry()

    let safe = false
    let drval1 = 0;
    let depth_value = -1;
    let valdco = 0;
    let quapos =0;
    let objl = 0

    if (featureProperties["OBJL"]) {
      objl=parseInt(featureProperties["OBJL"])
    }

    if (DEPARE == objl &&  geometry.getType() == "LineString") {
      if ( featureProperties["DRVAL1"]) {
        drval1 = parseFloat(featureProperties["DRVAL1"])
      }
      depth_value = drval1
    } else {
      if ( featureProperties["VALDCO"]) {
        valdco = parseFloat(featureProperties["VALDCO"])
        depth_value = valdco
      }
    }
    if(depth_value<this.options.safetyDepth) {
      return []
    }

    if (featureProperties["QUAPOS"]) {
      quapos = parseFloat(featureProperties["QUAPOS"])
      if (  quapos > 2 && quapos  < 10) {

        if(depth_value == this.selectedSafeContour) {
          rulestring="LS(DASH,2,DEPSC)"
        }
        //  else {
        //   rulestring="LS(DASH,1,DEPCN)"

        // }
      }
    } else {
      if(depth_value == this.selectedSafeContour) {
        rulestring="LS(SOLD,2,DEPSC)"
      } 
      // else {
      //   rulestring="LS(SOLD,1,DEPCN)"

      // }
    }

    return rulestring ? [rulestring] : []
  }


  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4247
  private getCSDEPARE01(feature: Feature): string[] {
    let retval: string[] = []

    let featureProperties = feature.getProperties()

    let drval1 = parseFloat(featureProperties["DRVAL1"])
    let drval2 = parseFloat(featureProperties["DRVAL2"])

    retval = this.GetSeabed01(drval1, drval2)

    let objl = featureProperties["OBJL"]
    if (parseInt(objl) == DRGARE) {
      retval.push("AP(DRGARE01)");
      retval.push("LS(DASH,1,CHGRF)");

      //  if (featureProperties["RESTRN"]) {

      //  }
    }


    return retval
  }

  private evalCS(feature: Feature, instruction: string): string[] {
    let retval: string[] = []
    let instrParts = this.instructionMatch.exec(instruction)
    if (instrParts && instrParts.length > 1) {
      switch (instrParts[2]) {
        case "LIGHTS05": retval = this.GetCSLIGHTS05(feature); break;
        case "DEPCNT02": retval = this.GetCSDEPCNT02(feature); break;
        case "DEPARE01":
        case "DEPARE02": retval = this.getCSDEPARE01(feature); break;
        case "TOPMAR01": retval = this.GetCSTOPMAR01(feature); break;
        default: console.debug("Unsupported CS:" + instruction)
      }
    }
    return retval
  }

  private getStylesFromRules(lup: Lookup, feature: Feature): Style[] {
    let styles: Style[] = []
    if (lup) {
      let properties = feature.getProperties()     
      let instructions = lup.instruction.split(";")

      //PreProcess CS
      for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].startsWith("CS")) {
          let conditionals = this.evalCS(feature, instructions[i])
          instructions.splice(i, 1, ...conditionals)
        }
      }
      instructions.forEach((instruction) => {
        let instrParts = this.instructionMatch.exec(instruction)
        if (instrParts && instrParts.length > 1) {
          let style: Style = null
          switch (instrParts[1]) {
            case "SY": style = this.getSymbolStyle(instrParts[2]); break;
            case "AC": style = this.getAreaStyle(instrParts[2]); break;
            case "TX": style = this.getTextStyleTX(properties, instrParts[2]); break;
            case "TE": style = this.getTextStyleTE(properties, instrParts[2]); break;
            case "LS": style = this.getLineStyle(instrParts[2]); break;
            default: console.debug("Unsupported instruction:" + instruction)
          }
          if (style != null) {
            style.setZIndex(lup.displayPriority)
            styles.push(style)
          }
        }
      })
    }

    return styles
  }


  private updateSafeContour(feature:Feature):number {
    
    let properties = feature.getProperties();
    if (properties["DRVAL1"]) {
      let drval1 = properties["DRVAL1"]
      if (drval1 >= this.options.safetyDepth &&  drval1 < this.selectedSafeContour) {
        this.selectedSafeContour = drval1
      }
      return drval1
    }
    if (properties["VALDCO"]) {
      let valdco = properties["VALDCO"]
      if (valdco >= this.options.safetyDepth &&  valdco < this.selectedSafeContour) {
        this.selectedSafeContour = valdco
      }
      return valdco
    }
    return 0
  }

  // the interface of this service

  public renderOrder = (feature1: Feature, feature2: Feature): number => {
    let o1 = this.updateSafeContour(feature1);
    let o2 = this.updateSafeContour(feature2);
    let lupIndex1 = feature1[LOOKUPINDEXKEY];
    let lupIndex2 = feature1[LOOKUPINDEXKEY];
    if (!lupIndex1) {
      lupIndex1 = this.selectLookup(feature1)
      feature1[LOOKUPINDEXKEY] = lupIndex1
    }
    if (!lupIndex2) {
      lupIndex2 = this.selectLookup(feature2)
      feature2[LOOKUPINDEXKEY] = lupIndex2
    }
    
    if (lupIndex1 >= 0 && lupIndex2 >= 0) {
      let c1 = this.lookups[lupIndex1].displayPriority
      let c2 = this.lookups[lupIndex2].displayPriority      
      let cmp = c1 - c2
      if (cmp) {
        return cmp
      }
    }

    if( o1 != o2 ) {
      return o1-o2
    } 

    return lupIndex1 - lupIndex2
  }

  public getStyle = (feature: Feature, resolution: number): Style[] => {
    let lupIndex = feature[LOOKUPINDEXKEY];
    if (lupIndex >= 0) {
      let lup = this.lookups[lupIndex]
      return this.getStylesFromRules(lup, feature)
    }
    return null;
  }
}