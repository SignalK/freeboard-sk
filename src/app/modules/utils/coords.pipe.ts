import { Pipe, PipeTransform } from '@angular/core';
import { decimalToSexagesimal } from 'geolib';

@Pipe({ name: 'coords' })
export class CoordsPipe implements PipeTransform {

    private symDegree= String.fromCharCode(186);
 
    public transform(value: number, type: string, isLat?: boolean): string {
        const h = (isLat) ? 
            (value < 0) ? 'S' : 'N' :
            (value <0) ? 'W' : 'E';
        switch (type) {
            case 'HDMS': return this.toHDMS(value, h);
            case 'DHMS': return this.toDHMS(value, h);
            case 'HDd': return this.toHDd(value, h);
            case 'SHDd': return this.toHDdSigned(value, h);
            default: return this.toXY(value);
        }
    }

    // returns +/-DD.dddddd
    private toXY(value:number, precision=5):string {
        return value.toFixed(precision);   
    }

    // returns H D^M'S"sss
    private toHDMS(value: number, hemisphere: string):string {
        return `${hemisphere} ${decimalToSexagesimal(value)}`;
    }

    // returns DHM'S"sss
    private toDHMS(value: number, hemisphere: string):string {
        let c = decimalToSexagesimal(value)
        c= c.slice(0,c.indexOf(' ')-1) + hemisphere + c.slice(c.indexOf(' ')+1);
        return c;
    }

    // returns H D.ddddd^
    private toHDd(value:number, hemisphere: string, precision=5):string {
        let ddec: string= value.toFixed(precision);
        ddec= ddec.substring( ddec.indexOf('.') );
        return `${hemisphere} ${Math.abs(Math.floor(value))}${ddec}${this.symDegree}`;
    }

    // returns H +/-D.ddddd^
    private toHDdSigned(value:number, hemisphere: string, precision=5):string {
        const h = (hemisphere === 'S' || hemisphere === 'W') ? 
           `${hemisphere} -` : `${hemisphere} +`;
        let ddec: string= value.toFixed(precision);
        ddec= ddec.substring( ddec.indexOf('.') );
        return `${h}${Math.floor(value)}${ddec}${this.symDegree}`;
    }

}
