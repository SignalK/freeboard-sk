import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { AppInfo } from '../../app.info';

@Component({
    selector: 'anchor-watch',
    templateUrl: './anchorwatch.html',
    styleUrls: ['./resourcelist.css']
})
export class AnchorWatchComponent {
    @Input() radius: number;
    @Input() min: number= 5;
    @Input() max: number= 100;
    @Input() feet: boolean= false;
    @Input() raised: boolean= true;
    @Output() change: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    display= { sliderColor: 'primary' }

    constructor(public app: AppInfo) { }

    ngOnInit() { 
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
    }

    ngOnChanges( changes ) {
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
    }

    setRadius(e) {
        this.radius= (this.feet) ? this.ftToM(e.value) : e.value;
        this.emitChange();
    }

    dropAnchor(e) {
        this.raised= !e.checked;
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
        this.emitChange(true);
    }    

    close() { this.closed.emit() }

    emitChange(raiseDrop=false) { 
        this.change.emit({
            radius: this.radius, 
            raised: this.raised,
            action: raiseDrop ? 'raised' : 'radius'
        })
    }

    mToFt(value) { return Math.round(value * 3.28084) }
    ftToM(value) { return Math.round(value / 3.28084) }

}

