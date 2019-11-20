/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { ZoomToExtent } from 'ol/control';
import { MapComponent } from '../map.component';
import { Extent } from 'ol/extent';
var ControlZoomToExtentComponent = /** @class */ (function () {
    function ControlZoomToExtentComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-zoomtoextent');
    }
    /**
     * @return {?}
     */
    ControlZoomToExtentComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new ZoomToExtent(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlZoomToExtentComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-zoomtoextent');
        this.map.instance.removeControl(this.instance);
    };
    ControlZoomToExtentComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-zoomtoextent',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlZoomToExtentComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlZoomToExtentComponent.propDecorators = {
        className: [{ type: Input }],
        label: [{ type: Input }],
        tipLabel: [{ type: Input }],
        extent: [{ type: Input }]
    };
    return ControlZoomToExtentComponent;
}());
export { ControlZoomToExtentComponent };
if (false) {
    /** @type {?} */
    ControlZoomToExtentComponent.prototype.instance;
    /** @type {?} */
    ControlZoomToExtentComponent.prototype.className;
    /** @type {?} */
    ControlZoomToExtentComponent.prototype.label;
    /** @type {?} */
    ControlZoomToExtentComponent.prototype.tipLabel;
    /** @type {?} */
    ControlZoomToExtentComponent.prototype.extent;
    /**
     * @type {?}
     * @private
     */
    ControlZoomToExtentComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9vbXRvZXh0ZW50LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2NvbnRyb2xzL3pvb210b2V4dGVudC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFxQixNQUFNLGVBQWUsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRW5DO0lBa0JFLHNDQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO1FBQ25DLHNEQUFzRDtJQUN4RCxDQUFDOzs7O0lBRUQsK0NBQVE7OztJQUFSO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Ozs7SUFFRCxrREFBVzs7O0lBQVg7UUFDRSxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDOztnQkE5QkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSwwQkFBMEI7b0JBQ3BDLFFBQVEsRUFBRSxxQ0FFVDtpQkFDRjs7OztnQkFSUSxZQUFZOzs7NEJBWWxCLEtBQUs7d0JBRUwsS0FBSzsyQkFFTCxLQUFLO3lCQUVMLEtBQUs7O0lBZ0JSLG1DQUFDO0NBQUEsQUEvQkQsSUErQkM7U0F6QlksNEJBQTRCOzs7SUFDdkMsZ0RBQXVCOztJQUV2QixpREFDa0I7O0lBQ2xCLDZDQUNxQjs7SUFDckIsZ0RBQ2lCOztJQUNqQiw4Q0FDZTs7Ozs7SUFFSCwyQ0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgWm9vbVRvRXh0ZW50IH0gZnJvbSAnb2wvY29udHJvbCc7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuLi9tYXAuY29tcG9uZW50JztcbmltcG9ydCB7IEV4dGVudCB9IGZyb20gJ29sL2V4dGVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1jb250cm9sLXpvb210b2V4dGVudCcsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBDb250cm9sWm9vbVRvRXh0ZW50Q29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBpbnN0YW5jZTogWm9vbVRvRXh0ZW50O1xuXG4gIEBJbnB1dCgpXG4gIGNsYXNzTmFtZTogc3RyaW5nO1xuICBASW5wdXQoKVxuICBsYWJlbDogc3RyaW5nIHwgTm9kZTtcbiAgQElucHV0KClcbiAgdGlwTGFiZWw6IHN0cmluZztcbiAgQElucHV0KClcbiAgZXh0ZW50OiBFeHRlbnQ7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdpbnN0YW5jaW5nIGFvbC1jb250cm9sLXpvb210b2V4dGVudCcpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBab29tVG9FeHRlbnQodGhpcyk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkQ29udHJvbCh0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdyZW1vdmluZyBhb2wtY29udHJvbC16b29tdG9leHRlbnQnKTtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVDb250cm9sKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=