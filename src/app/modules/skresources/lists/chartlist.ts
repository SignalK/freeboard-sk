import { Component, Input, Output, OnInit, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppInfo } from 'src/app/app.info';
import { ChartInfoDialog } from '../resource-dialogs';

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
    @Output() orderChange: EventEmitter<any>= new EventEmitter();

    filterList= [];
    filterText= '';
    someSel: boolean= false;
    allSel: boolean= false;    

    displayChartLayers: boolean= false;

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

    showChartLayers(show:boolean=false) { this.displayChartLayers= show }

    handleOrderChange(e:any) { this.orderChange.emit(e) }
}

/********* ChartLayersList***********/
@Component({
	selector: 'ap-chartlayers',
	template: `
        <div class="_ap-chartlayers">
            <div>
                <mat-card style="display:flex;line-height:2.3em;">
                    <div style="flex: 1 1 auto; padding-left:20px;text-align:center;
                            font-size: 10pt;font-style:italic;">
                            (drag to re-order)
                    </div>
                    <div style="font-style:italic; border-bottom:gray 1px solid;">
                        Top Layer
                    </div>                
                </mat-card>  
            </div>
            <div style="flex: 1 1 auto;position:relative;">
                <div style="overflow:hidden;height:100%;">
                    <div style="overflow:auto;" cdkDropList (cdkDropListDropped)="drop($event)">
                        <mat-card *ngFor="let ch of chartList; let i=index;" cdkDrag>
                            <div class="point-drop-placeholder" *cdkDragPlaceholder></div>

                            <div style="display:flex;" [style.cursor]="(i>0) ? 'pointer': 'initial'"> 
                                <div style="width:35px;">
                                    <mat-icon color="">{{isLocal(ch[1].tilemapUrl)}}</mat-icon>
                                </div>
                                <div style="flex: 1 1 auto;text-overflow: ellipsis;
                                            white-space: pre;overflow-x: hidden;">
                                    {{ch[1].name}}
                                </div>   
                                <div cdkDragHandle matTooltip="Drag to re-order charts">
                                    <mat-icon>drag_indicator</mat-icon>  
                                </div>  
                            </div>
                        </mat-card>
                    </div>
                </div>
            </div>
            <div>
                <mat-card style="display:flex;line-height:2.3em;">
                    <div></div>
                    <div style="flex: 1 1 auto; padding-left:20px;text-align:center;font-size: 10pt;
                                font-style: italic;">
                        (e.g. World Map)
                    </div>
                    <div style="font-style:italic; border-bottom:gray 1px solid;">
                        Base Layer 
                    </div>
                </mat-card>
            </div>
        </div>	
    `,
    styles: [`  ._ap-chartlayers {
                    font-family: roboto;
                    border: red 0px solid;
                    display: flex;
                    flex-direction: column;
                }
                .ap-confirm-icon { 
                    min-width: 35px;
                    max-width: 35px;
                    color: darkorange;
                    text-align: left;                    
                }
                .ap-confirm-icon .mat-icon { 
                    font-size: 25pt;
                }
                .point-drop-placeholder {
                    background: #ccc;
                    border: dotted 3px #999;
                    min-height: 80px;
                    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
                }
                .cdk-drag-preview {
                    background-color: whitesmoke;
                    box-sizing: border-box;
                    border-radius: 4px;
                    box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                                0 8px 10px 1px rgba(0, 0, 0, 0.14),
                                0 3px 14px 2px rgba(0, 0, 0, 0.12);
                }              	
			`]
})
export class ChartLayers implements OnInit {

    @Output() changed: EventEmitter<any>= new EventEmitter();

    constructor( public app:AppInfo ) {
    }

    chartList= [];
    
	//** lifecycle: events **
    ngOnInit() {
        this.chartList= this.app.data.charts.slice().reverse();
    }

    drop(e:CdkDragDrop<any>) {
        moveItemInArray(this.chartList, e.previousIndex, e.currentIndex);
        // update and save config
        this.app.data.charts= this.chartList.slice().reverse();
        this.app.config.selections.chartOrder= this.app.data.charts.map( i=> { return i[0] });
        this.app.saveConfig();
        this.changed.emit(this.app.config.selections.chartOrder);
        
    }
    
    isLocal(url:string) { return (url && url.indexOf('signalk')!=-1) ? 'map' : 'language' }
}

