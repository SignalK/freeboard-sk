import { Convert } from './convert';

// ** GRIB reource processing class **

export interface ColorGradient {
    lo: number | null;     // ** range low value
    hi: number | null;     // ** range hi value
    color: Array<number> | string;  // ** color value
}

export const GRIB_PATH:string= 'resources/grib';

export const GRIB_CATEGORIES= new Map([
    [0, {name: 'Temperature', params: [0]} ],
    [2, {name: 'Wind', params: [2,3] } ]
]);

export const TEMPERATURE_GRADIENT: Array<ColorGradient>= [
    {lo: null, hi: 0, color: 'blue' },
    {lo: 0, hi: 10, color: 'lightgreen' },
    {lo: 10, hi: 20, color: 'yellow' },
    {lo: 20, hi: 30, color: 'orange' },
    {lo: 30, hi: null, color: 'red' }
];


export class Grib {

    constructor() {}

    // ** parse GRIB Wind
    static parseGRIBWind(gribjson:Array<any>) {
        let wind= {};
        gribjson.forEach( f=> {
            // get U and V-component_of_wind
            if(f.header.gridDefinitionTemplate==0   // latitude_longitude template
                    && f.header.parameterCategory==2        
                    && ( f.header.parameterNumber==2 || f.header.parameterNumber==3) ) {
                if(typeof wind['gridStart']==='undefined') {
                    wind['gridStart']= [f.header.lo1, f.header.la1] //[0,90]
                    wind['gridDxy']= [f.header.dx, f.header.dy]     //[1,1]
                    wind['gridNxy']= [f.header.nx, f.header.ny]     //[360,181]
                    wind['parameterNumber']= f.header.parameterNumber;
                    wind['parameterCategory']= f.header.parameterCategory;
                    wind['units']= f.header.parameterUnit;
                }
                if(f.header.parameterNumber==2) { wind['u']=f.data } //U-component_of_wind
                if(f.header.parameterNumber==3) { wind['v']=f.data } //V-component_of_wind
            }
        }); 
        let result= [];
        if(typeof wind['gridStart']==='undefined') { return result }
        let idx=0;
        for(let y=0; y<wind['gridNxy'][1]; y= y + wind['gridDxy'][1]) {    
            for(let x=0; x<wind['gridNxy'][0]; x= x + wind['gridDxy'][0]) {
                let u:number= wind['u'][idx];
                let v:number= wind['v'][idx];
                let coord:[number,number]= [ wind['gridStart'][0] + ((x>180) ? -360+x : x), wind['gridStart'][1] - y];
                //https://www.cactus2000.de/uk/unit/masswin.shtml
                let speed= Math.sqrt( Math.pow(u, 2) + Math.pow(v, 2)) // m/sec
                let angle= 270- (Math.atan2(v, u) * (180/Math.PI) );
                angle= (angle>=360) ? angle-360 : angle;  // direction wind is from
                angle= (180 + angle) * (Math.PI/180); // add 180 to show from-to direction
                result.push({coord:coord, angle:angle, speed:speed});
                idx++;
            }
        }
        return result;
    }

    // ** parse GRIB Wind
    static parseGRIBTemperature(gribjson:Array<any>, toUnits:string=null) {
        let temperature={};
        gribjson.forEach( f=> {
            if(f.header.gridDefinitionTemplate==0       // latitude_longitude template
                    && f.header.parameterCategory==0       
                    &&  f.header.parameterNumber==0 ) {       // temperature
                
                temperature['gridStart']= [f.header.lo1, f.header.la1] //[0,90]
                temperature['gridDxy']= [f.header.dx, f.header.dy]     //[1,1]
                temperature['gridNxy']= [f.header.nx, f.header.ny]     //[360,181]
                temperature['parameterNumber']= f.header.parameterNumber;
                temperature['parameterCategory']= f.header.parameterCategory;
                temperature['units']= f.header.parameterUnit;
                temperature['data']=f.data;
            }
        });
        let result= [];
        if(typeof temperature['gridStart']==='undefined') { return result }
        let idx=0;
        for(let y=0; y<temperature['gridNxy'][1]; y= y + temperature['gridDxy'][1]) {    
            for(let x=0; x<temperature['gridNxy'][0]; x= x + temperature['gridDxy'][0]) {
                let coord:[number,number]= [ temperature['gridStart'][0] + ((x>180) ? -360+x : x), temperature['gridStart'][1] - y];
                let value= (toUnits=='C') ? Convert.kelvinToCelcius(temperature['data'][idx]) 
                    : (toUnits=='F') ? Convert.kelvinToFarenheit(temperature['data'][idx]) 
                    : temperature['data'][idx]
                result.push({coord:coord, value: value});
                idx++;
            }
        }
        return result;    
    }    

    // ** transfrom values to weight using scaleBy
    static toWeight(ta:any, scaleBy:number=1) {
        scaleBy= (scaleBy==0) ? 1 : scaleBy;
        return ta.map( i=> { 
            return {coord: i.coord, value: i.value / scaleBy }
        });
    }
}


