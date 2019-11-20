/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Optional } from '@angular/core';
import { Fill, Image, Stroke, Style, Text } from 'ol/style';
import { FeatureComponent } from '../feature.component';
import { LayerVectorComponent } from '../layers/layervector.component';
export class StyleComponent {
    /**
     * @param {?} featureHost
     * @param {?} layerHost
     */
    constructor(featureHost, layerHost) {
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
    update() {
        // console.log('updating style\'s host: ', this.host);
        this.host.instance.changed();
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log('creating aol-style instance with: ', this);
        this.instance = new Style(this);
        this.host.instance.setStyle(this.instance);
    }
}
StyleComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
StyleComponent.ctorParameters = () => [
    { type: FeatureComponent, decorators: [{ type: Optional }] },
    { type: LayerVectorComponent, decorators: [{ type: Optional }] }
];
StyleComponent.propDecorators = {
    geometry: [{ type: Input }],
    fill: [{ type: Input }],
    image: [{ type: Input }],
    stroke: [{ type: Input }],
    text: [{ type: Input }],
    zIndex: [{ type: Input }]
};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvc3R5bGVzL3N0eWxlLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFVLE1BQU0sZUFBZSxDQUFDO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRTVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBU3ZFLE1BQU0sT0FBTyxjQUFjOzs7OztJQWtCekIsWUFBd0IsV0FBNkIsRUFBYyxTQUErQjtRQWYzRixrQkFBYSxHQUFHLE9BQU8sQ0FBQztRQWdCN0IscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7U0FDdEU7SUFDSCxDQUFDOzs7O0lBRUQsTUFBTTtRQUNKLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMvQixDQUFDOzs7O0lBRUQsUUFBUTtRQUNOLDJEQUEyRDtRQUMzRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0MsQ0FBQzs7O1lBekNGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsV0FBVztnQkFDckIsUUFBUSxFQUFFOztHQUVUO2FBQ0Y7Ozs7WUFUUSxnQkFBZ0IsdUJBNEJWLFFBQVE7WUEzQmQsb0JBQW9CLHVCQTJCNkIsUUFBUTs7O3VCQWIvRCxLQUFLO21CQUVMLEtBQUs7b0JBRUwsS0FBSztxQkFFTCxLQUFLO21CQUVMLEtBQUs7cUJBRUwsS0FBSzs7Ozs7OztJQWROLDhCQUFzRDs7SUFDdEQsa0NBQXVCOztJQUN2Qix1Q0FBK0I7O0lBRS9CLGtDQUMrQzs7SUFDL0MsOEJBQ1c7O0lBQ1gsK0JBQ2E7O0lBQ2IsZ0NBQ2U7O0lBQ2YsOEJBQ1c7O0lBQ1gsZ0NBQ2UiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPcHRpb25hbCwgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBGaWxsLCBJbWFnZSwgU3Ryb2tlLCBTdHlsZSwgVGV4dCB9IGZyb20gJ29sL3N0eWxlJztcbmltcG9ydCB7IEdlb21ldHJ5IH0gZnJvbSAnb2wvZ2VvbSc7XG5pbXBvcnQgeyBGZWF0dXJlQ29tcG9uZW50IH0gZnJvbSAnLi4vZmVhdHVyZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgTGF5ZXJWZWN0b3JDb21wb25lbnQgfSBmcm9tICcuLi9sYXllcnMvbGF5ZXJ2ZWN0b3IuY29tcG9uZW50JztcbmltcG9ydCB7IEdlb21ldHJ5RnVuY3Rpb24gfSBmcm9tICdvbC9zdHlsZS9TdHlsZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1zdHlsZScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBTdHlsZUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCB7XG4gIHByaXZhdGUgaG9zdDogRmVhdHVyZUNvbXBvbmVudCB8IExheWVyVmVjdG9yQ29tcG9uZW50O1xuICBwdWJsaWMgaW5zdGFuY2U6IFN0eWxlO1xuICBwdWJsaWMgY29tcG9uZW50VHlwZSA9ICdzdHlsZSc7XG5cbiAgQElucHV0KClcbiAgZ2VvbWV0cnk6IHN0cmluZyB8IEdlb21ldHJ5IHwgR2VvbWV0cnlGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgZmlsbDogRmlsbDtcbiAgQElucHV0KClcbiAgaW1hZ2U6IEltYWdlO1xuICBASW5wdXQoKVxuICBzdHJva2U6IFN0cm9rZTtcbiAgQElucHV0KClcbiAgdGV4dDogVGV4dDtcbiAgQElucHV0KClcbiAgekluZGV4OiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgZmVhdHVyZUhvc3Q6IEZlYXR1cmVDb21wb25lbnQsIEBPcHRpb25hbCgpIGxheWVySG9zdDogTGF5ZXJWZWN0b3JDb21wb25lbnQpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnY3JlYXRpbmcgYW9sLXN0eWxlJyk7XG4gICAgdGhpcy5ob3N0ID0gISFmZWF0dXJlSG9zdCA/IGZlYXR1cmVIb3N0IDogbGF5ZXJIb3N0O1xuICAgIGlmICghdGhpcy5ob3N0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FvbC1zdHlsZSBtdXN0IGJlIGFwcGxpZWQgdG8gYSBmZWF0dXJlIG9yIGEgbGF5ZXInKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIHN0eWxlXFwncyBob3N0OiAnLCB0aGlzLmhvc3QpO1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5jaGFuZ2VkKCk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnY3JlYXRpbmcgYW9sLXN0eWxlIGluc3RhbmNlIHdpdGg6ICcsIHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgU3R5bGUodGhpcyk7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldFN0eWxlKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=