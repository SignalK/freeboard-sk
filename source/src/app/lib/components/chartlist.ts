import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';


@Component({
    selector: 'chart-list',
    templateUrl: './chartlist.html',
    styleUrls: ['./resourcelist.css']
})
export class ChartListComponent {
    @Input() charts;
    @Input() worldmap: boolean;
    @Input() seamap: boolean;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() refresh: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    filterList= [];
    filterText= '';
    someSel: boolean= false;
    allSel: boolean= false;    

    constructor() { }

    ngOnInit() { this.initItems() }

    ngOnChanges() { this.initItems() }

    close() { this.closed.emit() }

    initItems() {
        this.filterList= this.charts;
        this.filterList.sort( (a,b)=>{ 
            if(a[0]=='openstreetmap' || b[0]=='openstreetmap' ||
                a[0]=='openseamap' || b[0]=='openseamap') { return 0 }
            else {
                let x=a[1].name.toUpperCase();
                let y= b[1].name.toUpperCase();
                return  x<=y ? -1 : 1;
            }
        });
        this.checkSelections();
    }   
    
    checkSelections() {
        let c= false;
        let u= false;
        this.charts.forEach( i=> { 
            c= (i[2]) ? true : c;
            u= (!i[2]) ? true : u;
        });
        this.allSel= (c && !u) ? true : false;
        this.someSel= (c && u) ? true : false;        
    } 
    
    selectAll(value) {
        this.charts.forEach( i=> { i[2]=value} );
        this.someSel= false;
        this.allSel= (value) ? true : false;
        this.select.emit({id: 'all', value: value});
    }    

    itemSelect(e, id) { 
        this.charts.forEach( i=> { 
            if(i[0]==id) { i[2]=e }
        });        
        this.checkSelections();
        this.select.emit({id: id, value: e}) 
    }

    itemRefresh() { this.refresh.emit() }

    filterKeyUp(e) {
        this.filterText=e;
        this.filterList= this.charts.filter( i=> {
            if(i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                return i;
            }
        });
    }

}

