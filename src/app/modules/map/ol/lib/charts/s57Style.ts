import { S57Service, Lookup, DisplayCategory } from './s57.service';
import { Feature } from 'ol';
import { Style, Fill, Stroke, Icon, Text } from 'ol/style';
import { Convert, TARGET_UNIT } from 'src/app/lib/convert';

const DRGARE = 46; // Dredged area
const DEPARE = 42; // Depth Area

const LOOKUPINDEXKEY = '$lupIndex';

export class S57Style {
  private s57Service: S57Service;
  private selectedSafeContour = 1000;
  private currentResolution = 0;
  private instructionMatch = new RegExp('([A-Z][A-Z])\\((.*)\\)');

  constructor(s57Service: S57Service) {
    this.s57Service = s57Service;
  }

  private getSymbolStyle(symbolName: string): Style {
    const symbol = this.s57Service.getSymbol(symbolName);
    if (symbol) {
      return new Style({
        image: new Icon({
          width: symbol.width,
          height: symbol.height,
          img: symbol.image,
          opacity: 1,
          anchorXUnits: 'pixels',
          anchorYUnits: 'pixels',
          anchor: [symbol.pivotX, symbol.pivotY],
          declutterMode: 'none'
        })
      });
    }
    return null;
  }

  //TODO implement more parameters
  private getTextStyle(params: string[]): Style {
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

    const style = new Style({
      text: new Text({
        textAlign: textAlign,
        textBaseline: textBaseline,
        scale: 1.5,
        offsetX: offsetX,
        offsetY: offsetY
      })
    });
    style.setZIndex(99); // text always on top
    return style;
  }

  private getTextStyleTXStyle(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureProperties: any,
    parameters: string
  ): Style {
    const params = parameters.split(',');
    return this.getTextStyle(params.slice(1));
  }

  private getTextStyleTXText(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureProperties: any,
    parameters: string
  ): string {
    const params = parameters.split(',');
    const text = featureProperties[params[0]];
    return text;
  }

  private stripQuotes(text: string): string {
    return text.substring(1).substring(0, text.length - 2);
  }

  private getTextStyleTEText(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureProperties: any,
    parameters: string
  ): string {
    const params = parameters.split(',');
    const text = featureProperties[this.stripQuotes(params[1])];
    const format = this.stripQuotes(params[0]);
    if (!text || !format) {
      return null;
    }
    return format.replace(/%[0-9]*.?[0-9]*l?[sfd]/, text);
  }

  private getTextStyleTEStyle(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureProperties: any,
    parameters: string
  ): Style {
    const params = parameters.split(',');
    return this.getTextStyle(params.slice(2));
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

  private getAreaStyle(colorName: string): Style {
    const color = this.s57Service.getColor(colorName);
    if (color) {
      return new Style({
        fill: new Fill({
          color: color
        })
      });
    }
    return null;
  }

  private getLineStyle(params: string): Style {
    const parts = params.split(',');
    const color = this.s57Service.getColor(parts[2]);
    const width = parseInt(parts[1]);
    const lineStyle = parts[0];
    let lineDash = null;
    switch (lineStyle) {
      case 'DASH':
        lineDash = [4, 4];
        break;
      case 'DOTT':
        lineDash = [2, 4];
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

  //https://github.com/OpenCPN/OpenCPN/blob/20a781ecc507443e5aaa1d33d0cb91852feb07ee/libs/s52plib/src/s52cnsy.cpp#L2121
  private GetCSQQUALIN01(feature: Feature): string[] {
    const retval: string[] = [];
    const featureProperties = feature.getProperties();

    let quapos = 0;
    let bquapos = false;
    if (featureProperties['QUAPOS']) {
      quapos = parseFloat(featureProperties['QUAPOS']);
      bquapos = true;
    }
    if (bquapos) {
      if (2 <= quapos && quapos < 10) {
        retval.push('LC(LOWACC21');
      }
    } else {
      if (featureProperties['layer'] === 'COALNE') {
        let conrad = 0;
        let bconrad = false;
        if (featureProperties['CONRAD']) {
          quapos = parseFloat(featureProperties['CONRAD']);
          bquapos = true;
        }
        if (bconrad) {
          if (conrad === 1) {
            retval.push('LS(SOLD,3,CHMGF)');
            retval.push('LS(SOLD,1,CSTLN)');
          } else {
            retval.push('LS(SOLD,1,CSTLN)');
          }
        } else {
          retval.push('LS(SOLD,1,CSTLN)');
        }
      } else {
        retval.push('LS(SOLD,1,CSTLN)');
      }
    }

    return retval;
  }

  // https://github.com/OpenCPN/OpenCPN/blob/20a781ecc507443e5aaa1d33d0cb91852feb07ee/libs/s52plib/src/s52cnsy.cpp#L2185
  private GetCSQQUAPNT01(feature: Feature): string[] {
    const retval: string[] = [];
    const featureProperties = feature.getProperties();

    let accurate = true;
    let quapos = 0;
    let bquapos = false;
    if (featureProperties['QUAPOS']) {
      quapos = parseInt(featureProperties['QUAPOS']);
      bquapos = true;
    }
    if (bquapos) {
      if (2 <= quapos && quapos < 10) {
        accurate = false;
      }
      if (accurate) {
        switch (quapos) {
          case 4:
            retval.push('SY(QUAPOS01)');
            break;
          case 5:
            retval.push('SY(QUAPOS02)');
            break;
          case 7:
          case 8:
            retval.push('SY(QUAPOS03)');
            break;
          default:
            retval.push('SY(LOWACC03)');
            break;
        }
      }
    }
    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/20a781ecc507443e5aaa1d33d0cb91852feb07ee/libs/s52plib/src/s52cnsy.cpp#L2072
  private GetCSQUAPOS01(feature: Feature): string[] {
    const geometry = feature.getGeometry();

    if (geometry.getType() === 'LineString') {
      return this.GetCSQQUALIN01(feature);
    } else {
      return this.GetCSQQUAPNT01(feature);
    }
  }

  //https://github.com/OpenCPN/OpenCPN/blob/20a781ecc507443e5aaa1d33d0cb91852feb07ee/libs/s52plib/src/s52cnsy.cpp#L2232
  private GetCSSLCONS03(feature: Feature): string[] {
    const retval: string[] = [];
    const featureProperties = feature.getProperties();
    const geometry = feature.getGeometry();

    let quapos = 0;
    let bquapos = false;
    if (featureProperties['QUAPOS']) {
      quapos = parseFloat(featureProperties['QUAPOS']);
      bquapos = true;
    }

    if (geometry.getType() === 'Point') {
      if (bquapos) {
        if (2 <= quapos && quapos < 10) {
          retval.push('SY(LOWACC01)');
        }
      }
    } else {
      if (geometry.getType() === 'Polygon') {
        retval.push('AP(CROSSX01');
      }
      if (bquapos) {
        if (2 <= quapos && quapos < 10) {
          retval.push('LC(LOWACC01)');
        }
      } else {
        let bcondtn = false;
        let condtn = 0;
        if (featureProperties['QUAPOS']) {
          condtn = parseInt(featureProperties['CONDTN']);
          bcondtn = true;
        }
        if (bcondtn && (condtn === 1 || condtn === 2)) {
          retval.push('LS(DASH,1,CSTLN)');
        } else {
          let bcatslc = false;
          let catslc = 0;
          if (featureProperties['CATSLC']) {
            catslc = parseInt(featureProperties['CATSLC']);
            bcatslc = true;
          }
          if (bcatslc && (catslc === 6 || catslc === 15 || catslc === 16)) {
            retval.push('LS(SOLD,4,CSTLN)');
          } else {
            let bwatlev = false;
            let watlev = 0;
            if (featureProperties['WATLEV']) {
              watlev = parseInt(featureProperties['WATLEV']);
              bwatlev = true;
            }
            if (bwatlev && watlev === 2) {
              retval.push('LS(SOLD,2,CSTLN)');
            } else if (bwatlev && (watlev === 3 || watlev === 4)) {
              retval.push('LS(DASH,2,CSTLN)');
            } else {
              retval.push('LS(SOLD,2,CSTLN)');
            }
          }
        }
      }
    }

    return retval;
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
    if (this.s57Service.options.colors === 2) {
      if (
        drval1 >= this.s57Service.options.safetyDepth &&
        drval2 > this.s57Service.options.safetyDepth
      ) {
        retval = ['AC(DEPDW)'];
      }
    } else {
      if (
        drval1 >= this.s57Service.options.shallowDepth &&
        drval2 > this.s57Service.options.shallowDepth
      ) {
        retval = ['AC(DEPMS)'];
      }
      if (
        drval1 >= this.s57Service.options.safetyDepth &&
        drval2 > this.s57Service.options.safetyDepth
      ) {
        retval = ['AC(DEPMD)'];
      }
      if (
        drval1 >= this.s57Service.options.deepDepth &&
        drval2 > this.s57Service.options.deepDepth
      ) {
        retval = ['AC(DEPDW)'];
      }
    }
    // debug
    // retval.push("LS(DASH,1,DEPSC)")

    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4295
  private GetCSDEPCNT02(feature: Feature): string[] {
    //let rulestring: string = null;
    const featureProperties = feature.getProperties();
    const geometry = feature.getGeometry();
    const retval: string[] = [];

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
    if (depth_value < this.s57Service.options.safetyDepth) {
      retval.push('LS(SOLD,1,DEPCN)');
      return retval;
    }

    if (featureProperties['QUAPOS']) {
      quapos = parseFloat(featureProperties['QUAPOS']);
      if (quapos > 2 && quapos < 10) {
        if (depth_value === this.selectedSafeContour) {
          retval.push('LS(DASH,2,DEPSC)');
        } else {
          retval.push('LS(DASH,1,DEPCN)');
        }
      }
    } else {
      if (depth_value === this.selectedSafeContour) {
        retval.push('LS(SOLD,2,DEPSC)');
      } else {
        retval.push('LS(SOLD,1,DEPCN)');
      }
    }

    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/c2ffb36ebca8c3777f03ea4d42e24f897aa62609/libs/s52plib/src/s52cnsy.cpp#L4247
  private getCSDEPARE01(feature: Feature): string[] {
    let retval: string[] = [];

    const featureProperties = feature.getProperties();

    let drval1 = -1;

    const dv1 = parseFloat(featureProperties['DRVAL1']);
    if (!Number.isNaN(dv1)) {
      drval1 = dv1;
    }

    let drval2: number = drval1 + 0.01;
    const dv2 = parseFloat(featureProperties['DRVAL2']);
    if (!Number.isNaN(dv2)) {
      drval2 = dv2;
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

  private GetCSSOUNDG02(feature: Feature): string[] {
    const retval: string[] = [];
    const featureProperties = feature.getProperties();

    let depth = NaN;
    if (featureProperties['DEPTH'] !== undefined) {
      depth = parseFloat(featureProperties['DEPTH']);
    } else if (featureProperties['VALSOU'] !== undefined) {
      depth = parseFloat(featureProperties['VALSOU']);
    }

    if (isNaN(depth)) {
      return retval;
    }

    // Convert to user's preferred depth unit
    depth = Convert.transform(
      depth,
      'm',
      this.s57Service.options.depthUnit as TARGET_UNIT
    );

    // Format: whole numbers for feet; other units show tenths only when zoomed in
    const sign = depth < 0 ? '-' : '';
    const absDepth = Math.abs(depth);
    let str: string;
    if (this.s57Service.options.depthUnit === 'foot') {
      str = sign + Math.round(absDepth).toString();
    } else {
      // Show tenths when zoomed in (resolution < 5 ≈ zoom 15+), whole numbers when zoomed out
      const showTenths = this.currentResolution < 5;
      if (showTenths) {
        const rounded = Math.round(absDepth * 10) / 10;
        str =
          sign + (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1));
      } else {
        str = sign + Math.round(absDepth).toString();
      }
    }

    // Write synthetic property directly (RenderFeature has no .set())
    featureProperties['_SOUNDG_WHOLE'] = str;
    retval.push('TX(_SOUNDG_WHOLE,1,2,2)');

    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/master/libs/s52plib/src/s52cnsy.cpp
  private GetCSOBSTRN04(feature: Feature): string[] {
    const retval: string[] = [];
    const props = feature.getProperties();
    const geomType = feature.getGeometry().getType();
    const layer = props['layer'];

    const valsou =
      props['VALSOU'] !== undefined ? parseFloat(props['VALSOU']) : NaN;
    const watlev = props['WATLEV'] ? parseInt(props['WATLEV']) : 0;

    if (geomType === 'Point') {
      if (!isNaN(valsou)) {
        if (valsou <= 0) {
          retval.push(layer === 'UWTROC' ? 'SY(UWTROC04)' : 'SY(OBSTRN11)');
        } else if (valsou <= this.s57Service.options.safetyDepth) {
          retval.push('SY(DANGER51)');
        } else {
          retval.push(layer === 'UWTROC' ? 'SY(UWTROC03)' : 'SY(OBSTRN01)');
        }
      } else {
        if (watlev === 1 || watlev === 2) {
          retval.push(layer === 'UWTROC' ? 'SY(UWTROC04)' : 'SY(OBSTRN11)');
        } else if (watlev === 4 || watlev === 5) {
          retval.push(layer === 'UWTROC' ? 'SY(UWTROC03)' : 'SY(OBSTRN03)');
        } else {
          retval.push(layer === 'UWTROC' ? 'SY(UWTROC03)' : 'SY(OBSTRN01)');
        }
      }
    } else if (geomType === 'LineString') {
      if (!isNaN(valsou) && valsou <= this.s57Service.options.safetyDepth) {
        retval.push('LS(DOTT,2,CHBLK)');
      } else {
        retval.push('LS(DASH,2,CHBLK)');
      }
    } else {
      // Polygon/Area
      if (watlev === 1 || watlev === 2) {
        retval.push('AC(CHBRN)');
        retval.push('LS(SOLD,2,CSTLN)');
      } else if (watlev === 4) {
        retval.push('AC(DEPIT)');
        retval.push('LS(DASH,2,CSTLN)');
      } else {
        retval.push('AC(DEPVS)');
        retval.push('LS(DOTT,2,CHBLK)');
      }
    }

    return retval;
  }

  //https://github.com/OpenCPN/OpenCPN/blob/master/libs/s52plib/src/s52cnsy.cpp
  private GetCSWRECKS02(feature: Feature): string[] {
    const retval: string[] = [];
    const props = feature.getProperties();
    const geomType = feature.getGeometry().getType();

    const valsou =
      props['VALSOU'] !== undefined ? parseFloat(props['VALSOU']) : NaN;
    const watlev = props['WATLEV'] ? parseInt(props['WATLEV']) : 0;
    const catwrk = props['CATWRK'] ? parseInt(props['CATWRK']) : 0;

    if (geomType === 'Point') {
      if (!isNaN(valsou)) {
        if (valsou <= 0) {
          retval.push('SY(WRECKS01)');
        } else if (valsou <= this.s57Service.options.safetyDepth) {
          retval.push('SY(DANGER51)');
        } else {
          retval.push('SY(WRECKS05)');
        }
      } else {
        if (catwrk === 1) {
          retval.push('SY(WRECKS05)');
        } else if (catwrk === 2) {
          retval.push('SY(WRECKS01)');
        } else if (watlev === 1 || watlev === 2 || watlev === 3) {
          retval.push('SY(WRECKS01)');
        } else if (watlev === 4 || watlev === 5) {
          retval.push('SY(WRECKS05)');
        } else {
          retval.push('SY(WRECKS01)');
        }
      }
    } else {
      // Polygon/Area
      if (watlev === 1 || watlev === 2) {
        retval.push('AC(CHBRN)');
        retval.push('LS(SOLD,2,CSTLN)');
      } else if (watlev === 4) {
        retval.push('AC(DEPIT)');
        retval.push('LS(DASH,2,CSTLN)');
      } else {
        retval.push('AC(DEPVS)');
        retval.push('LS(DOTT,2,CSTLN)');
      }
    }

    return retval;
  }

  private GetCSRESTRN01(feature: Feature): string[] {
    const retval: string[] = [];
    const props = feature.getProperties();

    if (!props['RESTRN']) {
      return retval;
    }

    const restrns = props['RESTRN']
      .toString()
      .split(',')
      .map((v) => parseInt(v));

    if (restrns.includes(1) || restrns.includes(2)) {
      retval.push('SY(ACHRES51)');
    }
    if (restrns.includes(3) || restrns.includes(4)) {
      retval.push('SY(FSHRES51)');
    }
    if (restrns.includes(5) || restrns.includes(6)) {
      retval.push('SY(FSHRES71)');
    }
    if (restrns.includes(7) || restrns.includes(8) || restrns.includes(14)) {
      retval.push('SY(ENTRES51)');
    }
    if (restrns.includes(9) || restrns.includes(10)) {
      retval.push('SY(DRGARE51)');
    }
    if (restrns.includes(11) || restrns.includes(12)) {
      retval.push('SY(DIVPRO51)');
    }
    if (restrns.includes(13)) {
      retval.push('SY(ENTRES61)');
    }
    if (restrns.includes(27)) {
      retval.push('SY(ENTRES71)');
    }

    if (retval.length === 0) {
      retval.push('SY(ENTRES61)');
    }

    return retval;
  }

  private GetCSRESARE02(feature: Feature): string[] {
    const retval: string[] = [];
    retval.push('LS(DASH,2,CHMGD)');
    retval.push(...this.GetCSRESTRN01(feature));
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
        case 'SLCONS03':
          retval = this.GetCSSLCONS03(feature);
          break;
        case 'QUAPOS01':
          retval = this.GetCSQUAPOS01(feature);
          break;
        case 'SOUNDG02':
          retval = this.GetCSSOUNDG02(feature);
          break;
        case 'OBSTRN04':
          retval = this.GetCSOBSTRN04(feature);
          break;
        case 'WRECKS02':
          retval = this.GetCSWRECKS02(feature);
          break;
        case 'RESTRN01':
          retval = this.GetCSRESTRN01(feature);
          break;
        case 'RESARE01':
        case 'RESARE02':
          retval = this.GetCSRESARE02(feature);
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
          const cacheKey = instrParts[1] + '_' + instrParts[2];
          const isText = instrParts[1] === 'TX' || instrParts[1] === 'TE';
          if (!isText) {
            style = this.s57Service.getStyle(cacheKey);
          }
          if (!style) {
            switch (instrParts[1]) {
              case 'SY':
                style = this.getSymbolStyle(instrParts[2]);
                break;
              case 'AC':
                style = this.getAreaStyle(instrParts[2]);
                break;
              case 'TX':
                style = this.getTextStyleTXStyle(properties, instrParts[2]);
                break;
              case 'TE':
                style = this.getTextStyleTEStyle(properties, instrParts[2]);
                break;
              case 'LS':
                style = this.getLineStyle(instrParts[2]);
                break;
              default:
                //debugger
                console.debug('Unsupported instruction:' + instruction);
            }
            if (!isText) {
              this.s57Service.setStyle(cacheKey, style);
            }
          }

          if (style) {
            if (instrParts[1] === 'TE') {
              style
                .getText()
                .setText(this.getTextStyleTEText(properties, instrParts[2]));
            }
            if (instrParts[1] === 'TX') {
              style
                .getText()
                .setText(this.getTextStyleTXText(properties, instrParts[2]));
            }
            styles.push(style);
          }
        }
      });
    }

    return styles;
  }

  private layerOrder(feature: Feature): number {
    const properties = feature.getProperties();

    const layer = properties['layer'];
    switch (layer) {
      case 'SEAARE':
        return 2;
      case 'DEPARE':
        return 3;
      case 'DEPCNT':
        return 4;
      case 'LNDARE':
        return 5;
      case 'BUAARE':
        return 6;
      case 'SOUNDG':
        return 7;
      default:
        return 99;
    }
  }

  private updateSafeContour(feature: Feature): number {
    const properties = feature.getProperties();
    if (properties['DRVAL1']) {
      const drval1 = properties['DRVAL1'];
      if (
        drval1 >= this.s57Service.options.safetyDepth &&
        drval1 < this.selectedSafeContour
      ) {
        this.selectedSafeContour = drval1;
      }
      return drval1;
    }
    if (properties['VALDCO']) {
      const valdco = properties['VALDCO'];
      if (
        valdco >= this.s57Service.options.safetyDepth &&
        valdco < this.selectedSafeContour
      ) {
        this.selectedSafeContour = valdco;
      }
      return valdco;
    }
    return 0;
  }

  public renderOrder = (feature1: Feature, feature2: Feature): number => {
    const l1 = this.layerOrder(feature1);
    const l2 = this.layerOrder(feature2);
    // TODO: updateSafeContour has side effects inside a sort comparator,
    // making selectedSafeContour depend on sort traversal order.
    // Proper fix: compute safe contour in a pre-render pass over all features.
    const o1 = this.updateSafeContour(feature1);
    const o2 = this.updateSafeContour(feature2);
    let lupIndex1 = feature1[LOOKUPINDEXKEY];
    let lupIndex2 = feature2[LOOKUPINDEXKEY];
    if (!lupIndex1) {
      lupIndex1 = this.s57Service.selectLookup(feature1);
      feature1[LOOKUPINDEXKEY] = lupIndex1;
    }
    if (!lupIndex2) {
      lupIndex2 = this.s57Service.selectLookup(feature2);
      feature2[LOOKUPINDEXKEY] = lupIndex2;
    }

    if (l1 !== l2) {
      return l1 - l2;
    }

    if (lupIndex1 >= 0 && lupIndex2 >= 0) {
      const c1 = this.s57Service.getLookup(lupIndex1).displayPriority;
      const c2 = this.s57Service.getLookup(lupIndex2).displayPriority;
      if (c1 !== c2) {
        return c1 - c2;
      }
    }

    if (o1 !== o2) {
      return o1 - o2;
    }

    return 0;
  };

  public getStyle = (feature: Feature, resolution: number): Style[] => {
    this.currentResolution = resolution;
    let lupIndex = feature[LOOKUPINDEXKEY];
    if (lupIndex === undefined || lupIndex === null) {
      lupIndex = this.s57Service.selectLookup(feature);
      feature[LOOKUPINDEXKEY] = lupIndex;
    }
    if (lupIndex >= 0) {
      const lup = this.s57Service.getLookup(lupIndex);
      // simple feature filter
      if (
        lup.displayCategory === DisplayCategory.DISPLAYBASE ||
        lup.displayCategory === DisplayCategory.STANDARD ||
        lup.displayCategory === DisplayCategory.MARINERS_STANDARD ||
        this.s57Service.options.otherLayers.includes(lup.name)
      ) {
        return this.getStylesFromRules(lup, feature);
      }
    }
    return null;
  };
}
