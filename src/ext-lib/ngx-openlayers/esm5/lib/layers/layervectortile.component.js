/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, Input, Optional } from '@angular/core';
import { VectorTile } from 'ol/layer';
import { MapComponent } from '../map.component';
import { LayerComponent } from './layer.component';
import { LayerGroupComponent } from './layergroup.component';
var LayerVectorTileComponent = /** @class */ (function (_super) {
    tslib_1.__extends(LayerVectorTileComponent, _super);
    function LayerVectorTileComponent(map, group) {
        return _super.call(this, group || map) || this;
    }
    /**
     * @return {?}
     */
    LayerVectorTileComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.layer.VectorTile instance with:', this);
        this.instance = new VectorTile(this);
        _super.prototype.ngOnInit.call(this);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerVectorTileComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        _super.prototype.ngOnChanges.call(this, changes);
    };
    LayerVectorTileComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-layer-vectortile',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    LayerVectorTileComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: LayerGroupComponent, decorators: [{ type: Optional }] }
    ]; };
    LayerVectorTileComponent.propDecorators = {
        renderBuffer: [{ type: Input }],
        renderMode: [{ type: Input }],
        renderOrder: [{ type: Input }],
        style: [{ type: Input }],
        updateWhileAnimating: [{ type: Input }],
        updateWhileInteracting: [{ type: Input }],
        visible: [{ type: Input }]
    };
    return LayerVectorTileComponent;
}(LayerComponent));
export { LayerVectorTileComponent };
if (false) {
    /** @type {?} */
    LayerVectorTileComponent.prototype.renderBuffer;
    /** @type {?} */
    LayerVectorTileComponent.prototype.renderMode;
    /** @type {?} */
    LayerVectorTileComponent.prototype.renderOrder;
    /** @type {?} */
    LayerVectorTileComponent.prototype.style;
    /** @type {?} */
    LayerVectorTileComponent.prototype.updateWhileAnimating;
    /** @type {?} */
    LayerVectorTileComponent.prototype.updateWhileInteracting;
    /** @type {?} */
    LayerVectorTileComponent.prototype.visible;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5ZXJ2ZWN0b3J0aWxlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2xheWVycy9sYXllcnZlY3RvcnRpbGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBVSxLQUFLLEVBQUUsUUFBUSxFQUE0QixNQUFNLGVBQWUsQ0FBQztBQUM3RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBSXRDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFHN0Q7SUFNOEMsb0RBQWM7SUFpQjFELGtDQUFZLEdBQWlCLEVBQWMsS0FBMkI7ZUFDcEUsa0JBQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQztJQUNyQixDQUFDOzs7O0lBRUQsMkNBQVE7OztJQUFSO1FBQ0Usb0VBQW9FO1FBQ3BFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsaUJBQU0sUUFBUSxXQUFFLENBQUM7SUFDbkIsQ0FBQzs7Ozs7SUFFRCw4Q0FBVzs7OztJQUFYLFVBQVksT0FBc0I7UUFDaEMsaUJBQU0sV0FBVyxZQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLENBQUM7O2dCQW5DRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLHNCQUFzQjtvQkFDaEMsUUFBUSxFQUFFLHFDQUVUO2lCQUNGOzs7O2dCQVZRLFlBQVk7Z0JBRVosbUJBQW1CLHVCQTBCTSxRQUFROzs7K0JBaEJ2QyxLQUFLOzZCQUVMLEtBQUs7OEJBR0wsS0FBSzt3QkFFTCxLQUFLO3VDQUVMLEtBQUs7eUNBRUwsS0FBSzswQkFFTCxLQUFLOztJQWdCUiwrQkFBQztDQUFBLEFBcENELENBTThDLGNBQWMsR0E4QjNEO1NBOUJZLHdCQUF3Qjs7O0lBQ25DLGdEQUNxQjs7SUFDckIsOENBQ2dDOztJQUVoQywrQ0FDOEQ7O0lBQzlELHlDQUN1Qzs7SUFDdkMsd0RBQzhCOztJQUM5QiwwREFDZ0M7O0lBQ2hDLDJDQUNpQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgT25Jbml0LCBJbnB1dCwgT3B0aW9uYWwsIFNpbXBsZUNoYW5nZXMsIE9uQ2hhbmdlcyB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgVmVjdG9yVGlsZSB9IGZyb20gJ29sL2xheWVyJztcbmltcG9ydCB7IFJlbmRlclR5cGUgfSBmcm9tICdvbC9sYXllci9WZWN0b3JUaWxlJztcbmltcG9ydCB7IEZlYXR1cmUgfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBTdHlsZSB9IGZyb20gJ29sL3N0eWxlJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuaW1wb3J0IHsgTGF5ZXJDb21wb25lbnQgfSBmcm9tICcuL2xheWVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMYXllckdyb3VwQ29tcG9uZW50IH0gZnJvbSAnLi9sYXllcmdyb3VwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTdHlsZUZ1bmN0aW9uIH0gZnJvbSAnb2wvc3R5bGUvU3R5bGUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtbGF5ZXItdmVjdG9ydGlsZScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBMYXllclZlY3RvclRpbGVDb21wb25lbnQgZXh0ZW5kcyBMYXllckNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25DaGFuZ2VzIHtcbiAgQElucHV0KClcbiAgcmVuZGVyQnVmZmVyOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHJlbmRlck1vZGU6IFJlbmRlclR5cGUgfCBzdHJpbmc7XG4gIC8qIG5vdCBtYXJrZWQgYXMgb3B0aW9uYWwgaW4gdGhlIHR5cGluZ3MgKi9cbiAgQElucHV0KClcbiAgcmVuZGVyT3JkZXI6IChmZWF0dXJlMTogRmVhdHVyZSwgZmVhdHVyZTI6IEZlYXR1cmUpID0+IG51bWJlcjtcbiAgQElucHV0KClcbiAgc3R5bGU6IFN0eWxlIHwgU3R5bGVbXSB8IFN0eWxlRnVuY3Rpb247XG4gIEBJbnB1dCgpXG4gIHVwZGF0ZVdoaWxlQW5pbWF0aW5nOiBib29sZWFuO1xuICBASW5wdXQoKVxuICB1cGRhdGVXaGlsZUludGVyYWN0aW5nOiBib29sZWFuO1xuICBASW5wdXQoKVxuICB2aXNpYmxlOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKG1hcDogTWFwQ29tcG9uZW50LCBAT3B0aW9uYWwoKSBncm91cD86IExheWVyR3JvdXBDb21wb25lbnQpIHtcbiAgICBzdXBlcihncm91cCB8fCBtYXApO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2NyZWF0aW5nIG9sLmxheWVyLlZlY3RvclRpbGUgaW5zdGFuY2Ugd2l0aDonLCB0aGlzKTtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IFZlY3RvclRpbGUodGhpcyk7XG4gICAgc3VwZXIubmdPbkluaXQoKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBzdXBlci5uZ09uQ2hhbmdlcyhjaGFuZ2VzKTtcbiAgfVxufVxuIl19