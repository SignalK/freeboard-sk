import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog'
import { AppInfo } from 'src/app/app.info';
import { ChartInfoDialog, ChartLayersDialog} from '../resource-dialogs';

@Component({
    selector: 'chart-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chartlist.html',
    styleUrls: ['./resourcelist.css']
})
export class ChartListComponent {
    @Input() charts: Array<any>;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() refresh: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    filterList= [];
    filterText= '';
    someSel: boolean= false;
    allSel: boolean= false;    

    constructor(private app: AppInfo, private dialog: MatDialog) { }

    ngOnInit() { this.initItems() }

    ngOnChanges() { this.initItems() }

    close() { this.closed.emit() }

    initItems() {
        this.checkSelections();
        this.buildFilterList();
    }   

    buildFilterList(e?:any) {
        if(typeof e!=='undefined' || this.filterText) {
            if(typeof e!=='undefined') { this.filterText=e }
            this.filterList= this.charts.filter( i=> {
                if(i[1].name.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                    return i;
                }
            });
        }
        else { this.filterList= this.charts.slice(0) }
     
        this.filterList.sort( (a,b)=>{        
            let x=a[1].name.toUpperCase();
            let y= b[1].name.toUpperCase();
            return  x<=y ? -1 : 1;
        });
    }   
    
    isLocal(url) { return (url && url.indexOf('signalk')!=-1) ? 'map' : 'language' }

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
    
    selectAll(value:boolean) {
        this.charts.forEach( i=> { i[2]=value} );
        this.buildFilterList();
        this.someSel= false;
        this.allSel= (value) ? true : false;
        this.select.emit({id: 'all', value: value});
    }    

    itemSelect(e:boolean, id:string) { 
        this.charts.forEach( i=> { if(i[0]==id) { i[2]=e } });        
        this.checkSelections();
        this.buildFilterList();
        this.select.emit({id: id, value: e}) 
    }

    itemRefresh() { this.refresh.emit() }

    itemProperties(id:string) { 
        let ch= this.charts.filter( c=> { return ( c[0]==id) ? true : false })[0][1];
        this.dialog.open( ChartInfoDialog, { data: ch });
    }

    showChartLayers() { this.dialog.open(ChartLayersDialog) }
}

