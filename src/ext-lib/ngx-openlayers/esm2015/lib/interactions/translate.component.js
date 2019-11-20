/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Translate } from 'ol/interaction';
import { Collection } from 'ol';
import { MapComponent } from '../map.component';
export class TranslateInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
        this.onTranslateEnd = new EventEmitter();
        this.onTranslateStart = new EventEmitter();
        this.onTranslating = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Translate(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChange.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.instance.on('translateend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onTranslateEnd.emit(event)));
        this.instance.on('translatestart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onTranslateStart.emit(event)));
        this.instance.on('translating', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onTranslating.emit(event)));
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
TranslateInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-translate',
                template: ''
            }] }
];
/** @nocollapse */
TranslateInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
TranslateInteractionComponent.propDecorators = {
    features: [{ type: Input }],
    layers: [{ type: Input }],
    hitTolerance: [{ type: Input }],
    onChange: [{ type: Output }],
    onPropertyChange: [{ type: Output }],
    onTranslateEnd: [{ type: Output }],
    onTranslateStart: [{ type: Output }],
    onTranslating: [{ type: Output }]
};
if (false) {
    /** @type {?} */
    TranslateInteractionComponent.prototype.instance;
    /** @type {?} */
    TranslateInteractionComponent.prototype.features;
    /** @type {?} */
    TranslateInteractionComponent.prototype.layers;
    /** @type {?} */
    TranslateInteractionComponent.prototype.hitTolerance;
    /** @type {?} */
    TranslateInteractionComponent.prototype.onChange;
    /** @type {?} */
    TranslateInteractionComponent.prototype.onPropertyChange;
    /** @type {?} */
    TranslateInteractionComponent.prototype.onTranslateEnd;
    /** @type {?} */
    TranslateInteractionComponent.prototype.onTranslateStart;
    /** @type {?} */
    TranslateInteractionComponent.prototype.onTranslating;
    /**
     * @type {?}
     * @private
     */
    TranslateInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2ludGVyYWN0aW9ucy90cmFuc2xhdGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFxQixLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMxRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFVBQVUsRUFBVyxNQUFNLElBQUksQ0FBQztBQUd6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFNaEQsTUFBTSxPQUFPLDZCQUE2Qjs7OztJQXFCeEMsWUFBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztRQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksWUFBWSxFQUFrQixDQUFDO1FBQ25ELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBa0IsQ0FBQztRQUMzRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksWUFBWSxFQUFrQixDQUFDO1FBQ3pELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBa0IsQ0FBQztRQUMzRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksWUFBWSxFQUFrQixDQUFDO0lBQzFELENBQUM7Ozs7SUFFRCxRQUFRO1FBQ04sSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVwQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFROzs7O1FBQUUsQ0FBQyxLQUFxQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGdCQUFnQjs7OztRQUFFLENBQUMsS0FBcUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDO1FBQ2pHLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGNBQWM7Ozs7UUFBRSxDQUFDLEtBQXFCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUM7UUFDN0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCOzs7O1FBQUUsQ0FBQyxLQUFxQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUM7UUFDakcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsYUFBYTs7OztRQUFFLENBQUMsS0FBcUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQztRQUUzRixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7Ozs7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELENBQUM7OztZQS9DRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLDJCQUEyQjtnQkFDckMsUUFBUSxFQUFFLEVBQUU7YUFDYjs7OztZQUxRLFlBQVk7Ozt1QkFTbEIsS0FBSztxQkFFTCxLQUFLOzJCQUVMLEtBQUs7dUJBR0wsTUFBTTsrQkFFTixNQUFNOzZCQUVOLE1BQU07K0JBRU4sTUFBTTs0QkFFTixNQUFNOzs7O0lBakJQLGlEQUFvQjs7SUFFcEIsaURBQytCOztJQUMvQiwrQ0FDK0M7O0lBQy9DLHFEQUNzQjs7SUFFdEIsaURBQ3VDOztJQUN2Qyx5REFDK0M7O0lBQy9DLHVEQUM2Qzs7SUFDN0MseURBQytDOztJQUMvQyxzREFDNEM7Ozs7O0lBRWhDLDRDQUF5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgT25EZXN0cm95LCBPbkluaXQsIElucHV0LCBPdXRwdXQsIEV2ZW50RW1pdHRlciB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgVHJhbnNsYXRlIH0gZnJvbSAnb2wvaW50ZXJhY3Rpb24nO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiwgRmVhdHVyZSB9IGZyb20gJ29sJztcbmltcG9ydCB7IExheWVyIH0gZnJvbSAnb2wvbGF5ZXInO1xuaW1wb3J0IHsgVHJhbnNsYXRlRXZlbnQgfSBmcm9tICdvbC9pbnRlcmFjdGlvbi9UcmFuc2xhdGUnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1pbnRlcmFjdGlvbi10cmFuc2xhdGUnLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIFRyYW5zbGF0ZUludGVyYWN0aW9uQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBpbnN0YW5jZTogVHJhbnNsYXRlO1xuXG4gIEBJbnB1dCgpXG4gIGZlYXR1cmVzPzogQ29sbGVjdGlvbjxGZWF0dXJlPjtcbiAgQElucHV0KClcbiAgbGF5ZXJzPzogTGF5ZXJbXSB8ICgobGF5ZXI6IExheWVyKSA9PiBib29sZWFuKTtcbiAgQElucHV0KClcbiAgaGl0VG9sZXJhbmNlPzogbnVtYmVyO1xuXG4gIEBPdXRwdXQoKVxuICBvbkNoYW5nZTogRXZlbnRFbWl0dGVyPFRyYW5zbGF0ZUV2ZW50PjtcbiAgQE91dHB1dCgpXG4gIG9uUHJvcGVydHlDaGFuZ2U6IEV2ZW50RW1pdHRlcjxUcmFuc2xhdGVFdmVudD47XG4gIEBPdXRwdXQoKVxuICBvblRyYW5zbGF0ZUVuZDogRXZlbnRFbWl0dGVyPFRyYW5zbGF0ZUV2ZW50PjtcbiAgQE91dHB1dCgpXG4gIG9uVHJhbnNsYXRlU3RhcnQ6IEV2ZW50RW1pdHRlcjxUcmFuc2xhdGVFdmVudD47XG4gIEBPdXRwdXQoKVxuICBvblRyYW5zbGF0aW5nOiBFdmVudEVtaXR0ZXI8VHJhbnNsYXRlRXZlbnQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHtcbiAgICB0aGlzLm9uQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxUcmFuc2xhdGVFdmVudD4oKTtcbiAgICB0aGlzLm9uUHJvcGVydHlDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFRyYW5zbGF0ZUV2ZW50PigpO1xuICAgIHRoaXMub25UcmFuc2xhdGVFbmQgPSBuZXcgRXZlbnRFbWl0dGVyPFRyYW5zbGF0ZUV2ZW50PigpO1xuICAgIHRoaXMub25UcmFuc2xhdGVTdGFydCA9IG5ldyBFdmVudEVtaXR0ZXI8VHJhbnNsYXRlRXZlbnQ+KCk7XG4gICAgdGhpcy5vblRyYW5zbGF0aW5nID0gbmV3IEV2ZW50RW1pdHRlcjxUcmFuc2xhdGVFdmVudD4oKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgVHJhbnNsYXRlKHRoaXMpO1xuXG4gICAgdGhpcy5pbnN0YW5jZS5vbignY2hhbmdlJywgKGV2ZW50OiBUcmFuc2xhdGVFdmVudCkgPT4gdGhpcy5vbkNoYW5nZS5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbigncHJvcGVydHljaGFuZ2UnLCAoZXZlbnQ6IFRyYW5zbGF0ZUV2ZW50KSA9PiB0aGlzLm9uUHJvcGVydHlDaGFuZ2UuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ3RyYW5zbGF0ZWVuZCcsIChldmVudDogVHJhbnNsYXRlRXZlbnQpID0+IHRoaXMub25UcmFuc2xhdGVFbmQuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ3RyYW5zbGF0ZXN0YXJ0JywgKGV2ZW50OiBUcmFuc2xhdGVFdmVudCkgPT4gdGhpcy5vblRyYW5zbGF0ZVN0YXJ0LmVtaXQoZXZlbnQpKTtcbiAgICB0aGlzLmluc3RhbmNlLm9uKCd0cmFuc2xhdGluZycsIChldmVudDogVHJhbnNsYXRlRXZlbnQpID0+IHRoaXMub25UcmFuc2xhdGluZy5lbWl0KGV2ZW50KSk7XG5cbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5hZGRJbnRlcmFjdGlvbih0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMubWFwLmluc3RhbmNlLnJlbW92ZUludGVyYWN0aW9uKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=