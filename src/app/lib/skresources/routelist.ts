import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AppInfo } from '../../app.info';
import { Convert } from '../convert';

@Component({
    selector: 'route-list',
    templateUrl: './routelist.html',
    styleUrls: ['./resourcelist.css']
})
export class RouteListComponent {
    @Input() routes;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() delete: EventEmitter<any>= new EventEmitter();
    @Output() activate: EventEmitter<any>= new EventEmitter();
    @Output() deactivate: EventEmitter<any>= new EventEmitter();
    @Output() refresh: EventEmitter<any>= new EventEmitter();
    @Output() properties: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    filterList= [];
    filterText: string= '';
    someSel: boolean= false;
    allSel: boolean= false;

    constructor(public app: AppInfo) { }

    ngOnInit() { this.initItems() }

    ngOnChanges() { this.initItems() }

    close() { this.closed.emit() }

    initItems() {
        this.filterList= this.routes;
        this.filterList.sort( (a,b)=>{ 
            let x=a[1].name.toUpperCase();
            let y= b[1].name.toUpperCase();
            return  x<=y ? -1 : 1;
        });
        this.checkSelections();
    }

    checkSelections() {
        let c= false;
        let u= false;
        this.routes.forEach( i=> { 
            c= (i[2]) ? true : c;
            u= (!i[2]) ? true : u;
        });
        this.allSel= (c && !u) ? true : false;
        this.someSel= (c && u) ? true : false;        
    }

    selectAll(value) {
        this.routes.forEach( i=> { i[2]=value} );
        this.someSel= false;
        this.allSel= (value) ? true : false;
        this.select.emit({id: 'all', value: value});
    }

    itemSelect(e, id) { 
        this.routes.forEach( i=> { 
            if(i[0]==id) { i[2]=e }
        });
        this.checkSelections();
        this.select.emit({id: id, value: e}); 
    }

    itemProperties(id:string) { this.properties.emit({id: id, type: 'route'}) }

    itemSetActive(id:string) { this.activate.emit({id: id}) } 
    itemClearActive(id:string) { this.deactivate.emit({id: id}) } 

    itemDelete(id:string) { this.delete.emit({id: id}) }  
    
    itemRefresh() { this.refresh.emit() }

    filterKeyUp(e:string) {
        this.filterText=e;
        this.filterList= this.routes.filter( i=> {
            if(i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                return i;
            }
        });
    }

    km2Nm(v) {return Convert.kmToNauticalMiles(v) }

}

