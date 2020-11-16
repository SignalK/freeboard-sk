/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, EventEmitter, Output } from '@angular/core';
import View from 'ol/View';
import { MapComponent } from './map.component';
import { Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
var ViewComponent = /** @class */ (function () {
    function ViewComponent(host) {
        this.host = host;
        this.componentType = 'view';
        this.zoomAnimation = false;
        this.onChangeZoom = new EventEmitter();
        this.onChangeResolution = new EventEmitter();
        this.onChangeCenter = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ViewComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('creating ol.View instance with: ', this);
        this.instance = new View(this);
        this.host.instance.setView(this.instance);
        this.instance.on('change:zoom', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeZoom.emit(event); }));
        this.instance.on('change:resolution', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeResolution.emit(event); }));
        this.instance.on('change:center', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeCenter.emit(event); }));
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    ViewComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        /** @type {?} */
        var args = {};
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                switch (key) {
                    case 'rotation':
                        if (this.zoomAnimation) {
                            args[key] = changes[key].currentValue;
                        }
                        else {
                            properties[key] = changes[key].currentValue;
                        }
                        break;
                    case 'zoom':
                        /** Work-around: setting the zoom via setProperties does not work. */
                        if (this.zoomAnimation) {
                            args[key] = changes[key].currentValue;
                        }
                        else {
                            this.instance.setZoom(changes[key].currentValue);
                        }
                        break;
                    case 'projection':
                        this.instance = new View(this);
                        this.host.instance.setView(this.instance);
                        break;
                    default:
                        properties[key] = changes[key].currentValue;
                        break;
                }
                if (this.zoomAnimation && (typeof args['zoom'] !== 'undefined' ||
                    typeof args['rotation'] !== 'undefined')) {
                    this.instance.animate(args);
                }
            }
        }
        //console.log('changes detected in aol-view, setting new properties: ', properties);
        this.instance.setProperties(properties, false);
    };
    /**
     * @return {?}
     */
    ViewComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-view');
    };
    ViewComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-view',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ViewComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ViewComponent.propDecorators = {
        constrainRotation: [{ type: Input }],
        enableRotation: [{ type: Input }],
        extent: [{ type: Input }],
        maxResolution: [{ type: Input }],
        minResolution: [{ type: Input }],
        maxZoom: [{ type: Input }],
        minZoom: [{ type: Input }],
        resolution: [{ type: Input }],
        resolutions: [{ type: Input }],
        rotation: [{ type: Input }],
        zoom: [{ type: Input }],
        zoomFactor: [{ type: Input }],
        center: [{ type: Input }],
        projection: [{ type: Input }],
        zoomAnimation: [{ type: Input }],
        onChangeZoom: [{ type: Output }],
        onChangeResolution: [{ type: Output }],
        onChangeCenter: [{ type: Output }]
    };
    return ViewComponent;
}());
export { ViewComponent };
if (false) {
    /** @type {?} */
    ViewComponent.prototype.instance;
    /** @type {?} */
    ViewComponent.prototype.componentType;
    /** @type {?} */
    ViewComponent.prototype.constrainRotation;
    /** @type {?} */
    ViewComponent.prototype.enableRotation;
    /** @type {?} */
    ViewComponent.prototype.extent;
    /** @type {?} */
    ViewComponent.prototype.maxResolution;
    /** @type {?} */
    ViewComponent.prototype.minResolution;
    /** @type {?} */
    ViewComponent.prototype.maxZoom;
    /** @type {?} */
    ViewComponent.prototype.minZoom;
    /** @type {?} */
    ViewComponent.prototype.resolution;
    /** @type {?} */
    ViewComponent.prototype.resolutions;
    /** @type {?} */
    ViewComponent.prototype.rotation;
    /** @type {?} */
    ViewComponent.prototype.zoom;
    /** @type {?} */
    ViewComponent.prototype.zoomFactor;
    /** @type {?} */
    ViewComponent.prototype.center;
    /** @type {?} */
    ViewComponent.prototype.projection;
    /** @type {?} */
    ViewComponent.prototype.zoomAnimation;
    /** @type {?} */
    ViewComponent.prototype.onChangeZoom;
    /** @type {?} */
    ViewComponent.prototype.onChangeResolution;
    /** @type {?} */
    ViewComponent.prototype.onChangeCenter;
    /**
     * @type {?}
     * @private
     */
    ViewComponent.prototype.host;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi92aWV3LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQStDLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEgsT0FBTyxJQUFJLE1BQU0sU0FBUyxDQUFDO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0M7SUFnREUsdUJBQW9CLElBQWtCO1FBQWxCLFNBQUksR0FBSixJQUFJLENBQWM7UUF4Qy9CLGtCQUFhLEdBQUcsTUFBTSxDQUFDO1FBK0I5QixrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUd0QixpQkFBWSxHQUE4QixJQUFJLFlBQVksRUFBZSxDQUFDO1FBRTFFLHVCQUFrQixHQUE4QixJQUFJLFlBQVksRUFBZSxDQUFDO1FBRWhGLG1CQUFjLEdBQThCLElBQUksWUFBWSxFQUFlLENBQUM7SUFFbkMsQ0FBQzs7OztJQUUxQyxnQ0FBUTs7O0lBQVI7UUFBQSxpQkFRQztRQVBDLHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFMUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsYUFBYTs7OztRQUFFLFVBQUMsS0FBa0IsSUFBSyxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUE3QixDQUE2QixFQUFDLENB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O2lDQUVOLE1BQU07O0lBNkRULG9CQUFDO0NBQUEsQUExR0QsSUEwR0M7U0FwR1ksYUFBYTs7O0lBQ3hCLGlDQUFzQjs7SUFDdEIsc0NBQThCOztJQUU5QiwwQ0FDb0M7O0lBQ3BDLHVDQUN3Qjs7SUFDeEIsK0JBQ2U7O0lBQ2Ysc0NBQ3NCOztJQUN0QixzQ0FDc0I7O0lBQ3RCLGdDQUNnQjs7SUFDaEIsZ0NBQ2dCOztJQUNoQixtQ0FDbUI7O0lBQ25CLG9DQUNzQjs7SUFDdEIsaUNBQ2lCOztJQUNqQiw2QkFDYTs7SUFDYixtQ0FDbUI7O0lBQ25CLCtCQUNtQjs7SUFDbkIsbUNBQ21COztJQUNuQixzQ0FDc0I7O0lBRXRCLHFDQUMwRTs7SUFDMUUsMkNBQ2dGOztJQUNoRix1Q0FDNEU7Ozs7O0lBRWhFLDZCQUEwQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSW5wdXQsIE9uSW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIFNpbXBsZUNoYW5nZXMsIEV2ZW50RW1pdHRlciwgT3V0cHV0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgVmlldyBmcm9tICdvbC9WaWV3JztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBPYmplY3RFdmVudCB9IGZyb20gJ29sJztcbmltcG9ydCB7IEV4dGVudCB9IGZyb20gJ29sL2V4dGVudCc7XG5pbXBvcnQgeyBDb29yZGluYXRlIH0gZnJvbSAnb2wvY29vcmRpbmF0ZSc7XG5pbXBvcnQgeyBmcm9tTG9uTGF0IH0gZnJvbSAnb2wvcHJvaic7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC12aWV3JyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIFZpZXdDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgcHVibGljIGluc3RhbmNlOiBWaWV3O1xuICBwdWJsaWMgY29tcG9uZW50VHlwZSA9ICd2aWV3JztcblxuICBASW5wdXQoKVxuICBjb25zdHJhaW5Sb3RhdGlvbjogYm9vbGVhbiB8IG51bWJlcjtcbiAgQElucHV0KClcbiAgZW5hYmxlUm90YXRpb246IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGV4dGVudDogRXh0ZW50O1xuICBASW5wdXQoKVxuICBtYXhSZXNvbHV0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIG1pblJlc29sdXRpb246IG51bWJlcjtcbiAgQElucHV0KClcbiAgbWF4Wm9vbTogbnVtYmVyO1xuICBASW5wdXQoKVxuICBtaW5ab29tOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHJlc29sdXRpb246IG51bWJlcjtcbiAgQElucHV0KClcbiAgcmVzb2x1dGlvbnM6IG51bWJlcltdO1xuICBASW5wdXQoKVxuICByb3RhdGlvbjogbnVtYmVyO1xuICBASW5wdXQoKVxuICB6b29tOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHpvb21GYWN0b3I6IG51bWJlcjtcbiAgQElucHV0KClcbiAgY2VudGVyOiBDb29yZGluYXRlO1xuICBASW5wdXQoKVxuICBwcm9qZWN0aW9uOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHpvb21BbmltYXRpb24gPSBmYWxzZTtcblxuICBAT3V0cHV0KClcbiAgb25DaGFuZ2Vab29tOiBFdmVudEVtaXR0ZXI8T2JqZWN0RXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcjxPYmplY3RFdmVudD4oKTtcbiAgQE91dHB1dCgpXG4gIG9uQ2hhbmdlUmVzb2x1dGlvbjogRXZlbnRFbWl0dGVyPE9iamVjdEV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8T2JqZWN0RXZlbnQ+KCk7XG4gIEBPdXRwdXQoKVxuICBvbkNoYW5nZUNlbnRlcjogRXZlbnRFbWl0dGVyPE9iamVjdEV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8T2JqZWN0RXZlbnQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBNYXBDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2NyZWF0aW5nIG9sLlZpZXcgaW5zdGFuY2Ugd2l0aDogJywgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBWaWV3KHRoaXMpO1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRWaWV3KHRoaXMuaW5zdGFuY2UpO1xuXG4gICAgdGhpcy5pbnN0YW5jZS5vbignY2hhbmdlOnpvb20nLCAoZXZlbnQ6IE9iamVjdEV2ZW50KSA9PiB0aGlzLm9uQ2hhbmdlWm9vbS5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbignY2hhbmdlOnJlc29sdXRpb24nLCAoZXZlbnQ6IE9iamVjdEV2ZW50KSA9PiB0aGlzLm9uQ2hhbmdlUmVzb2x1dGlvbi5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbignY2hhbmdlOmNlbnRlcicsIChldmVudDogT2JqZWN0RXZlbnQpID0+IHRoaXMub25DaGFuZ2VDZW50ZXIuZW1pdChldmVudCkpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGNvbnN0IHByb3BlcnRpZXM6IHsgW2luZGV4OiBzdHJpbmddOiBhbnkgfSA9IHt9O1xuICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgYXJncz0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gY2hhbmdlcykge1xuICAgICAgaWYgKGNoYW5nZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgY2FzZSAncm90YXRpb24nOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnpvb21BbmltYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1trZXldPSBjaGFuZ2VzW2tleV0uY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNba2V5XSA9IGNoYW5nZXNba2V5XS5jdXJyZW50VmFsdWU7XG4gICAgICAgICAgICAgICAgfSAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGJyZWFrOyAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnem9vbSc6XG4gICAgICAgICAgICAgICAgLyoqIFdvcmstYXJvdW5kOiBzZXR0aW5nIHRoZSB6b29tIHZpYSBzZXRQcm9wZXJ0aWVzIGRvZXMgbm90IHdvcmsuICovXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuem9vbUFuaW1hdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBhcmdzW2tleV09IGNoYW5nZXNba2V5XS5jdXJyZW50VmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZS5zZXRab29tKGNoYW5nZXNba2V5XS5jdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Byb2plY3Rpb24nOlxuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgVmlldyh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0Vmlldyh0aGlzLmluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1trZXldID0gY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiggdGhpcy56b29tQW5pbWF0aW9uICYmIChcbiAgICAgICAgICAgIHR5cGVvZiBhcmdzWyd6b29tJ10hPT0gJ3VuZGVmaW5lZCcgfHwgXG4gICAgICAgICAgICAgICAgdHlwZW9mIGFyZ3NbJ3JvdGF0aW9uJ10hPT0gJ3VuZGVmaW5lZCcpICkge1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZS5hbmltYXRlKGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coJ2NoYW5nZXMgZGV0ZWN0ZWQgaW4gYW9sLXZpZXcsIHNldHRpbmcgbmV3IHByb3BlcnRpZXM6ICcsIHByb3BlcnRpZXMpO1xuICAgIHRoaXMuaW5zdGFuY2Uuc2V0UHJvcGVydGllcyhwcm9wZXJ0aWVzLCBmYWxzZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygncmVtb3ZpbmcgYW9sLXZpZXcnKTtcbiAgfVxufVxuIl19