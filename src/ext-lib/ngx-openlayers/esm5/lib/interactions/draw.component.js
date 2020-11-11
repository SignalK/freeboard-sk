/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, EventEmitter, Output } from '@angular/core';
import { MapComponent } from '../map.component';
import { Draw } from 'ol/interaction';
import { Collection } from 'ol';
import { Vector } from 'ol/source';
import GeometryType from 'ol/geom/GeometryType';
import { GeometryFunction } from 'ol/interaction/Draw';
import { Condition } from 'ol/events/condition';
var DrawInteractionComponent = /** @class */ (function () {
    function DrawInteractionComponent(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onChangeActive = new EventEmitter();
        this.onDrawEnd = new EventEmitter();
        this.onDrawStart = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
    }
    /**
     * @return {?}
     */
    DrawInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Draw(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChange.emit(event); }));
        this.instance.on('change:active', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeActive.emit(event); }));
        this.instance.on('drawend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onDrawEnd.emit(event); }));
        this.instance.on('drawstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onDrawStart.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DrawInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DrawInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-draw',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DrawInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DrawInteractionComponent.propDecorators = {
        clickTolerance: [{ type: Input }],
        features: [{ type: Input }],
        source: [{ type: Input }],
        snapTolerance: [{ type: Input }],
        type: [{ type: Input }],
        maxPoints: [{ type: Input }],
        minPoints: [{ type: Input }],
        finishCondition: [{ type: Input }],
        style: [{ type: Input }],
        geometryFunction: [{ type: Input }],
        geometryName: [{ type: Input }],
        condition: [{ type: Input }],
        freehandCondition: [{ type: Input }],
        freehand: [{ type: Input }],
        wrapX: [{ type: Input }],
        onChange: [{ type: Output }],
        onChangeActive: [{ type: Output }],
        onDrawEnd: [{ type: Output }],
        onDrawStart: [{ type: Output }],
        onPropertyChange: [{ type: Output }]
    };
    return DrawInteractionComponent;
}());
export { DrawInteractionComponent };
if (false) {
    /** @type {?} */
    DrawInteractionComponent.prototype.instance;
    /** @type {?} */
    DrawInteractionComponent.prototype.clickTolerance;
    /** @type {?} */
    DrawInteractionComponent.prototype.features;
    /** @type {?} */
    DrawInteractionComponent.prototype.source;
    /** @type {?} */
    DrawInteractionComponent.prototype.snapTolerance;
    /** @type {?} */
    DrawInteractionComponent.prototype.type;
    /** @type {?} */
    DrawInteractionComponent.prototype.maxPoints;
    /** @type {?} */
    DrawInteractionComponent.prototype.minPoints;
    /** @type {?} */
    DrawInteractionComponent.prototype.finishCondition;
    /** @type {?} */
    DrawInteractionComponent.prototype.style;
    /** @type {?} */
    DrawInteractionComponent.prototype.geometryFunction;
    /** @type {?} */
    DrawInteractionComponent.prototype.geometryName;
    /** @type {?} */
    DrawInteractionComponent.prototype.condition;
    /** @type {?} */
    DrawInteractionComponent.prototype.freehandCondition;
    /** @type {?} */
    DrawInteractionComponent.prototype.freehand;
    /** @type {?} */
    DrawInteractionComponent.prototype.wrapX;
    /** @type {?} */
    DrawInteractionComponent.prototype.onChange;
    /** @type {?} */
    DrawInteractionComponent.prototype.onChangeActive;
    /** @type {?} */
    DrawInteractionComponent.prototype.onDrawEnd;
    /** @type {?} */
    DrawInteractionComponent.prototype.onDrawStart;
    /** @type {?} */
    DrawInteractionComponent.prototype.onPropertyChange;
    /**
     * @type {?}
     * @private
     */
    DrawInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhdy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9pbnRlcmFjdGlvbnMvZHJhdy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFxQixZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBVyxNQUFNLElBQUksQ0FBQztBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sWUFBWSxNQUFNLHNCQUFzQixDQUFDO0FBRWhELE9BQU8sRUFBYSxnQkFBZ0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWxFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVoRDtJQWlERSxrQ0FBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztRQVZyQyxhQUFRLEdBQUcsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUV6QyxtQkFBYyxHQUFHLElBQUksWUFBWSxFQUFhLENBQUM7UUFFL0MsY0FBUyxHQUFHLElBQUksWUFBWSxFQUFhLENBQUM7UUFFMUMsZ0JBQVcsR0FBRyxJQUFJLFlBQVksRUFBYSxDQUFDO1FBRTVDLHFCQUFnQixHQUFHLElBQUksWUFBWSxFQUFhLENBQUM7SUFFVCxDQUFDOzs7O0lBRXpDLDJDQUFROzs7SUFBUjtRQUFBLGlCQVFDO1FBUEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFROzs7O1FBQUUsVUFBQyxLQUFnQixJQUFLLE9BQUEsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQXpCLENBQXlCLEVBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlOzs7O1FBQUUsVUFBQyxLQUFnQixJQUFLLE9BQUEsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQS9CLENBQStCLEVBQUMsQ0FBQztRQUN6RixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxTQUFTOzs7O1FBQUUsVUFBQyxLQUFnQixJQUFLLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQTFCLENBQTBCLEVBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxXQUFXOzs7O1FBQUUsVUFBQyxLQUFnQixJQUFLLE9BQUEsS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQTVCLENBQTRCLEVBQUMsQ0FBQztRQUNsRixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0I7Ozs7UUFBRSxVQUFDLEtBQWdCLElBQUssT0FBQSxLQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFqQyxDQUFpQyxFQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsRCxDQUFDOzs7O0lBRUQsOENBQVc7OztJQUFYO1FBQ0UsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELENBQUM7O2dCQS9ERixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLHNCQUFzQjtvQkFDaEMsUUFBUSxFQUFFLEVBQUU7aUJBQ2I7Ozs7Z0JBYlEsWUFBWTs7O2lDQWlCbEIsS0FBSzsyQkFFTCxLQUFLO3lCQUVMLEtBQUs7Z0NBRUwsS0FBSzt1QkFFTCxLQUFLOzRCQUVMLEtBQUs7NEJBRUwsS0FBSztrQ0FFTCxLQUFLO3dCQUVMLEtBQUs7bUNBRUwsS0FBSzsrQkFFTCxLQUFLOzRCQUVMLEtBQUs7b0NBRUwsS0FBSzsyQkFFTCxLQUFLO3dCQUVMLEtBQUs7MkJBR0wsTUFBTTtpQ0FFTixNQUFNOzRCQUVOLE1BQU07OEJBRU4sTUFBTTttQ0FFTixNQUFNOztJQWtCVCwrQkFBQztDQUFBLEFBaEVELElBZ0VDO1NBNURZLHdCQUF3Qjs7O0lBQ25DLDRDQUFlOztJQUVmLGtEQUN3Qjs7SUFDeEIsNENBQytCOztJQUMvQiwwQ0FDZ0I7O0lBQ2hCLGlEQUN1Qjs7SUFDdkIsd0NBQ21COztJQUNuQiw2Q0FDbUI7O0lBQ25CLDZDQUNtQjs7SUFDbkIsbURBQzRCOztJQUM1Qix5Q0FDd0M7O0lBQ3hDLG9EQUNvQzs7SUFDcEMsZ0RBQ3NCOztJQUN0Qiw2Q0FDc0I7O0lBQ3RCLHFEQUM4Qjs7SUFDOUIsNENBQ21COztJQUNuQix5Q0FDZ0I7O0lBRWhCLDRDQUN5Qzs7SUFDekMsa0RBQytDOztJQUMvQyw2Q0FDMEM7O0lBQzFDLCtDQUM0Qzs7SUFDNUMsb0RBQ2lEOzs7OztJQUVyQyx1Q0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgRXZlbnRFbWl0dGVyLCBPdXRwdXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuaW1wb3J0IHsgRHJhdyB9IGZyb20gJ29sL2ludGVyYWN0aW9uJztcbmltcG9ydCB7IENvbGxlY3Rpb24sIEZlYXR1cmUgfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICdvbC9zb3VyY2UnO1xuaW1wb3J0IEdlb21ldHJ5VHlwZSBmcm9tICdvbC9nZW9tL0dlb21ldHJ5VHlwZSc7XG5pbXBvcnQgeyBTdHlsZSB9IGZyb20gJ29sL3N0eWxlJztcbmltcG9ydCB7IERyYXdFdmVudCwgR2VvbWV0cnlGdW5jdGlvbiB9IGZyb20gJ29sL2ludGVyYWN0aW9uL0RyYXcnO1xuaW1wb3J0IHsgU3R5bGVGdW5jdGlvbiB9IGZyb20gJ29sL3N0eWxlL1N0eWxlJztcbmltcG9ydCB7IENvbmRpdGlvbiB9IGZyb20gJ29sL2V2ZW50cy9jb25kaXRpb24nO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tZHJhdycsXG4gIHRlbXBsYXRlOiAnJyxcbn0pXG5leHBvcnQgY2xhc3MgRHJhd0ludGVyYWN0aW9uQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBpbnN0YW5jZTogRHJhdztcblxuICBASW5wdXQoKVxuICBjbGlja1RvbGVyYW5jZT86IG51bWJlcjtcbiAgQElucHV0KClcbiAgZmVhdHVyZXM/OiBDb2xsZWN0aW9uPEZlYXR1cmU+O1xuICBASW5wdXQoKVxuICBzb3VyY2U/OiBWZWN0b3I7XG4gIEBJbnB1dCgpXG4gIHNuYXBUb2xlcmFuY2U/OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHR5cGU6IEdlb21ldHJ5VHlwZTtcbiAgQElucHV0KClcbiAgbWF4UG9pbnRzPzogbnVtYmVyO1xuICBASW5wdXQoKVxuICBtaW5Qb2ludHM/OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGZpbmlzaENvbmRpdGlvbj86IENvbmRpdGlvbjtcbiAgQElucHV0KClcbiAgc3R5bGU/OiBTdHlsZSB8IFN0eWxlW10gfCBTdHlsZUZ1bmN0aW9uO1xuICBASW5wdXQoKVxuICBnZW9tZXRyeUZ1bmN0aW9uPzogR2VvbWV0cnlGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgZ2VvbWV0cnlOYW1lPzogc3RyaW5nO1xuICBASW5wdXQoKVxuICBjb25kaXRpb24/OiBDb25kaXRpb247XG4gIEBJbnB1dCgpXG4gIGZyZWVoYW5kQ29uZGl0aW9uPzogQ29uZGl0aW9uO1xuICBASW5wdXQoKVxuICBmcmVlaGFuZD86IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIHdyYXBYPzogYm9vbGVhbjtcblxuICBAT3V0cHV0KClcbiAgb25DaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPERyYXdFdmVudD4oKTtcbiAgQE91dHB1dCgpXG4gIG9uQ2hhbmdlQWN0aXZlID0gbmV3IEV2ZW50RW1pdHRlcjxEcmF3RXZlbnQ+KCk7XG4gIEBPdXRwdXQoKVxuICBvbkRyYXdFbmQgPSBuZXcgRXZlbnRFbWl0dGVyPERyYXdFdmVudD4oKTtcbiAgQE91dHB1dCgpXG4gIG9uRHJhd1N0YXJ0ID0gbmV3IEV2ZW50RW1pdHRlcjxEcmF3RXZlbnQ+KCk7XG4gIEBPdXRwdXQoKVxuICBvblByb3BlcnR5Q2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxEcmF3RXZlbnQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IERyYXcodGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbignY2hhbmdlJywgKGV2ZW50OiBEcmF3RXZlbnQpID0+IHRoaXMub25DaGFuZ2UuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2NoYW5nZTphY3RpdmUnLCAoZXZlbnQ6IERyYXdFdmVudCkgPT4gdGhpcy5vbkNoYW5nZUFjdGl2ZS5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbignZHJhd2VuZCcsIChldmVudDogRHJhd0V2ZW50KSA9PiB0aGlzLm9uRHJhd0VuZC5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbignZHJhd3N0YXJ0JywgKGV2ZW50OiBEcmF3RXZlbnQpID0+IHRoaXMub25EcmF3U3RhcnQuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ3Byb3BlcnR5Y2hhbmdlJywgKGV2ZW50OiBEcmF3RXZlbnQpID0+IHRoaXMub25Qcm9wZXJ0eUNoYW5nZS5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLmluc3RhbmNlKTtcbiAgfVxufVxuIl19