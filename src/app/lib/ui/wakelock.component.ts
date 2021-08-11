/***********************************
wakelock component
    <wakelock>
***********************************/
import {Component, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter} from '@angular/core';

@Component({
    selector: 'wakelock',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: [``],
    template:  `
    <div *ngIf="isSupported">
        <button mat-mini-fab [color]="state ? 'warn' : ''"
            [matTooltip]="tipText"
            matTooltipPosition="left"
            (click)="toggle()">
            <mat-icon>{{state ? 'visibility' : 'visibility_off'}}</mat-icon>
        </button>
    </div>       						 
    `
})
export class WakeLockComponent  {
    @Input() tooltipText: string= 'Prevent device from sleeping.';
    @Input() setOn: boolean= false;
    @Output() has: EventEmitter<boolean>= new EventEmitter();
    @Output() change: EventEmitter<boolean>= new EventEmitter();

    public isSupported: boolean= false;
    public wakeLockRef: any= null;
    public state: boolean= false;
    public tipText: string;
    private tipTextSet: string= 'Preventing sleep.'

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        if('wakeLock' in navigator) {
            this.isSupported = true;
        }
        else {
            this.isSupported = false;
        }
        this.tipText= this.tooltipText;
        if(this.setOn) { 
            this.toggle();
        }
    }

    ngAfterViewInit() {
        this.has.emit(this.isSupported);
    }

    ngOnDestroy() {
        this.releaseLock();
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    ngOnChanges() { 
        if(!this.isSupported) { return }
        if(this.setOn) {
            this.requestLock();
        }
        else {
            this.releaseLock();
        }
    }

    toggle() {
        if(this.wakeLockRef) { this.releaseLock() }
        else { this.requestLock() }
    }

    requestLock() {
        if(this.wakeLockRef) { return };
        (navigator as any).wakeLock.request('screen')
        .then( (w:any)=> {
            this.wakeLockRef= w; 
            this.state= true;
            this.tipText= this.tipTextSet;
            // listen for release
            this.wakeLockRef.addEventListener('release', this.onRelease);
            // listen for visibility change
            document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
            this.cdr.detectChanges();
            this.change.emit(this.state);
        })
        .catch( (err:Error)=> {
            this.wakeLockRef= null;
            this.state= false;
            this.tipText= this.tooltipText;
            this.change.emit(this.state);
        });
    }

    releaseLock() {
        if(this.wakeLockRef) {
            this.wakeLockRef.removeEventListener('release', this.onRelease);
            this.wakeLockRef.release().then(()=> {
                this.wakeLockRef= null;
                this.state= false;
                this.tipText= this.tooltipText;
                this.cdr.detectChanges();
                this.change.emit(this.state);
            });
        }
    }

    // ** event handlers **
    onRelease() {
        this.tipText= this.tooltipText;
        this.change.emit(false);
    }

    async onVisibilityChange() {
        if(this.wakeLockRef!== null && this.state && document.visibilityState === 'visible') {
            this.wakeLockRef= await (navigator as any).wakeLock.request('screen');
            this.tipText= this.tipTextSet;
            this.change.emit(true);
        }
    }

}
