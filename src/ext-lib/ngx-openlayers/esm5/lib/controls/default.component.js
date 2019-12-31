/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { defaults } from 'ol/control';
import { Options as AttributionOptions } from 'ol/control/Attribution';
import { Options as RotateOptions } from 'ol/control/Rotate';
import { Options as ZoomOptions } from 'ol/control/Zoom';
import { MapComponent } from '../map.component';
var DefaultControlComponent = /** @class */ (function () {
    function DefaultControlComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DefaultControlComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('ol.control.defaults init: ', this);
        this.instance = defaults(this);
        this.instance.forEach((/**
         * @param {?} c
         * @return {?}
         */
        function (c) { return _this.map.instance.addControl(c); }));
    };
    /**
     * @return {?}
     */
    DefaultControlComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('removing aol-control-defaults');
        this.instance.forEach((/**
         * @param {?} c
         * @return {?}
         */
        function (c) { return _this.map.instance.removeControl(c); }));
    };
    DefaultControlComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-defaults',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DefaultControlComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DefaultControlComponent.propDecorators = {
        attribution: [{ type: Input }],
        attributionOptions: [{ type: Input }],
        rotate: [{ type: Input }],
        rotateOptions: [{ type: Input }],
        zoom: [{ type: Input }],
        zoomOptions: [{ type: Input }]
    };
    return DefaultControlComponent;
}());
export { DefaultControlComponent };
if (false) {
    /** @type {?} */
    DefaultControlComponent.prototype.instance;
    /** @type {?} */
    DefaultControlComponent.prototype.attribution;
    /** @type {?} */
    DefaultControlComponent.prototype.attributionOptions;
    /** @type {?} */
    DefaultControlComponent.prototype.rotate;
    /** @type {?} */
    DefaultControlComponent.prototype.rotateOptions;
    /** @type {?} */
    DefaultControlComponent.prototype.zoom;
    /** @type {?} */
    DefaultControlComponent.prototype.zoomOptions;
    /**
     * @type {?}
     * @private
     */
    DefaultControlComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9jb250cm9scy9kZWZhdWx0LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBcUIsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BFLE9BQU8sRUFBVyxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFL0MsT0FBTyxFQUFFLE9BQU8sSUFBSSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLElBQUksYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sSUFBSSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFaEQ7SUFtQkUsaUNBQW9CLEdBQWlCO1FBQWpCLFFBQUcsR0FBSCxHQUFHLENBQWM7SUFBRyxDQUFDOzs7O0lBRXpDLDBDQUFROzs7SUFBUjtRQUFBLGlCQUlDO1FBSEMsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTzs7OztRQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUEvQixDQUErQixFQUFDLENBQUM7SUFDOUQsQ0FBQzs7OztJQUVELDZDQUFXOzs7SUFBWDtRQUFBLGlCQUdDO1FBRkMsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTzs7OztRQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFsQyxDQUFrQyxFQUFDLENBQUM7SUFDakUsQ0FBQzs7Z0JBOUJGLFNBQVMsU0FBQztvQkFDVCxRQUFRLEVBQUUsc0JBQXNCO29CQUNoQyxRQUFRLEVBQUUsRUFBRTtpQkFDYjs7OztnQkFMUSxZQUFZOzs7OEJBUWxCLEtBQUs7cUNBRUwsS0FBSzt5QkFFTCxLQUFLO2dDQUVMLEtBQUs7dUJBRUwsS0FBSzs4QkFFTCxLQUFLOztJQWVSLDhCQUFDO0NBQUEsQUEvQkQsSUErQkM7U0EzQlksdUJBQXVCOzs7SUFDbEMsMkNBQThCOztJQUM5Qiw4Q0FDcUI7O0lBQ3JCLHFEQUN1Qzs7SUFDdkMseUNBQ2dCOztJQUNoQixnREFDNkI7O0lBQzdCLHVDQUNjOztJQUNkLDhDQUN5Qjs7Ozs7SUFFYixzQ0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIE9uRGVzdHJveSwgT25Jbml0LCBJbnB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ29udHJvbCwgZGVmYXVsdHMgfSBmcm9tICdvbC9jb250cm9sJztcbmltcG9ydCB7IENvbGxlY3Rpb24gfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBPcHRpb25zIGFzIEF0dHJpYnV0aW9uT3B0aW9ucyB9IGZyb20gJ29sL2NvbnRyb2wvQXR0cmlidXRpb24nO1xuaW1wb3J0IHsgT3B0aW9ucyBhcyBSb3RhdGVPcHRpb25zIH0gZnJvbSAnb2wvY29udHJvbC9Sb3RhdGUnO1xuaW1wb3J0IHsgT3B0aW9ucyBhcyBab29tT3B0aW9ucyB9IGZyb20gJ29sL2NvbnRyb2wvWm9vbSc7XG5cbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtY29udHJvbC1kZWZhdWx0cycsXG4gIHRlbXBsYXRlOiAnJyxcbn0pXG5leHBvcnQgY2xhc3MgRGVmYXVsdENvbnRyb2xDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIGluc3RhbmNlOiBDb2xsZWN0aW9uPENvbnRyb2w+O1xuICBASW5wdXQoKVxuICBhdHRyaWJ1dGlvbjogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgYXR0cmlidXRpb25PcHRpb25zOiBBdHRyaWJ1dGlvbk9wdGlvbnM7XG4gIEBJbnB1dCgpXG4gIHJvdGF0ZTogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgcm90YXRlT3B0aW9uczogUm90YXRlT3B0aW9ucztcbiAgQElucHV0KClcbiAgem9vbTogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgem9vbU9wdGlvbnM6IFpvb21PcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ29sLmNvbnRyb2wuZGVmYXVsdHMgaW5pdDogJywgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IGRlZmF1bHRzKHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2UuZm9yRWFjaChjID0+IHRoaXMubWFwLmluc3RhbmNlLmFkZENvbnRyb2woYykpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ3JlbW92aW5nIGFvbC1jb250cm9sLWRlZmF1bHRzJyk7XG4gICAgdGhpcy5pbnN0YW5jZS5mb3JFYWNoKGMgPT4gdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlQ29udHJvbChjKSk7XG4gIH1cbn1cbiJdfQ==