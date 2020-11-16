/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component } from '@angular/core';
import { DragPan, DragZoom, PinchZoom, MouseWheelZoom, KeyboardPan, KeyboardZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
var FreeboardInteractionComponent = /** @class */ (function () {
    function FreeboardInteractionComponent(map) {
        this.map = map;
        this.interactions = [];
    }
    /**
     * @return {?}
     */
    FreeboardInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.interactions.push(new DragPan(this));
        this.interactions.push(new DragZoom(this));
        this.interactions.push(new PinchZoom(this));
        this.interactions.push(new MouseWheelZoom(this));
        this.interactions.push(new KeyboardPan(this));
        this.interactions.push(new KeyboardZoom(this));
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        function (i) { return _this.map.instance.addInteraction(i); }));
    };
    /**
     * @return {?}
     */
    FreeboardInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        function (i) { return _this.map.instance.removeInteraction(i); }));
    };
    FreeboardInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-freeboard',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    FreeboardInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    return FreeboardInteractionComponent;
}());
export { FreeboardInteractionComponent };
if (false) {
    /** @type {?} */
    FreeboardInteractionComponent.prototype.interactions;
    /**
     * @type {?}
     * @private
     */
    FreeboardInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJlZWJvYXJkLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2ludGVyYWN0aW9ucy9mcmVlYm9hcmQuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFxQixNQUFNLGVBQWUsQ0FBQztBQUM3RCxPQUFPLEVBQXlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUN4RCxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXRFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVoRDtJQU9JLHVDQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO1FBRnJDLGlCQUFZLEdBQXNCLEVBQUUsQ0FBQztJQUVHLENBQUM7Ozs7SUFFekMsZ0RBQVE7OztJQUFSO1FBQUEsaUJBUUM7UUFQRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU87Ozs7UUFBQyxVQUFBLENBQUMsSUFBSSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBbkMsQ0FBbUMsRUFBQyxDQUFDO0lBQ3hFLENBQUM7Ozs7SUFFRCxtREFBVzs7O0lBQVg7UUFBQSxpQkFFQztRQURHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTzs7OztRQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQXRDLENBQXNDLEVBQUMsQ0FBQztJQUMzRSxDQUFDOztnQkFyQkosU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSwyQkFBMkI7b0JBQ3JDLFFBQVEsRUFBRSxFQUFFO2lCQUNiOzs7O2dCQUxRLFlBQVk7O0lBd0JyQixvQ0FBQztDQUFBLEFBdEJELElBc0JDO1NBbEJZLDZCQUE2Qjs7O0lBQ3RDLHFEQUFxQzs7Ozs7SUFFekIsNENBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBPbkRlc3Ryb3ksIE9uSW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgZGVmYXVsdHMsIEludGVyYWN0aW9uLCBEcmFnUGFuLCBEcmFnWm9vbSwgUGluY2hab29tLFxuICAgIE1vdXNlV2hlZWxab29tLCBLZXlib2FyZFBhbiwgS2V5Ym9hcmRab29tIH0gZnJvbSAnb2wvaW50ZXJhY3Rpb24nO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiB9IGZyb20gJ29sJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tZnJlZWJvYXJkJyxcbiAgdGVtcGxhdGU6ICcnLFxufSlcbmV4cG9ydCBjbGFzcyBGcmVlYm9hcmRJbnRlcmFjdGlvbkNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25EZXN0cm95IHtcbiAgICBpbnRlcmFjdGlvbnM6IEFycmF5PEludGVyYWN0aW9uPj0gW107XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwQ29tcG9uZW50KSB7fVxuXG4gICAgbmdPbkluaXQoKSB7XG4gICAgICAgIHRoaXMuaW50ZXJhY3Rpb25zLnB1c2gobmV3IERyYWdQYW4odGhpcykpO1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5wdXNoKG5ldyBEcmFnWm9vbSh0aGlzKSk7XG4gICAgICAgIHRoaXMuaW50ZXJhY3Rpb25zLnB1c2gobmV3IFBpbmNoWm9vbSh0aGlzKSk7XG4gICAgICAgIHRoaXMuaW50ZXJhY3Rpb25zLnB1c2gobmV3IE1vdXNlV2hlZWxab29tKHRoaXMpKTtcbiAgICAgICAgdGhpcy5pbnRlcmFjdGlvbnMucHVzaChuZXcgS2V5Ym9hcmRQYW4odGhpcykpO1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5wdXNoKG5ldyBLZXlib2FyZFpvb20odGhpcykpO1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5mb3JFYWNoKGkgPT4gdGhpcy5tYXAuaW5zdGFuY2UuYWRkSW50ZXJhY3Rpb24oaSkpO1xuICAgIH1cblxuICAgIG5nT25EZXN0cm95KCkge1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5mb3JFYWNoKGkgPT4gdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlSW50ZXJhY3Rpb24oaSkpO1xuICAgIH1cbn1cbiJdfQ==