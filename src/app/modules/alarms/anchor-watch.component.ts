import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'anchor-watch',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './anchor-watch.component.html',
    styleUrls: ['./anchor-watch.component.css']
})
export class AnchorWatchComponent {
    @Input() sliderValue: number;
    @Input() radius: number;
    @Input() min: number= 5;
    @Input() max: number= 100;
    @Input() feet: boolean= false;
    @Input() raised: boolean= true;
    @Input() disable: boolean= false;
    @Output() change: EventEmitter<any>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();

    bgImage: string;
    display= { sliderColor: 'primary' }
    msg= {radius: null, raised: true}

    constructor() { }

    ngOnInit() { 
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
        this.msg.radius= this.sliderValue;
    }

    ngAfterViewInit() { }

    ngOnChanges(changes) { 
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
        this.bgImage= `url('${(this.raised) ? './assets/img/anchor-radius-raised.png' : './assets/img/anchor-radius.png'}')`;
    }

    setRadius(e:any) {
        console.log( 'raw:', e.value);
        console.log( 'converted:', (this.feet) ? this.ftToM(e.value) : e.value);
        this.msg.radius= (this.feet) ? this.ftToM(e.value) : e.value;
    }

    dropAnchor(e:any) {
        this.raised= !e.checked;
        this.display.sliderColor=(!this.raised) ? 'warn' : 'primary';
        this.msg.raised= this.raised;
        this.change.emit(this.msg);
    }    

    close() { this.closed.emit() }

    mToFt(value:number) { return Math.round(value * 3.28084) }
    ftToM(value:number) { return Math.round(value / 3.28084) }

}

