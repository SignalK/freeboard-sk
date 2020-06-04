import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { AppInfo } from 'src/app/app.info';

@Component({
    selector: 'waypoint-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './waypointlist.html',
    styleUrls: ['./resourcelist.css']
})
export class WaypointListComponent {
    @Input() waypoints: Array<any>;
    @Input() activeWaypoint: string;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() delete: EventEmitter<any>= new EventEmitter();
    @Output() goto: EventEmitter<any>= new EventEmitter();
    @Output() deactivate: EventEmitter<any>= new EventEmitter();
    @Output() refresh: EventEmitter<any>= new EventEmitter();
    @Output() properties: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();
    @Output() center: EventEmitter<[number,number]>= new EventEmitter();

    filterList= [];
    filterText: string= '';
    someSel: boolean= false;
    allSel: boolean= false;    

    constructor(public app: AppInfo) { }

    ngOnInit() { this.initItems() }

    ngOnChanges() { this.initItems() }

    close() { this.closed.emit() }

    initItems() {         
        this.filterList= this.waypoints;
        this.filterList.sort( (a,b)=>{ 
            let x=a[1].feature.properties.name || 'zzz';
            let y= b[1].feature.properties.name || 'zzz';
            return  x.toUpperCase()<=y.toUpperCase() ? -1 : 1;
        });
        this.checkSelections();
    }    

    checkSelections() {
        let c= false;
        let u= false;
        this.waypoints.forEach( i=> { 
            c= (i[2]) ? true : c;
            u= (!i[2]) ? true : u;
        });
        this.allSel= (c && !u) ? true : false;
        this.someSel= (c && u) ? true : false;        
    } 
    
    selectAll(value:boolean) {
        this.waypoints.forEach( i=> { i[2]=value} );
        this.someSel= false;
        this.allSel= (value) ? true : false;
        this.select.emit({id: 'all', value: value});
    }    

    itemSelect(e, id:string) { 
        this.waypoints.forEach( i=> { 
            if(i[0]==id) { i[2]=e }
        });
        this.checkSelections();
        this.select.emit({id: id, value: e}); 
    }

    emitCenter(position) { this.center.emit([position.longitude, position.latitude]) }

    itemProperties(id:string) { this.properties.emit({id: id, type: 'waypoint'}) }

    itemDelete(id:string) { this.delete.emit({id: id}) }  

    itemGoTo(id:string) { this.goto.emit({id: id}) }  

    itemClearActive() { this.deactivate.emit({id: null}) }
    
    itemRefresh() { this.refresh.emit() }

    filterKeyUp(e) {
        this.filterText=e;
        this.filterList= this.waypoints.filter( i=> {
            if(i[1].feature.properties.name) {
                if(i[1].feature.properties.name.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                    return i;
                }
            }
        });
    }

}

