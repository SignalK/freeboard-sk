import {Component, Input, Output, EventEmitter } from '@angular/core';
import { AppInfo } from '../../../app.info';

//** AIS Dialog **
@Component({
    selector: 'ais-list',
    templateUrl: './aislist.html',
    styleUrls: ['./resourcelist.css']
})
export class AISListComponent {
    @Input() aisTargets: any;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();
    @Output() properties: EventEmitter<any>= new EventEmitter();

    aisAvailable= [];
    filterList= [];
    filterText= '';
    someSel: boolean= false;
    allSel: boolean= false;    

    constructor( private app: AppInfo) { }

    ngOnInit() { this.initItems() }

    ngOnChanges() { }

    close() { this.closed.emit() }

    initItems() {
        this.aisAvailable= [];
        // ** if no selections made then select all as a default
        let selectAll= (this.app.config.selections.aisTargets && 
            Array.isArray(this.app.config.selections.aisTargets ) ) ? false : true;

        this.aisTargets.forEach( (value, key)=> {
            let selected: boolean;
            if(selectAll) { selected=true}
            else { selected= (this.app.config.selections.aisTargets.indexOf(key)!=-1) ? true : false }
            this.aisAvailable.push( [key, value, selected] );
        });
        this.aisAvailable.sort( (a,b)=>{  
            let x= (a[1].name) ? a[1].name.toUpperCase() : 'zzz' + a[1].mmsi;
            let y= (b[1].name) ? b[1].name.toUpperCase() : 'zzz' + b[1].mmsi;
            return  x<=y ? -1 : 1;
        });
        this.checkSelections();
        this.filterList= this.aisAvailable.slice(0);
    }   
    
    checkSelections() {
        let c= false;
        let u= false;
        this.aisAvailable.forEach( i=> { 
            c= (i[2]) ? true : c;
            u= (!i[2]) ? true : u;
        });
        this.allSel= (c && !u) ? true : false;
        this.someSel= (c && u) ? true : false;        
    } 
    
    selectAll(value) {
        this.aisAvailable.forEach( i=> { i[2]=value} );
        this.someSel= false;
        this.allSel= (value) ? true : false;
        this.emitSelected();
    }    

    itemSelect(e, id) { 
        this.aisAvailable.forEach( i=> { 
            if(i[0]==id) { i[2]=e }
        });        
        this.checkSelections();
        this.emitSelected();
    }

    itemProperties(id) { this.properties.emit(id) }

    emitSelected() {
        let selection= this.aisAvailable.map( i=> { return (i[2]==true) ? i[0] : null } )
            .filter(i=>{ return i});
        if(this.allSel) { selection=null }
        this.select.emit(selection);
    }

    filterKeyUp(e) {
        this.filterText=e;
        console.log(this.filterText);
        this.filterList= this.aisAvailable.filter( i=> {
            let n= (i[1].name) ? i[1].name.toUpperCase() : i[1].mmsi;
            if(n.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                return i;
            }
        });
    }

}
