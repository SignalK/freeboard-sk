import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { AppInfo } from 'src/app/app.info';

@Component({
    selector: 'note-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './notelist.html',
    styleUrls: ['./resourcelist.css']
})
export class NoteListComponent {
    @Input() notes;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() refresh: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();
    @Output() pan: EventEmitter<{center:[number,number], zoomLevel:number}>= new EventEmitter();

    filterList= [];
    filterText= '';
    someSel: boolean= false;
    showNotes: boolean= false;  
    draftOnly: boolean= false;  

    constructor(public app:AppInfo) { }

    ngOnInit() { 
        this.showNotes= this.app.config.notes;
        this.initItems();
    }

    ngOnChanges() { this.initItems() }

    close() { this.closed.emit() }

    initItems() {
        this.filterList= this.notes;
        this.filterList.sort( (a,b)=>{ 
            let x=a[1].title.toUpperCase();
            let y= b[1].title.toUpperCase();
            return  x<=y ? -1 : 1;
        });
        if(this.draftOnly) { this.filterDraftOnly() }
    }

    toggleMapDisplay(value:boolean) { this.app.config.notes=value; this.app.saveConfig(); }    

    viewNote(val:string, isGroup:boolean=false) { this.select.emit( {id:val, isGroup: isGroup} ) }

    itemRefresh() { this.refresh.emit() }

    emitCenter(position) { 
        let zoomTo= (this.app.config.map.zoomLevel<this.app.config.selections.notesMinZoom) ?
            this.app.config.selections.notesMinZoom : null;
        this.pan.emit({center: [position.longitude, position.latitude], zoomLevel: zoomTo});
    }

    filterKeyUp(e) {
        this.filterText=e;
        this.filterList= this.notes.filter( i=> {
            if(i[1].title.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                return i;
            }
        });
        if(this.draftOnly) { this.filterDraftOnly() }
    }

    filterDraftOnly() {
        this.filterList= this.filterList.filter( i=> {
            if(i[1].properties && i[1].properties.draft) {
                return i;
            }
        });             
    }

    toggleDraftOnly() {
        this.draftOnly= !this.draftOnly;
        if(this.draftOnly) { this.filterDraftOnly() }
        else { this.filterKeyUp('') }
    }
}

