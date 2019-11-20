/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { DragZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
var DragZoomInteractionComponent = /** @class */ (function () {
    function DragZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragZoomInteractionComponent.propDecorators = {
        className: [{ type: Input }],
        condition: [{ type: Input }],
        duration: [{ type: Input }],
        out: [{ type: Input }]
    };
    return DragZoomInteractionComponent;
}());
export { DragZoomInteractionComponent };
if (false) {
    /** @type {?} */
    DragZoomInteractionComponent.prototype.instance;
    /** @type {?} */
    DragZoomInteractionComponent.prototype.className;
    /** @type {?} */
    DragZoomInteractionComponent.prototype.condition;
    /** @type {?} */
    DragZoomInteractionComponent.prototype.duration;
    /** @type {?} */
    DragZoomInteractionComponent.prototype.out;
    /**
     * @type {?}
     * @private
     */
    DragZoomInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhZ3pvb20uY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvaW50ZXJhY3Rpb25zL2RyYWd6b29tLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBcUIsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWhEO0lBZ0JFLHNDQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO0lBQUcsQ0FBQzs7OztJQUV6QywrQ0FBUTs7O0lBQVI7UUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQzs7OztJQUVELGtEQUFXOzs7SUFBWDtRQUNFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDOztnQkF6QkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSwwQkFBMEI7b0JBQ3BDLFFBQVEsRUFBRSxFQUFFO2lCQUNiOzs7O2dCQU5RLFlBQVk7Ozs0QkFVbEIsS0FBSzs0QkFFTCxLQUFLOzJCQUVMLEtBQUs7c0JBRUwsS0FBSzs7SUFhUixtQ0FBQztDQUFBLEFBMUJELElBMEJDO1NBdEJZLDRCQUE0Qjs7O0lBQ3ZDLGdEQUFtQjs7SUFFbkIsaURBQ2tCOztJQUNsQixpREFDcUI7O0lBQ3JCLGdEQUNpQjs7SUFDakIsMkNBQ2E7Ozs7O0lBRUQsMkNBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBPbkRlc3Ryb3ksIE9uSW5pdCwgSW5wdXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IERyYWdab29tIH0gZnJvbSAnb2wvaW50ZXJhY3Rpb24nO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBDb25kaXRpb24gfSBmcm9tICdvbC9ldmVudHMvY29uZGl0aW9uJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLWludGVyYWN0aW9uLWRyYWd6b29tJyxcbiAgdGVtcGxhdGU6ICcnLFxufSlcbmV4cG9ydCBjbGFzcyBEcmFnWm9vbUludGVyYWN0aW9uQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBpbnN0YW5jZTogRHJhZ1pvb207XG5cbiAgQElucHV0KClcbiAgY2xhc3NOYW1lOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGNvbmRpdGlvbjogQ29uZGl0aW9uO1xuICBASW5wdXQoKVxuICBkdXJhdGlvbjogbnVtYmVyO1xuICBASW5wdXQoKVxuICBvdXQ6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IERyYWdab29tKHRoaXMpO1xuICAgIHRoaXMubWFwLmluc3RhbmNlLmFkZEludGVyYWN0aW9uKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==