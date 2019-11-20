/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { MouseWheelZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
var MouseWheelZoomInteractionComponent = /** @class */ (function () {
    function MouseWheelZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    MouseWheelZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new MouseWheelZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    MouseWheelZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    MouseWheelZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-mousewheelzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    MouseWheelZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    MouseWheelZoomInteractionComponent.propDecorators = {
        duration: [{ type: Input }],
        timeout: [{ type: Input }],
        useAnchor: [{ type: Input }]
    };
    return MouseWheelZoomInteractionComponent;
}());
export { MouseWheelZoomInteractionComponent };
if (false) {
    /** @type {?} */
    MouseWheelZoomInteractionComponent.prototype.instance;
    /** @type {?} */
    MouseWheelZoomInteractionComponent.prototype.duration;
    /** @type {?} */
    MouseWheelZoomInteractionComponent.prototype.timeout;
    /** @type {?} */
    MouseWheelZoomInteractionComponent.prototype.useAnchor;
    /**
     * @type {?}
     * @private
     */
    MouseWheelZoomInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2V3aGVlbHpvb20uY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvaW50ZXJhY3Rpb25zL21vdXNld2hlZWx6b29tLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQXFCLE1BQU0sZUFBZSxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFaEQ7SUFhRSw0Q0FBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztJQUFHLENBQUM7Ozs7SUFFekMscURBQVE7OztJQUFSO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7Ozs7SUFFRCx3REFBVzs7O0lBQVg7UUFDRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsQ0FBQzs7Z0JBdEJGLFNBQVMsU0FBQztvQkFDVCxRQUFRLEVBQUUsZ0NBQWdDO29CQUMxQyxRQUFRLEVBQUUsRUFBRTtpQkFDYjs7OztnQkFMUSxZQUFZOzs7MkJBUWxCLEtBQUs7MEJBRUwsS0FBSzs0QkFFTCxLQUFLOztJQWFSLHlDQUFDO0NBQUEsQUF2QkQsSUF1QkM7U0FuQlksa0NBQWtDOzs7SUFDN0Msc0RBQXlCOztJQUN6QixzREFDaUI7O0lBQ2pCLHFEQUNnQjs7SUFDaEIsdURBQ21COzs7OztJQUVQLGlEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSW5wdXQsIE9uRGVzdHJveSwgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBNb3VzZVdoZWVsWm9vbSB9IGZyb20gJ29sL2ludGVyYWN0aW9uJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tbW91c2V3aGVlbHpvb20nLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIE1vdXNlV2hlZWxab29tSW50ZXJhY3Rpb25Db21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIGluc3RhbmNlOiBNb3VzZVdoZWVsWm9vbTtcbiAgQElucHV0KClcbiAgZHVyYXRpb246IG51bWJlcjtcbiAgQElucHV0KClcbiAgdGltZW91dDogbnVtYmVyO1xuICBASW5wdXQoKVxuICB1c2VBbmNob3I6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IE1vdXNlV2hlZWxab29tKHRoaXMpO1xuICAgIHRoaXMubWFwLmluc3RhbmNlLmFkZEludGVyYWN0aW9uKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==