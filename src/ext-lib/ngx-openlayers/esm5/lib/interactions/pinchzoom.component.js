/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { PinchZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
var PinchZoomInteractionComponent = /** @class */ (function () {
    function PinchZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    PinchZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new PinchZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    PinchZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    PinchZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-pinchzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    PinchZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    PinchZoomInteractionComponent.propDecorators = {
        duration: [{ type: Input }],
        constrainResolution: [{ type: Input }]
    };
    return PinchZoomInteractionComponent;
}());
export { PinchZoomInteractionComponent };
if (false) {
    /** @type {?} */
    PinchZoomInteractionComponent.prototype.instance;
    /** @type {?} */
    PinchZoomInteractionComponent.prototype.duration;
    /** @type {?} */
    PinchZoomInteractionComponent.prototype.constrainResolution;
    /**
     * @type {?}
     * @private
     */
    PinchZoomInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGluY2h6b29tLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2ludGVyYWN0aW9ucy9waW5jaHpvb20uY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFxQixLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVoRDtJQVlFLHVDQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO0lBQUcsQ0FBQzs7OztJQUV6QyxnREFBUTs7O0lBQVI7UUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQzs7OztJQUVELG1EQUFXOzs7SUFBWDtRQUNFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDOztnQkFyQkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSwyQkFBMkI7b0JBQ3JDLFFBQVEsRUFBRSxFQUFFO2lCQUNiOzs7O2dCQUxRLFlBQVk7OzsyQkFTbEIsS0FBSztzQ0FFTCxLQUFLOztJQWFSLG9DQUFDO0NBQUEsQUF0QkQsSUFzQkM7U0FsQlksNkJBQTZCOzs7SUFDeEMsaURBQW9COztJQUVwQixpREFDaUI7O0lBQ2pCLDREQUM2Qjs7Ozs7SUFFakIsNENBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBPbkRlc3Ryb3ksIE9uSW5pdCwgSW5wdXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFBpbmNoWm9vbSB9IGZyb20gJ29sL2ludGVyYWN0aW9uJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tcGluY2h6b29tJyxcbiAgdGVtcGxhdGU6ICcnLFxufSlcbmV4cG9ydCBjbGFzcyBQaW5jaFpvb21JbnRlcmFjdGlvbkNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25EZXN0cm95IHtcbiAgaW5zdGFuY2U6IFBpbmNoWm9vbTtcblxuICBASW5wdXQoKVxuICBkdXJhdGlvbjogbnVtYmVyO1xuICBASW5wdXQoKVxuICBjb25zdHJhaW5SZXNvbHV0aW9uOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBQaW5jaFpvb20odGhpcyk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLmluc3RhbmNlKTtcbiAgfVxufVxuIl19