/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Host, Input, forwardRef } from '@angular/core';
import { BingMaps } from 'ol/source';
import { SourceComponent } from './source.component';
import { LayerTileComponent } from '../layers/layertile.component';
import { LoadFunction } from 'ol/Tile';
export class SourceBingmapsComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
        this.imagerySet = 'Aerial';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new BingMaps(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceBingmapsComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-bingmaps',
                template: `
    <div class="aol-source-bingmaps"></div>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceBingmapsComponent)) }]
            }] }
];
/** @nocollapse */
SourceBingmapsComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
SourceBingmapsComponent.propDecorators = {
    cacheSize: [{ type: Input }],
    hidpi: [{ type: Input }],
    culture: [{ type: Input }],
    key: [{ type: Input }],
    imagerySet: [{ type: Input }],
    maxZoom: [{ type: Input }],
    reprojectionErrorThreshold: [{ type: Input }],
    tileLoadFunction: [{ type: Input }],
    wrapX: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    SourceBingmapsComponent.prototype.instance;
    /** @type {?} */
    SourceBingmapsComponent.prototype.cacheSize;
    /** @type {?} */
    SourceBingmapsComponent.prototype.hidpi;
    /** @type {?} */
    SourceBingmapsComponent.prototype.culture;
    /** @type {?} */
    SourceBingmapsComponent.prototype.key;
    /** @type {?} */
    SourceBingmapsComponent.prototype.imagerySet;
    /** @type {?} */
    SourceBingmapsComponent.prototype.maxZoom;
    /** @type {?} */
    SourceBingmapsComponent.prototype.reprojectionErrorThreshold;
    /** @type {?} */
    SourceBingmapsComponent.prototype.tileLoadFunction;
    /** @type {?} */
    SourceBingmapsComponent.prototype.wrapX;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluZ21hcHMuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvc291cmNlcy9iaW5nbWFwcy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBVSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNyQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQVN2QyxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsZUFBZTs7OztJQXNCMUQsWUFBb0IsS0FBeUI7UUFDM0MsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBWGYsZUFBVSxHQUE4RSxRQUFRLENBQUM7SUFZakcsQ0FBQzs7OztJQUVELFFBQVE7UUFDTixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQzs7O1lBcENGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUscUJBQXFCO2dCQUMvQixRQUFRLEVBQUU7O0dBRVQ7Z0JBQ0QsU0FBUyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxVQUFVOzs7d0JBQUMsR0FBRyxFQUFFLENBQUMsdUJBQXVCLEVBQUMsRUFBRSxDQUFDO2FBQ2xHOzs7O1lBVFEsa0JBQWtCLHVCQWdDWixJQUFJOzs7d0JBbkJoQixLQUFLO29CQUVMLEtBQUs7c0JBRUwsS0FBSztrQkFFTCxLQUFLO3lCQUVMLEtBQUs7c0JBRUwsS0FBSzt5Q0FFTCxLQUFLOytCQUVMLEtBQUs7b0JBRUwsS0FBSzs7OztJQWxCTiwyQ0FBbUI7O0lBRW5CLDRDQUNrQjs7SUFDbEIsd0NBQ2U7O0lBQ2YsMENBQ2dCOztJQUNoQixzQ0FDWTs7SUFDWiw2Q0FDaUc7O0lBQ2pHLDBDQUNnQjs7SUFDaEIsNkRBQ21DOztJQUNuQyxtREFDK0I7O0lBQy9CLHdDQUNlIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBIb3N0LCBJbnB1dCwgT25Jbml0LCBmb3J3YXJkUmVmIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBCaW5nTWFwcyB9IGZyb20gJ29sL3NvdXJjZSc7XG5pbXBvcnQgeyBTb3VyY2VDb21wb25lbnQgfSBmcm9tICcuL3NvdXJjZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgTGF5ZXJUaWxlQ29tcG9uZW50IH0gZnJvbSAnLi4vbGF5ZXJzL2xheWVydGlsZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgTG9hZEZ1bmN0aW9uIH0gZnJvbSAnb2wvVGlsZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1zb3VyY2UtYmluZ21hcHMnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxkaXYgY2xhc3M9XCJhb2wtc291cmNlLWJpbmdtYXBzXCI+PC9kaXY+XG4gIGAsXG4gIHByb3ZpZGVyczogW3sgcHJvdmlkZTogU291cmNlQ29tcG9uZW50LCB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBTb3VyY2VCaW5nbWFwc0NvbXBvbmVudCkgfV0sXG59KVxuZXhwb3J0IGNsYXNzIFNvdXJjZUJpbmdtYXBzQ29tcG9uZW50IGV4dGVuZHMgU291cmNlQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgaW5zdGFuY2U6IEJpbmdNYXBzO1xuXG4gIEBJbnB1dCgpXG4gIGNhY2hlU2l6ZTogbnVtYmVyO1xuICBASW5wdXQoKVxuICBoaWRwaTogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgY3VsdHVyZTogc3RyaW5nO1xuICBASW5wdXQoKVxuICBrZXk6IHN0cmluZztcbiAgQElucHV0KClcbiAgaW1hZ2VyeVNldDogJ1JvYWQnIHwgJ0FlcmlhbCcgfCAnQWVyaWFsV2l0aExhYmVscycgfCAnY29sbGluc0JhcnQnIHwgJ29yZG5hbmNlU3VydmV5JyA9ICdBZXJpYWwnO1xuICBASW5wdXQoKVxuICBtYXhab29tOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHJlcHJvamVjdGlvbkVycm9yVGhyZXNob2xkOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHRpbGVMb2FkRnVuY3Rpb246IExvYWRGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgd3JhcFg6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoQEhvc3QoKSBsYXllcjogTGF5ZXJUaWxlQ29tcG9uZW50KSB7XG4gICAgc3VwZXIobGF5ZXIpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBCaW5nTWFwcyh0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0U291cmNlKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=