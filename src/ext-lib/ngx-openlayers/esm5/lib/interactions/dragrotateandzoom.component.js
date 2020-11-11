/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { DragRotateAndZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
var DragRotateAndZoomInteractionComponent = /** @class */ (function () {
    function DragRotateAndZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragRotateAndZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragRotateAndZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragRotateAndZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragRotateAndZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragrotateandzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragRotateAndZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragRotateAndZoomInteractionComponent.propDecorators = {
        condition: [{ type: Input }],
        duration: [{ type: Input }]
    };
    return DragRotateAndZoomInteractionComponent;
}());
export { DragRotateAndZoomInteractionComponent };
if (false) {
    /** @type {?} */
    DragRotateAndZoomInteractionComponent.prototype.instance;
    /** @type {?} */
    DragRotateAndZoomInteractionComponent.prototype.condition;
    /** @type {?} */
    DragRotateAndZoomInteractionComponent.prototype.duration;
    /**
     * @type {?}
     * @private
     */
    DragRotateAndZoomInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhZ3JvdGF0ZWFuZHpvb20uY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvaW50ZXJhY3Rpb25zL2RyYWdyb3RhdGVhbmR6b29tLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBcUIsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFaEQ7SUFZRSwrQ0FBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztJQUFHLENBQUM7Ozs7SUFFekMsd0RBQVE7OztJQUFSO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQzs7OztJQUVELDJEQUFXOzs7SUFBWDtRQUNFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDOztnQkFyQkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSxtQ0FBbUM7b0JBQzdDLFFBQVEsRUFBRSxFQUFFO2lCQUNiOzs7O2dCQU5RLFlBQVk7Ozs0QkFVbEIsS0FBSzsyQkFFTCxLQUFLOztJQWFSLDRDQUFDO0NBQUEsQUF0QkQsSUFzQkM7U0FsQlkscUNBQXFDOzs7SUFDaEQseURBQTRCOztJQUU1QiwwREFDcUI7O0lBQ3JCLHlEQUNpQjs7Ozs7SUFFTCxvREFBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIE9uRGVzdHJveSwgT25Jbml0LCBJbnB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgRHJhZ1JvdGF0ZUFuZFpvb20gfSBmcm9tICdvbC9pbnRlcmFjdGlvbic7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuLi9tYXAuY29tcG9uZW50JztcbmltcG9ydCB7IENvbmRpdGlvbiB9IGZyb20gJ29sL2V2ZW50cy9jb25kaXRpb24nO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tZHJhZ3JvdGF0ZWFuZHpvb20nLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIERyYWdSb3RhdGVBbmRab29tSW50ZXJhY3Rpb25Db21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIGluc3RhbmNlOiBEcmFnUm90YXRlQW5kWm9vbTtcblxuICBASW5wdXQoKVxuICBjb25kaXRpb246IENvbmRpdGlvbjtcbiAgQElucHV0KClcbiAgZHVyYXRpb246IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwQ29tcG9uZW50KSB7fVxuXG4gIG5nT25Jbml0KCkge1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgRHJhZ1JvdGF0ZUFuZFpvb20odGhpcyk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLmluc3RhbmNlKTtcbiAgfVxufVxuIl19