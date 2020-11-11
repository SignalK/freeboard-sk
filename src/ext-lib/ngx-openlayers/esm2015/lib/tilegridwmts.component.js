/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import WMTS from 'ol/tilegrid/WMTS';
import { TileGridComponent } from './tilegrid.component';
import { Coordinate } from 'ol/coordinate';
export class TileGridWMTSComponent extends TileGridComponent {
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new WMTS(this);
    }
}
TileGridWMTSComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-tilegrid-wmts',
                template: ''
            }] }
];
TileGridWMTSComponent.propDecorators = {
    origin: [{ type: Input }],
    origins: [{ type: Input }],
    resolutions: [{ type: Input }],
    matrixIds: [{ type: Input }],
    sizes: [{ type: Input }],
    tileSizes: [{ type: Input }],
    widths: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    TileGridWMTSComponent.prototype.instance;
    /** @type {?} */
    TileGridWMTSComponent.prototype.origin;
    /** @type {?} */
    TileGridWMTSComponent.prototype.origins;
    /** @type {?} */
    TileGridWMTSComponent.prototype.resolutions;
    /** @type {?} */
    TileGridWMTSComponent.prototype.matrixIds;
    /** @type {?} */
    TileGridWMTSComponent.prototype.sizes;
    /** @type {?} */
    TileGridWMTSComponent.prototype.tileSizes;
    /** @type {?} */
    TileGridWMTSComponent.prototype.widths;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZWdyaWR3bXRzLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3RpbGVncmlkd210cy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFVLE1BQU0sZUFBZSxDQUFDO0FBQ3pELE9BQU8sSUFBSSxNQUFNLGtCQUFrQixDQUFDO0FBQ3BDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFPM0MsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGlCQUFpQjs7OztJQWtCMUQsUUFBUTtRQUNOLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakMsQ0FBQzs7O1lBeEJGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsbUJBQW1CO2dCQUM3QixRQUFRLEVBQUUsRUFBRTthQUNiOzs7cUJBSUUsS0FBSztzQkFFTCxLQUFLOzBCQUVMLEtBQUs7d0JBRUwsS0FBSztvQkFFTCxLQUFLO3dCQUVMLEtBQUs7cUJBRUwsS0FBSzs7OztJQWROLHlDQUFlOztJQUVmLHVDQUNvQjs7SUFDcEIsd0NBQ3VCOztJQUN2Qiw0Q0FDc0I7O0lBQ3RCLDBDQUNvQjs7SUFDcEIsc0NBQ2U7O0lBQ2YsMENBQzhCOztJQUM5Qix1Q0FDa0IiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPbkluaXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCBXTVRTIGZyb20gJ29sL3RpbGVncmlkL1dNVFMnO1xuaW1wb3J0IHsgVGlsZUdyaWRDb21wb25lbnQgfSBmcm9tICcuL3RpbGVncmlkLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBDb29yZGluYXRlIH0gZnJvbSAnb2wvY29vcmRpbmF0ZSc7XG5pbXBvcnQgeyBTaXplIH0gZnJvbSAnb2wvc2l6ZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC10aWxlZ3JpZC13bXRzJyxcbiAgdGVtcGxhdGU6ICcnLFxufSlcbmV4cG9ydCBjbGFzcyBUaWxlR3JpZFdNVFNDb21wb25lbnQgZXh0ZW5kcyBUaWxlR3JpZENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCB7XG4gIGluc3RhbmNlOiBXTVRTO1xuXG4gIEBJbnB1dCgpXG4gIG9yaWdpbj86IENvb3JkaW5hdGU7XG4gIEBJbnB1dCgpXG4gIG9yaWdpbnM/OiBDb29yZGluYXRlW107XG4gIEBJbnB1dCgpXG4gIHJlc29sdXRpb25zOiBudW1iZXJbXTtcbiAgQElucHV0KClcbiAgbWF0cml4SWRzOiBzdHJpbmdbXTtcbiAgQElucHV0KClcbiAgc2l6ZXM/OiBTaXplW107XG4gIEBJbnB1dCgpXG4gIHRpbGVTaXplcz86IChudW1iZXIgfCBTaXplKVtdO1xuICBASW5wdXQoKVxuICB3aWR0aHM/OiBudW1iZXJbXTtcblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IFdNVFModGhpcyk7XG4gIH1cbn1cbiJdfQ==