import { Pipe, PipeTransform } from '@angular/core';
import { decimalToSexagesimal } from 'geolib';

@Pipe({
  name: 'coords',
  standalone: false
})
export class CoordsPipe implements PipeTransform {
  private symDegree = String.fromCharCode(186);

  public transform(value: number, type: string, isLat?: boolean): string {
    const h = isLat ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E';
    switch (type) {
      case 'SHDd':
        return this.toHDdSigned(value, h);
      case 'DMdH':
        return this.toDMdH(value, h);
      case 'HDd':
        return this.toHDd(value, h);
      case 'HDMS':
        return this.toHDMS(value, h);
      case 'DHMS':
        return this.toDHMS(value, h);
      default:
        return this.toXY(value);
    }
  }

  // returns +/-DD.dddddd
  private toXY(value: number, precision = 5): string {
    return value.toFixed(precision);
  }

  // returns H +/-D.ddddd°
  private toHDdSigned(
    value: number,
    hemisphere: string,
    precision = 5
  ): string {
    const h = ['S', 'W'].includes(hemisphere)
      ? `${hemisphere} -`
      : `${hemisphere} +`;
    let ddec: string = value.toFixed(precision);
    ddec = ddec.substring(ddec.indexOf('.'));
    return `${h}${Math.floor(Math.abs(value))}${ddec}${this.symDegree}`;
  }

  // returns DDD° MM.ddd' H  (e.g 020° 44.56' E)
  private toDMdH(value: number, hemisphere: string, precision = 5): string {
    const D = Math.floor(Math.abs(value)) ?? 0;
    const d = D === 0 ? Math.abs(value) : Math.abs(value % D);
    const mdec = (d * 60).toFixed(precision);
    const pad = ['N', 'S'].includes(hemisphere) ? '00' : '000';
    const s = `${(pad + D.toString()).slice(0 - pad.length)}${
      this.symDegree
    } ${mdec}' ${hemisphere}`;
    return s;
  }

  // returns H D.ddddd°
  private toHDd(value: number, hemisphere: string, precision = 5): string {
    let ddec: string = value.toFixed(precision);
    ddec = ddec.substring(ddec.indexOf('.'));
    return `${hemisphere} ${Math.floor(Math.abs(value))}${ddec}${
      this.symDegree
    }`;
  }

  // returns H D°M'S"sss
  private toHDMS(value: number, hemisphere: string): string {
    return `${hemisphere} ${decimalToSexagesimal(value)}`;
  }

  // returns DHM'S"sss
  private toDHMS(value: number, hemisphere: string): string {
    let c = decimalToSexagesimal(value);
    c =
      c.slice(0, c.indexOf(' ') - 1) + hemisphere + c.slice(c.indexOf(' ') + 1);
    return c;
  }
}
