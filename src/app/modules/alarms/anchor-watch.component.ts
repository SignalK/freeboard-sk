import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'anchor-watch',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './anchor-watch.component.html',
    styleUrls: ['./anchor-watch.component.css']
})
export class AnchorWatchComponent {
    @Input() radius: number;
    @Input() min: number= 5;
    @Input() max: number= 100;
    @Input() feet: boolean= false;
    @Input() raised: boolean= true;
    @Input() disable: boolean= false;
    @Output() change: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    display= { sliderColor: 'primary' }

    constructor() { }

    ngOnInit() { this.display.sliderColor=(!this.raised) ? 'warn' : 'primary' }

    ngOnChanges(changes) { this.display.sliderColor=(!this.raised) ? 'warn' : 'primary' }

    setRadius(e:any) {
        this.radius= (this.feet) ? this.ftToM(e.value) : e.value;
        this.emitChange();
    }

    dropAnchor(e:any) {
        this.raised= !e.checked;
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
        this.emitChange(true);
    }    

    close() { this.closed.emit() }

    emitChange(raiseDrop:boolean=false) { 
        this.change.emit({
            radius: this.radius, 
            raised: this.raised,
            action: raiseDrop ? 'raised' : 'radius'
        })
    }

    mToFt(value) { return Math.round(value * 3.28084) }
    ftToM(value) { return Math.round(value / 3.28084) }

}

