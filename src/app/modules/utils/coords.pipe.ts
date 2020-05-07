import { Pipe, PipeTransform } from '@angular/core';

interface CoordStruct {
    degrees: number;
    decimalDegrees: number;
    minutes: number;
    decimalMinutes: number;
    seconds: number;
}

@Pipe({ name: 'coords' })
export class CoordsPipe implements PipeTransform {

    private symDegree= String.fromCharCode(186);
    constructor() {}
 
    public transform(value: number, type: string, isLat?: boolean): string {
        let cs= this.split(value);
        switch (type) {
            case 'HDMS': return this.toHDMS(cs, isLat);
            case 'DHMS': return this.toDHMS(cs, isLat);
            case 'HDd': return this.toHDd(value, isLat);
            case 'SHDd': return this.toHDdSigned(value, isLat);
            default: return this.toXY(value);
        }
    }

    //** Split coord value into Deg, Minutes, minutes_decimal & seconds **
	private split( coord:number ): CoordStruct {
        let cs: CoordStruct= {
            degrees: null,
            decimalDegrees: null,
            minutes: null,
            seconds: null,
            decimalMinutes: null
        }
		let r: number= Math.abs(coord);
		cs.degrees= Math.floor(coord);
        cs.decimalDegrees= (cs.degrees!= 0) ? r % cs.degrees : 0;
		r= cs.decimalDegrees * 60;
        cs.minutes= Math.floor(r);
        cs.decimalMinutes= (cs.minutes!= 0) ? r % cs.minutes : 0;
		cs.seconds= (cs.decimalMinutes % 60) * 60;
        
        return cs;
    }

    // returns +/-DD.dddddd
    private toXY(value:number, precision:number=5):string {
        return value.toFixed(precision);   
    }

    // returns H D^M'S"sss
    private toHDMS(value:CoordStruct, isLat: boolean= false, precision:number=3):string {
        let deg: string= `${(isLat) ? 
            (value.degrees<0) ? 'S' : 'N' :
            (value.degrees<0) ? 'W' : 'E'} ${Math.abs(value.degrees)}${this.symDegree}`;
        let min: string= `${('00' + value.minutes).slice(-2)}\'`;
        let sec: string= `${('00' + value.seconds).slice(-2)}\"`;
        let sdec: string= value.seconds.toFixed(precision);
        sdec= sdec.substring( sdec.indexOf('.')+1 );
        return `${deg}${min}${sec}${sdec}`;
    }

    // returns DHM'S"sss
    private toDHMS(value:CoordStruct, isLat: boolean= false, precision:number=3):string {
        let deg: string= `${Math.abs(value.degrees)}${(isLat) ? 
            (value.degrees<0) ? 'S' : 'N' :
            (value.degrees<0) ? 'W' : 'E'}`;
        let min: string= `${('00' + value.minutes).slice(-2)}\'`;
        let sec: string= `${('00' + value.seconds).slice(-2)}\"`;
        let sdec: string= value.seconds.toFixed(precision);
        sdec= sdec.substring( sdec.indexOf('.')+1 );
        return `${deg}${min}${sec}${sdec}`;
    }
    
    // returns H D.ddddd^
    private toHDd(value:number, isLat: boolean= false, precision:number=5):string {
        let deg: string= `${(isLat) ? 
            (value<0) ? 'S' : 'N' :
            (value<0) ? 'W' : 'E'} ${Math.abs(Math.floor(value))}`;
        let ddec: string= value.toFixed(precision);
        ddec= ddec.substring( ddec.indexOf('.') );
        return `${deg}${ddec}${this.symDegree}`;
    }

    // returns H +/-D.ddddd^
    private toHDdSigned(value:number, isLat: boolean= false, precision:number=5):string {
        let deg: string= `${(isLat) ? 
            (value<0) ? 'S ' : 'N +' :
            (value<0) ? 'W ' : 'E +'}${Math.floor(value)}`;
        let ddec: string= value.toFixed(precision);
        ddec= ddec.substring( ddec.indexOf('.') );
        return `${deg}${ddec}${this.symDegree}`;
    }

}
