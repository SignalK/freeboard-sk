// **** RESOURCE CLASSES **********

// ** Signal K route
export class SKRoute {
    name: string;
    description: string;
    distance: number= 0;
    start: string;
    end: string;
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [ [0,0], [0,0] ]
        },
        properties: {},
        id: ''
    };

    constructor(route?) {
        if(route) {
            this.name= (route.name) ? route.name : null;
            this.description= (route.description) ? route.description : null;
            this.distance= (route.distance) ? route.distance : null;
            this.start= (route.start) ? route.start : null;
            this.end= (route.end) ? route.end : null;
            this.feature= (route.feature) ? route.feature : null;
        }
    }
}

// ** Signal K waypoint
export class SKWaypoint {
    position= {latitude: 0, longitude: 0};
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        },
        properties: {},
        id: ''
    };

    constructor(wpt?) {
        if(wpt) {
            if(wpt.position) { this.position= wpt.position }
            if(wpt.feature) { this.feature= wpt.feature }
        }
    }
} 

// ** Signal K chart
export class SKChart {
    identifier: string;
    name: string;
    description: string;
    tilemapUrl: string;
    region: string;
    geohash: any;
    chartUrl: string;
    scale: number;
    chartLayers: Array<string>;
    bounds: Array<number>;
    chartFormat: string;
    minZoom: number= 0;
    maxZoom: number= 24;
    type: string;

    constructor(chart?) {
        if(chart) {
            this.identifier= (chart.identifier) ? chart.identifier : null;
            this.name= (chart.name) ? chart.name : this.identifier;
            this.description= (chart.description) ? chart.description : null;
            this.region= (chart.region) ? chart.region : null;
            this.geohash= (chart.geohash) ? chart.geohash : null;
            this.chartUrl= (chart.chartUrl) ? chart.chartUrl : null;
            this.chartLayers= (chart.chartLayers) ? chart.chartLayers : null;
            this.bounds= (chart.bounds) ? chart.bounds : null;
            this.chartFormat= (chart.format) ? chart.format : null;
            this.minZoom= (chart.minzoom) ? chart.minzoom : this.minZoom;
            this.maxZoom= (chart.maxzoom) ? chart.maxzoom : this.maxZoom;
            this.type= (chart.type) ? chart.type : null;
            this.tilemapUrl= (chart.tilemapUrl) ? chart.tilemapUrl : null;
            this.scale= (chart.scale) ? 
                isNaN(chart.scale) ? 25000 : parseInt(chart.scale)
                : 250000;    
        }
    }
}

// ** Vessel Data **
export class SKVessel {
    id: string;
    position= [0,0];
    heading: number;
    headingTrue: number= null;
    headingMagnetic: number= null;
    cog: number;
    cogTrue: number= null;
    cogMagnetic: number= null;
    sog: number;
    name: string;
    mmsi: string;
    callsign: string; 
    state: string;   
    wind= { 
        direction: null, mwd: null, twd: null, 
        tws: null, speedTrue: null, sog: null,
        awa: null, aws: null 
    };
    lastUpdated= new Date();
    orientation:number= 0;
    buddy:boolean= false;
    closestApproach:any= null;
    mode:string= 'day';
    anchor= { maxRadius: null, radius: null, position: null };
    resourceUpdates: Array<any>= [];
}

// ** Signal K Note
export class SKNote {
    title: string;
    description: string;
    position: any;
    region: string;
    geohash: string;   
    mimeType: string;
    url: string; 
    group: string;
    authors: Array<any>;
    properties: any= {};
    timestamp: string;
    source: string; 

    constructor(note?) {
        if(note) {
            if(note.title) { this.title= note.title }
            if(note.description) { this.description= note.description }
            if(note.position) { this.position= note.position }
            if(note.region) { this.region= note.region }
            if(note.geohash) { this.geohash= note.geohash }
            if(note.mimeType) { this.mimeType= note.mimeType }
            if(note.url) { this.url= note.url }
            if(note.group) { this.group= note.group }
            if(note.authors && Array.isArray(note.authors) ) { this.authors= note.authors }
            if(note.properties && typeof note.properties=== 'object' ) { this.properties= note.properties }
            if(note.timestamp) { this.timestamp= note.timestamp }
            if(note.source) { this.source= note.source }
            if(note.$source) { this.source= note.$source }
        }
    }    
} 

// ** Signal K Region
export class SKRegion {
    geohash: string;   
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: []
        },
        properties: {},
        id: ''
    };

    constructor(region?) {
        if(region) {
            if(region.geohash) { this.geohash= region.geohash }
            if(region.feature) { this.feature= region.feature }
        }
    }     
}

// ** AtoN Data **
export class SKAtoN {
    id: string;
    position= [0,0];
    name: string;
    mmsi: string;
    lastUpdated= new Date();
    type: {id: number, name:string};
    properties= {};
}

// ** Signal K Track
export class SKTrack {
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'MultiLineString',
            coordinates: []
        },
        properties: {},
        id: ''
    };

    constructor(trk?) {
        if(trk) {
            if(trk.feature) { this.feature= trk.feature }
        }
    }
} 
