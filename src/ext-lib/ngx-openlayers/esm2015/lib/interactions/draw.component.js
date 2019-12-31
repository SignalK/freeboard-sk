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
export class DrawInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
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
    ngOnInit() {
        this.instance = new Draw(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChange.emit(event)));
        this.instance.on('change:active', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChangeActive.emit(event)));
        this.instance.on('drawend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onDrawEnd.emit(event)));
        this.instance.on('drawstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onDrawStart.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DrawInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-draw',
                template: ''
            }] }
];
/** @nocollapse */
DrawInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhdy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9pbnRlcmFjdGlvbnMvZHJhdy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFxQixZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBVyxNQUFNLElBQUksQ0FBQztBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sWUFBWSxNQUFNLHNCQUFzQixDQUFDO0FBRWhELE9BQU8sRUFBYSxnQkFBZ0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWxFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQU1oRCxNQUFNLE9BQU8sd0JBQXdCOzs7O0lBNkNuQyxZQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO1FBVnJDLGFBQVEsR0FBRyxJQUFJLFlBQVksRUFBYSxDQUFDO1FBRXpDLG1CQUFjLEdBQUcsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUUvQyxjQUFTLEdBQUcsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUUxQyxnQkFBVyxHQUFHLElBQUksWUFBWSxFQUFhLENBQUM7UUFFNUMscUJBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQWEsQ0FBQztJQUVULENBQUM7Ozs7SUFFekMsUUFBUTtRQUNOLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUTs7OztRQUFFLENBQUMsS0FBZ0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlOzs7O1FBQUUsQ0FBQyxLQUFnQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVM7Ozs7UUFBRSxDQUFDLEtBQWdCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsV0FBVzs7OztRQUFFLENBQUMsS0FBZ0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQztRQUNsRixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0I7Ozs7UUFBRSxDQUFDLEtBQWdCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7Ozs7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELENBQUM7OztZQS9ERixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLHNCQUFzQjtnQkFDaEMsUUFBUSxFQUFFLEVBQUU7YUFDYjs7OztZQWJRLFlBQVk7Ozs2QkFpQmxCLEtBQUs7dUJBRUwsS0FBSztxQkFFTCxLQUFLOzRCQUVMLEtBQUs7bUJBRUwsS0FBSzt3QkFFTCxLQUFLO3dCQUVMLEtBQUs7OEJBRUwsS0FBSztvQkFFTCxLQUFLOytCQUVMLEtBQUs7MkJBRUwsS0FBSzt3QkFFTCxLQUFLO2dDQUVMLEtBQUs7dUJBRUwsS0FBSztvQkFFTCxLQUFLO3VCQUdMLE1BQU07NkJBRU4sTUFBTTt3QkFFTixNQUFNOzBCQUVOLE1BQU07K0JBRU4sTUFBTTs7OztJQXpDUCw0Q0FBZTs7SUFFZixrREFDd0I7O0lBQ3hCLDRDQUMrQjs7SUFDL0IsMENBQ2dCOztJQUNoQixpREFDdUI7O0lBQ3ZCLHdDQUNtQjs7SUFDbkIsNkNBQ21COztJQUNuQiw2Q0FDbUI7O0lBQ25CLG1EQUM0Qjs7SUFDNUIseUNBQ3dDOztJQUN4QyxvREFDb0M7O0lBQ3BDLGdEQUNzQjs7SUFDdEIsNkNBQ3NCOztJQUN0QixxREFDOEI7O0lBQzlCLDRDQUNtQjs7SUFDbkIseUNBQ2dCOztJQUVoQiw0Q0FDeUM7O0lBQ3pDLGtEQUMrQzs7SUFDL0MsNkNBQzBDOztJQUMxQywrQ0FDNEM7O0lBQzVDLG9EQUNpRDs7Ozs7SUFFckMsdUNBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT25EZXN0cm95LCBPbkluaXQsIEV2ZW50RW1pdHRlciwgT3V0cHV0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuLi9tYXAuY29tcG9uZW50JztcbmltcG9ydCB7IERyYXcgfSBmcm9tICdvbC9pbnRlcmFjdGlvbic7XG5pbXBvcnQgeyBDb2xsZWN0aW9uLCBGZWF0dXJlIH0gZnJvbSAnb2wnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnb2wvc291cmNlJztcbmltcG9ydCBHZW9tZXRyeVR5cGUgZnJvbSAnb2wvZ2VvbS9HZW9tZXRyeVR5cGUnO1xuaW1wb3J0IHsgU3R5bGUgfSBmcm9tICdvbC9zdHlsZSc7XG5pbXBvcnQgeyBEcmF3RXZlbnQsIEdlb21ldHJ5RnVuY3Rpb24gfSBmcm9tICdvbC9pbnRlcmFjdGlvbi9EcmF3JztcbmltcG9ydCB7IFN0eWxlRnVuY3Rpb24gfSBmcm9tICdvbC9zdHlsZS9TdHlsZSc7XG5pbXBvcnQgeyBDb25kaXRpb24gfSBmcm9tICdvbC9ldmVudHMvY29uZGl0aW9uJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLWludGVyYWN0aW9uLWRyYXcnLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIERyYXdJbnRlcmFjdGlvbkNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25EZXN0cm95IHtcbiAgaW5zdGFuY2U6IERyYXc7XG5cbiAgQElucHV0KClcbiAgY2xpY2tUb2xlcmFuY2U/OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGZlYXR1cmVzPzogQ29sbGVjdGlvbjxGZWF0dXJlPjtcbiAgQElucHV0KClcbiAgc291cmNlPzogVmVjdG9yO1xuICBASW5wdXQoKVxuICBzbmFwVG9sZXJhbmNlPzogbnVtYmVyO1xuICBASW5wdXQoKVxuICB0eXBlOiBHZW9tZXRyeVR5cGU7XG4gIEBJbnB1dCgpXG4gIG1heFBvaW50cz86IG51bWJlcjtcbiAgQElucHV0KClcbiAgbWluUG9pbnRzPzogbnVtYmVyO1xuICBASW5wdXQoKVxuICBmaW5pc2hDb25kaXRpb24/OiBDb25kaXRpb247XG4gIEBJbnB1dCgpXG4gIHN0eWxlPzogU3R5bGUgfCBTdHlsZVtdIHwgU3R5bGVGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgZ2VvbWV0cnlGdW5jdGlvbj86IEdlb21ldHJ5RnVuY3Rpb247XG4gIEBJbnB1dCgpXG4gIGdlb21ldHJ5TmFtZT86IHN0cmluZztcbiAgQElucHV0KClcbiAgY29uZGl0aW9uPzogQ29uZGl0aW9uO1xuICBASW5wdXQoKVxuICBmcmVlaGFuZENvbmRpdGlvbj86IENvbmRpdGlvbjtcbiAgQElucHV0KClcbiAgZnJlZWhhbmQ/OiBib29sZWFuO1xuICBASW5wdXQoKVxuICB3cmFwWD86IGJvb2xlYW47XG5cbiAgQE91dHB1dCgpXG4gIG9uQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxEcmF3RXZlbnQ+KCk7XG4gIEBPdXRwdXQoKVxuICBvbkNoYW5nZUFjdGl2ZSA9IG5ldyBFdmVudEVtaXR0ZXI8RHJhd0V2ZW50PigpO1xuICBAT3V0cHV0KClcbiAgb25EcmF3RW5kID0gbmV3IEV2ZW50RW1pdHRlcjxEcmF3RXZlbnQ+KCk7XG4gIEBPdXRwdXQoKVxuICBvbkRyYXdTdGFydCA9IG5ldyBFdmVudEVtaXR0ZXI8RHJhd0V2ZW50PigpO1xuICBAT3V0cHV0KClcbiAgb25Qcm9wZXJ0eUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8RHJhd0V2ZW50PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBEcmF3KHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2NoYW5nZScsIChldmVudDogRHJhd0V2ZW50KSA9PiB0aGlzLm9uQ2hhbmdlLmVtaXQoZXZlbnQpKTtcbiAgICB0aGlzLmluc3RhbmNlLm9uKCdjaGFuZ2U6YWN0aXZlJywgKGV2ZW50OiBEcmF3RXZlbnQpID0+IHRoaXMub25DaGFuZ2VBY3RpdmUuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2RyYXdlbmQnLCAoZXZlbnQ6IERyYXdFdmVudCkgPT4gdGhpcy5vbkRyYXdFbmQuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2RyYXdzdGFydCcsIChldmVudDogRHJhd0V2ZW50KSA9PiB0aGlzLm9uRHJhd1N0YXJ0LmVtaXQoZXZlbnQpKTtcbiAgICB0aGlzLmluc3RhbmNlLm9uKCdwcm9wZXJ0eWNoYW5nZScsIChldmVudDogRHJhd0V2ZW50KSA9PiB0aGlzLm9uUHJvcGVydHlDaGFuZ2UuZW1pdChldmVudCkpO1xuICAgIHRoaXMubWFwLmluc3RhbmNlLmFkZEludGVyYWN0aW9uKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==