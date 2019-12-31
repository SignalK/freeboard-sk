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
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                switch (key) {
                    case 'zoom':
                        /** Work-around: setting the zoom via setProperties does not work. */
                        if (this.zoomAnimation) {
                            this.instance.animate({ zoom: changes[key].currentValue });
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
                        break;
                }
                properties[key] = changes[key].currentValue;
            }
        }
        // console.log('changes detected in aol-view, setting new properties: ', properties);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi92aWV3LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQStDLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEgsT0FBTyxJQUFJLE1BQU0sU0FBUyxDQUFDO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFM0M7SUFnREUsdUJBQW9CLElBQWtCO1FBQWxCLFNBQUksR0FBSixJQUFJLENBQWM7UUF4Qy9CLGtCQUFhLEdBQUcsTUFBTSxDQUFDO1FBK0I5QixrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUd0QixpQkFBWSxHQUE4QixJQUFJLFlBQVksRUFBZSxDQUFDO1FBRTFFLHVCQUFrQixHQUE4QixJQUFJLFlBQVksRUFBZSxDQUFDO1FBRWhGLG1CQUFjLEdBQThCLElBQUksWUFBWSxFQUFlLENBQUM7SUFFbkMsQ0FBQzs7OztJQUUxQyxnQ0FBUTs7O0lBQVI7UUFBQSxpQkFRQztRQVBDLHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFMUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsYUFBYTs7OztRQUFFLFVBQUMsS0FBa0IsSUFBSyxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUE3QixDQUE2QixFQUFDLENB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IElucHV0LCBPbkluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBTaW1wbGVDaGFuZ2VzLCBFdmVudEVtaXR0ZXIsIE91dHB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IFZpZXcgZnJvbSAnb2wvVmlldyc7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuL21hcC5jb21wb25lbnQnO1xuaW1wb3J0IHsgT2JqZWN0RXZlbnQgfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBFeHRlbnQgfSBmcm9tICdvbC9leHRlbnQnO1xuaW1wb3J0IHsgQ29vcmRpbmF0ZSB9IGZyb20gJ29sL2Nvb3JkaW5hdGUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtdmlldycsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBWaWV3Q29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG4gIHB1YmxpYyBpbnN0YW5jZTogVmlldztcbiAgcHVibGljIGNvbXBvbmVudFR5cGUgPSAndmlldyc7XG5cbiAgQElucHV0KClcbiAgY29uc3RyYWluUm90YXRpb246IGJvb2xlYW4gfCBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGVuYWJsZVJvdGF0aW9uOiBib29sZWFuO1xuICBASW5wdXQoKVxuICBleHRlbnQ6IEV4dGVudDtcbiAgQElucHV0KClcbiAgbWF4UmVzb2x1dGlvbjogbnVtYmVyO1xuICBASW5wdXQoKVxuICBtaW5SZXNvbHV0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIG1heFpvb206IG51bWJlcjtcbiAgQElucHV0KClcbiAgbWluWm9vbTogbnVtYmVyO1xuICBASW5wdXQoKVxuICByZXNvbHV0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHJlc29sdXRpb25zOiBudW1iZXJbXTtcbiAgQElucHV0KClcbiAgcm90YXRpb246IG51bWJlcjtcbiAgQElucHV0KClcbiAgem9vbTogbnVtYmVyO1xuICBASW5wdXQoKVxuICB6b29tRmFjdG9yOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGNlbnRlcjogQ29vcmRpbmF0ZTtcbiAgQElucHV0KClcbiAgcHJvamVjdGlvbjogc3RyaW5nO1xuICBASW5wdXQoKVxuICB6b29tQW5pbWF0aW9uID0gZmFsc2U7XG5cbiAgQE91dHB1dCgpXG4gIG9uQ2hhbmdlWm9vbTogRXZlbnRFbWl0dGVyPE9iamVjdEV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8T2JqZWN0RXZlbnQ+KCk7XG4gIEBPdXRwdXQoKVxuICBvbkNoYW5nZVJlc29sdXRpb246IEV2ZW50RW1pdHRlcjxPYmplY3RFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPE9iamVjdEV2ZW50PigpO1xuICBAT3V0cHV0KClcbiAgb25DaGFuZ2VDZW50ZXI6IEV2ZW50RW1pdHRlcjxPYmplY3RFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPE9iamVjdEV2ZW50PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogTWFwQ29tcG9uZW50KSB7fVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBvbC5WaWV3IGluc3RhbmNlIHdpdGg6ICcsIHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgVmlldyh0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0Vmlldyh0aGlzLmluc3RhbmNlKTtcblxuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2NoYW5nZTp6b29tJywgKGV2ZW50OiBPYmplY3RFdmVudCkgPT4gdGhpcy5vbkNoYW5nZVpvb20uZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2NoYW5nZTpyZXNvbHV0aW9uJywgKGV2ZW50OiBPYmplY3RFdmVudCkgPT4gdGhpcy5vbkNoYW5nZVJlc29sdXRpb24uZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2NoYW5nZTpjZW50ZXInLCAoZXZlbnQ6IE9iamVjdEV2ZW50KSA9PiB0aGlzLm9uQ2hhbmdlQ2VudGVyLmVtaXQoZXZlbnQpKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzOiB7IFtpbmRleDogc3RyaW5nXTogYW55IH0gPSB7fTtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gY2hhbmdlcykge1xuICAgICAgaWYgKGNoYW5nZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgIGNhc2UgJ3pvb20nOlxuICAgICAgICAgICAgLyoqIFdvcmstYXJvdW5kOiBzZXR0aW5nIHRoZSB6b29tIHZpYSBzZXRQcm9wZXJ0aWVzIGRvZXMgbm90IHdvcmsuICovXG4gICAgICAgICAgICBpZiAodGhpcy56b29tQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UuYW5pbWF0ZSh7IHpvb206IGNoYW5nZXNba2V5XS5jdXJyZW50VmFsdWUgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlLnNldFpvb20oY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdwcm9qZWN0aW9uJzpcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgVmlldyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRWaWV3KHRoaXMuaW5zdGFuY2UpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHByb3BlcnRpZXNba2V5XSA9IGNoYW5nZXNba2V5XS5jdXJyZW50VmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKCdjaGFuZ2VzIGRldGVjdGVkIGluIGFvbC12aWV3LCBzZXR0aW5nIG5ldyBwcm9wZXJ0aWVzOiAnLCBwcm9wZXJ0aWVzKTtcbiAgICB0aGlzLmluc3RhbmNlLnNldFByb3BlcnRpZXMocHJvcGVydGllcywgZmFsc2UpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ3JlbW92aW5nIGFvbC12aWV3Jyk7XG4gIH1cbn1cbiJdfQ==