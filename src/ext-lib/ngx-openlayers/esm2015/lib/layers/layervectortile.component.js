/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Optional } from '@angular/core';
import { VectorTile } from 'ol/layer';
import { MapComponent } from '../map.component';
import { LayerComponent } from './layer.component';
import { LayerGroupComponent } from './layergroup.component';
export class LayerVectorTileComponent extends LayerComponent {
    /**
     * @param {?} map
     * @param {?=} group
     */
    constructor(map, group) {
        super(group || map);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log('creating ol.layer.VectorTile instance with:', this);
        this.instance = new VectorTile(this);
        super.ngOnInit();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        super.ngOnChanges(changes);
    }
}
LayerVectorTileComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-layer-vectortile',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
LayerVectorTileComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: LayerGroupComponent, decorators: [{ type: Optional }] }
];
LayerVectorTileComponent.propDecorators = {
    renderBuffer: [{ type: Input }],
    renderMode: [{ type: Input }],
    renderOrder: [{ type: Input }],
    style: [{ type: Input }],
    updateWhileAnimating: [{ type: Input }],
    updateWhileInteracting: [{ type: Input }],
    visible: [{ type: Input }]
};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5ZXJ2ZWN0b3J0aWxlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2xheWVycy9sYXllcnZlY3RvcnRpbGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFVLEtBQUssRUFBRSxRQUFRLEVBQTRCLE1BQU0sZUFBZSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFJdEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQVM3RCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsY0FBYzs7Ozs7SUFpQjFELFlBQVksR0FBaUIsRUFBYyxLQUEyQjtRQUNwRSxLQUFLLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Ozs7SUFFRCxRQUFRO1FBQ04sb0VBQW9FO1FBQ3BFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ25CLENBQUM7Ozs7O0lBRUQsV0FBVyxDQUFDLE9BQXNCO1FBQ2hDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0IsQ0FBQzs7O1lBbkNGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsc0JBQXNCO2dCQUNoQyxRQUFRLEVBQUU7O0dBRVQ7YUFDRjs7OztZQVZRLFlBQVk7WUFFWixtQkFBbUIsdUJBMEJNLFFBQVE7OzsyQkFoQnZDLEtBQUs7eUJBRUwsS0FBSzswQkFHTCxLQUFLO29CQUVMLEtBQUs7bUNBRUwsS0FBSztxQ0FFTCxLQUFLO3NCQUVMLEtBQUs7Ozs7SUFiTixnREFDcUI7O0lBQ3JCLDhDQUNnQzs7SUFFaEMsK0NBQzhEOztJQUM5RCx5Q0FDdUM7O0lBQ3ZDLHdEQUM4Qjs7SUFDOUIsMERBQ2dDOztJQUNoQywyQ0FDaUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIE9uSW5pdCwgSW5wdXQsIE9wdGlvbmFsLCBTaW1wbGVDaGFuZ2VzLCBPbkNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFZlY3RvclRpbGUgfSBmcm9tICdvbC9sYXllcic7XG5pbXBvcnQgeyBSZW5kZXJUeXBlIH0gZnJvbSAnb2wvbGF5ZXIvVmVjdG9yVGlsZSc7XG5pbXBvcnQgeyBGZWF0dXJlIH0gZnJvbSAnb2wnO1xuaW1wb3J0IHsgU3R5bGUgfSBmcm9tICdvbC9zdHlsZSc7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuLi9tYXAuY29tcG9uZW50JztcbmltcG9ydCB7IExheWVyQ29tcG9uZW50IH0gZnJvbSAnLi9sYXllci5jb21wb25lbnQnO1xuaW1wb3J0IHsgTGF5ZXJHcm91cENvbXBvbmVudCB9IGZyb20gJy4vbGF5ZXJncm91cC5jb21wb25lbnQnO1xuaW1wb3J0IHsgU3R5bGVGdW5jdGlvbiB9IGZyb20gJ29sL3N0eWxlL1N0eWxlJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLWxheWVyLXZlY3RvcnRpbGUnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgTGF5ZXJWZWN0b3JUaWxlQ29tcG9uZW50IGV4dGVuZHMgTGF5ZXJDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcyB7XG4gIEBJbnB1dCgpXG4gIHJlbmRlckJ1ZmZlcjogbnVtYmVyO1xuICBASW5wdXQoKVxuICByZW5kZXJNb2RlOiBSZW5kZXJUeXBlIHwgc3RyaW5nO1xuICAvKiBub3QgbWFya2VkIGFzIG9wdGlvbmFsIGluIHRoZSB0eXBpbmdzICovXG4gIEBJbnB1dCgpXG4gIHJlbmRlck9yZGVyOiAoZmVhdHVyZTE6IEZlYXR1cmUsIGZlYXR1cmUyOiBGZWF0dXJlKSA9PiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHN0eWxlOiBTdHlsZSB8IFN0eWxlW10gfCBTdHlsZUZ1bmN0aW9uO1xuICBASW5wdXQoKVxuICB1cGRhdGVXaGlsZUFuaW1hdGluZzogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgdXBkYXRlV2hpbGVJbnRlcmFjdGluZzogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgdmlzaWJsZTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihtYXA6IE1hcENvbXBvbmVudCwgQE9wdGlvbmFsKCkgZ3JvdXA/OiBMYXllckdyb3VwQ29tcG9uZW50KSB7XG4gICAgc3VwZXIoZ3JvdXAgfHwgbWFwKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBvbC5sYXllci5WZWN0b3JUaWxlIGluc3RhbmNlIHdpdGg6JywgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBWZWN0b3JUaWxlKHRoaXMpO1xuICAgIHN1cGVyLm5nT25Jbml0KCk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgc3VwZXIubmdPbkNoYW5nZXMoY2hhbmdlcyk7XG4gIH1cbn1cbiJdfQ==