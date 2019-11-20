/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { DragAndDrop } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { ProjectionLike } from 'ol/proj';
var DragAndDropInteractionComponent = /** @class */ (function () {
    function DragAndDropInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragAndDropInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragAndDrop(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragAndDropInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragAndDropInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-draganddrop',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragAndDropInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragAndDropInteractionComponent.propDecorators = {
        formatConstructors: [{ type: Input }],
        projection: [{ type: Input }],
        target: [{ type: Input }]
    };
    return DragAndDropInteractionComponent;
}());
export { DragAndDropInteractionComponent };
if (false) {
    /** @type {?} */
    DragAndDropInteractionComponent.prototype.instance;
    /** @type {?} */
    DragAndDropInteractionComponent.prototype.formatConstructors;
    /** @type {?} */
    DragAndDropInteractionComponent.prototype.projection;
    /** @type {?} */
    DragAndDropInteractionComponent.prototype.target;
    /**
     * @type {?}
     * @private
     */
    DragAndDropInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhZ2FuZGRyb3AuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvaW50ZXJhY3Rpb25zL2RyYWdhbmRkcm9wLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQXFCLE1BQU0sZUFBZSxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUV6QztJQWNFLHlDQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO0lBQUcsQ0FBQzs7OztJQUV6QyxrREFBUTs7O0lBQVI7UUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQzs7OztJQUVELHFEQUFXOzs7SUFBWDtRQUNFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDOztnQkF2QkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSw2QkFBNkI7b0JBQ3ZDLFFBQVEsRUFBRSxFQUFFO2lCQUNiOzs7O2dCQU5RLFlBQVk7OztxQ0FVbEIsS0FBSzs2QkFFTCxLQUFLO3lCQUVMLEtBQUs7O0lBYVIsc0NBQUM7Q0FBQSxBQXhCRCxJQXdCQztTQXBCWSwrQkFBK0I7OztJQUMxQyxtREFBc0I7O0lBRXRCLDZEQUM0Qzs7SUFDNUMscURBQzJCOztJQUMzQixpREFDZ0I7Ozs7O0lBRUosOENBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT25EZXN0cm95LCBPbkluaXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IERyYWdBbmREcm9wIH0gZnJvbSAnb2wvaW50ZXJhY3Rpb24nO1xuaW1wb3J0IEZlYXR1cmUgZnJvbSAnb2wvZm9ybWF0L0ZlYXR1cmUnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBQcm9qZWN0aW9uTGlrZSB9IGZyb20gJ29sL3Byb2onO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tZHJhZ2FuZGRyb3AnLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIERyYWdBbmREcm9wSW50ZXJhY3Rpb25Db21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIGluc3RhbmNlOiBEcmFnQW5kRHJvcDtcblxuICBASW5wdXQoKVxuICBmb3JtYXRDb25zdHJ1Y3RvcnM6ICgobjogRmVhdHVyZSkgPT4gYW55KVtdO1xuICBASW5wdXQoKVxuICBwcm9qZWN0aW9uOiBQcm9qZWN0aW9uTGlrZTtcbiAgQElucHV0KClcbiAgdGFyZ2V0OiBFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBEcmFnQW5kRHJvcCh0aGlzKTtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5hZGRJbnRlcmFjdGlvbih0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMubWFwLmluc3RhbmNlLnJlbW92ZUludGVyYWN0aW9uKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=