/** GRIB Components **
********************************/

import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { SKResources } from '../resources.service';
import { GRIB_CATEGORIES } from './grib';

/********* GRIBPanel **********/
@Component({
	selector: 'grib-panel',
	template: `
        <div class="grib-panel">
            <div class="pad"></div>
            <div style="padding: 0 10px 0 10px;">
                <div style="display:flex;">
                    <div style="padding-top:10px;">
                        <button mat-icon-button color="primary"
                            (click)="next(true)"
                            [disabled]="(display.activeIndex==0)">
                            <mat-icon>arrow_back_ios</mat-icon></button>
                    </div>
                    <div style="line-height: 2.5em;">
                        <mat-form-field style="min-width:200px;">
                            <mat-select #grib 
                                    [(value)]="display.id" 
                                    (selectionChange)="selected($event, grib)">
                                <mat-option *ngFor="let g of gribList; let i=index" 
                                        [value]="g[0]">
                                    {{formatDate(g[1])}}
                                </mat-option>
                            </mat-select>                                        
                        </mat-form-field>
                    </div>
                    <div style="padding-top:10px;">
                        <button mat-icon-button color="primary"
                            (click)="next()"
                            [disabled]="(display.activeIndex >= gribList.length-1)">
                            <mat-icon>arrow_forward_ios</mat-icon>
                        </button>
                    </div>                                        
                </div>        
                <div style="padding-left:5px;">
                    <div *ngFor="let i of display.content | keyvalue">
                        <mat-checkbox color="primary" 
                            [disabled]="selections[i.key].disabled"
                            [checked]="selections[i.key].selected"
                            (change)="checkChange($event, i.key, i.value.index)">
                            {{i.key}}
                        </mat-checkbox>
                    </div>
                </div>
            </div>	
            <div class="pad"></div>	
        </div>	
    `,
    styles: [`  .grib-panel {
                    font-family: roboto;
                    display: flex;
                }
                .grib-panel .pad {
                    flex: 1 1 auto;
                }
                @media only screen
                    and (min-device-width : 768px)
                    and (max-device-width : 1024px),
                    only screen	and (min-width : 800px) {                  
                }                 	
			`]
})
export class GRIBPanel implements OnInit {
    
    public gribList:any= [];
    public gribActive:any;
    public display= {
        id: null,
        activeIndex: 0,
        day: '',
        hour: '',
        content: {}
    }
    public selections= {}; // selected entries

    @Output() change:EventEmitter<any>= new EventEmitter();

    constructor(private skres: SKResources) { }
	
	//** lifecycle: events **
    ngOnInit() { 
        // initialise selections
        GRIB_CATEGORIES.forEach( v=> { 
            this.selections[v.name]= {selected: false, disabled: true }
            this.display.content[v.name]= {}
        });
        this.refresh();
    } 

    // get list of GRIB resources **
    refresh() {
        this.skres.getGRIBList().subscribe( r=> {
            this.gribList=  Object.entries(r);
            this.updateDisplay();
        })
    }

    formatDate(value:any) {
        let dt= new Date(value['contents'][0]['refTime']);
        return `${dt.getUTCFullYear()}/${dt.getUTCMonth()+1}/${dt.getUTCDate()} ${dt.getUTCHours()}:${('00' + dt.getUTCMinutes()).slice(-2)} UTC`;
    }

    // ** display selected resource information **
    updateDisplay(idx:number= this.display.activeIndex) {
        this.gribActive= (this.gribList) ? this.gribList[idx] : null;
        if(!this.gribActive) { return }
        this.display.id= this.gribActive[0];
        // disable check boxes / init content
        GRIB_CATEGORIES.forEach( v=> { 
            this.selections[v.name].disabled= true;
            this.display.content[v.name]= {index: null, type: null} 
        });
        // check for supported content
        let eidx:number= 0;
        this.gribActive[1]['contents'].forEach( i=> {
            if(GRIB_CATEGORIES.has(i['parameterCategory']) ) {
                let cat= GRIB_CATEGORIES.get(i['parameterCategory']);
                if( cat.params.includes(i['parameterNumber']) ) {
                    if(this.display.content[cat.name]['index']===null) {
                        this.display.content[cat.name]['index']= eidx;
                        this.display.content[cat.name]['type']= `(${i['genProcessTypeName']})`;
                    }
                    else { this.display.content[cat.name]['index']+= `-${eidx}` }
                    this.selections[cat.name].disabled= false
                }
                if( this.selections[cat.name].disabled ) { 
                    this.selections[cat.name].selected=false;
                }
            }  
            eidx++;           
        });
    }

    // ** select next/ previous GRIB
    next(prev:boolean= false) { 
        if(typeof prev==='boolean') {
            if(prev) {
                this.display.activeIndex= (this.display.activeIndex!=0) 
                    ? this.display.activeIndex - 1 : 0;
            }
            else {
                this.display.activeIndex= (this.display.activeIndex < this.gribList.length-1) 
                    ? this.display.activeIndex + 1 
                    : this.display.activeIndex;
            }
        }
        this.updateDisplay();
        this.emitChange(); 
    }

    // ** selected from drop down
    selected(e:any, f:any) {
        let idx:number=0;
        let selidx:number;
        this.gribList.forEach(i=>{
            if(i[0]==f.value) { selidx=idx }
            idx++;
        });
        this.updateDisplay(selidx);
        this.emitChange();
    }

    // ** handle selection change
    checkChange(e:any, key:string, value:any) {
        this.selections[key].selected= e.checked;
        this.emitChange();      
    }

    emitChange() {
        let content={};
        GRIB_CATEGORIES.forEach( v=> { 
            content[v.name]= (this.selections[v.name].selected) 
                ? this.display.content[v.name]['index'] : null;

        });
        this.change.emit({id: this.gribActive[0], content: content})  
        
    }

}
