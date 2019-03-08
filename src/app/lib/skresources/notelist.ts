import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AppInfo } from '../../app.info';

@Component({
    selector: 'note-list',
    templateUrl: './notelist.html',
    styleUrls: ['./resourcelist.css']
})
export class NoteListComponent {
    @Input() notes;
    @Output() select: EventEmitter<any>= new EventEmitter();
    @Output() refresh: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    filterList= [];
    filterText= '';
    someSel: boolean= false;
    showNotes: boolean= false;    

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
    }

    toggleMapDisplay(value) { this.app.config.notes=value; this.app.saveConfig(); }    

    viewNote(val) { this.select.emit(val) }

    itemRefresh() { this.refresh.emit() }

    filterKeyUp(e) {
        this.filterText=e;
        this.filterList= this.notes.filter( i=> {
            if(i[1].title.toLowerCase().indexOf(this.filterText.toLowerCase())!=-1) {
                return i;
            }
        });
    }

}

