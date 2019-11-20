/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Optional } from '@angular/core';
import { Fill, Image, Stroke, Style, Text } from 'ol/style';
import { FeatureComponent } from '../feature.component';
import { LayerVectorComponent } from '../layers/layervector.component';
var StyleComponent = /** @class */ (function () {
    function StyleComponent(featureHost, layerHost) {
        this.componentType = 'style';
        // console.log('creating aol-style');
        this.host = !!featureHost ? featureHost : layerHost;
        if (!this.host) {
            throw new Error('aol-style must be applied to a feature or a layer');
        }
    }
    /**
     * @return {?}
     */
    StyleComponent.prototype.update = /**
     * @return {?}
     */
    function () {
        // console.log('updating style\'s host: ', this.host);
        this.host.instance.changed();
    };
    /**
     * @return {?}
     */
    StyleComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating aol-style instance with: ', this);
        this.instance = new Style(this);
        this.host.instance.setStyle(this.instance);
    };
    StyleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleComponent.ctorParameters = function () { return [
        { type: FeatureComponent, decorators: [{ type: Optional }] },
        { type: LayerVectorComponent, decorators: [{ type: Optional }] }
    ]; };
    StyleComponent.propDecorators = {
        geometry: [{ type: Input }],
        fill: [{ type: Input }],
        image: [{ type: Input }],
        stroke: [{ type: Input }],
        text: [{ type: Input }],
        zIndex: [{ type: Input }]
    };
    return StyleComponent;
}());
export { StyleComponent };
if (false) {
    /**
     * @type {?}
     * @private
     */
    StyleComponent.prototype.host;
    /** @type {?} */
    StyleComponent.prototype.instance;
    /** @type {?} */
    StyleComponent.prototype.componentType;
    /** @type {?} */
    StyleComponent.prototype.geometry;
    /** @type {?} */
    StyleComponent.prototype.fill;
    /** @type {?} */
    StyleComponent.prototype.image;
    /** @type {?} */
    StyleComponent.prototype.stroke;
    /** @type {?} */
    StyleComponent.prototype.text;
    /** @type {?} */
    StyleComponent.prototype.zIndex;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvc3R5bGVzL3N0eWxlLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFVLE1BQU0sZUFBZSxDQUFDO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRTVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3ZFO0lBd0JFLHdCQUF3QixXQUE2QixFQUFjLFNBQStCO1FBZjNGLGtCQUFhLEdBQUcsT0FBTyxDQUFDO1FBZ0I3QixxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztTQUN0RTtJQUNILENBQUM7Ozs7SUFFRCwrQkFBTTs7O0lBQU47UUFDRSxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQzs7OztJQUVELGlDQUFROzs7SUFBUjtRQUNFLDJEQUEyRDtRQUMzRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0MsQ0FBQzs7Z0JBekNGLFNBQVMsU0FBQztvQkFDVCxRQUFRLEVBQUUsV0FBVztvQkFDckIsUUFBUSxFQUFFLHFDQUVUO2lCQUNGOzs7O2dCQVRRLGdCQUFnQix1QkE0QlYsUUFBUTtnQkEzQmQsb0JBQW9CLHVCQTJCNkIsUUFBUTs7OzJCQWIvRCxLQUFLO3VCQUVMLEtBQUs7d0JBRUwsS0FBSzt5QkFFTCxLQUFLO3VCQUVMLEtBQUs7eUJBRUwsS0FBSzs7SUFxQlIscUJBQUM7Q0FBQSxBQTFDRCxJQTBDQztTQXBDWSxjQUFjOzs7Ozs7SUFDekIsOEJBQXNEOztJQUN0RCxrQ0FBdUI7O0lBQ3ZCLHVDQUErQjs7SUFFL0Isa0NBQytDOztJQUMvQyw4QkFDVzs7SUFDWCwrQkFDYTs7SUFDYixnQ0FDZTs7SUFDZiw4QkFDVzs7SUFDWCxnQ0FDZSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSW5wdXQsIE9wdGlvbmFsLCBPbkluaXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEZpbGwsIEltYWdlLCBTdHJva2UsIFN0eWxlLCBUZXh0IH0gZnJvbSAnb2wvc3R5bGUnO1xuaW1wb3J0IHsgR2VvbWV0cnkgfSBmcm9tICdvbC9nZW9tJztcbmltcG9ydCB7IEZlYXR1cmVDb21wb25lbnQgfSBmcm9tICcuLi9mZWF0dXJlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMYXllclZlY3RvckNvbXBvbmVudCB9IGZyb20gJy4uL2xheWVycy9sYXllcnZlY3Rvci5jb21wb25lbnQnO1xuaW1wb3J0IHsgR2VvbWV0cnlGdW5jdGlvbiB9IGZyb20gJ29sL3N0eWxlL1N0eWxlJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLXN0eWxlJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIFN0eWxlQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgcHJpdmF0ZSBob3N0OiBGZWF0dXJlQ29tcG9uZW50IHwgTGF5ZXJWZWN0b3JDb21wb25lbnQ7XG4gIHB1YmxpYyBpbnN0YW5jZTogU3R5bGU7XG4gIHB1YmxpYyBjb21wb25lbnRUeXBlID0gJ3N0eWxlJztcblxuICBASW5wdXQoKVxuICBnZW9tZXRyeTogc3RyaW5nIHwgR2VvbWV0cnkgfCBHZW9tZXRyeUZ1bmN0aW9uO1xuICBASW5wdXQoKVxuICBmaWxsOiBGaWxsO1xuICBASW5wdXQoKVxuICBpbWFnZTogSW1hZ2U7XG4gIEBJbnB1dCgpXG4gIHN0cm9rZTogU3Ryb2tlO1xuICBASW5wdXQoKVxuICB0ZXh0OiBUZXh0O1xuICBASW5wdXQoKVxuICB6SW5kZXg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBmZWF0dXJlSG9zdDogRmVhdHVyZUNvbXBvbmVudCwgQE9wdGlvbmFsKCkgbGF5ZXJIb3N0OiBMYXllclZlY3RvckNvbXBvbmVudCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBhb2wtc3R5bGUnKTtcbiAgICB0aGlzLmhvc3QgPSAhIWZlYXR1cmVIb3N0ID8gZmVhdHVyZUhvc3QgOiBsYXllckhvc3Q7XG4gICAgaWYgKCF0aGlzLmhvc3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYW9sLXN0eWxlIG11c3QgYmUgYXBwbGllZCB0byBhIGZlYXR1cmUgb3IgYSBsYXllcicpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygndXBkYXRpbmcgc3R5bGVcXCdzIGhvc3Q6ICcsIHRoaXMuaG9zdCk7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLmNoYW5nZWQoKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBhb2wtc3R5bGUgaW5zdGFuY2Ugd2l0aDogJywgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBTdHlsZSh0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0U3R5bGUodGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==