/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, Host, Input, forwardRef } from '@angular/core';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
import { TileWMS } from 'ol/source';
import { TileGrid } from 'ol/tilegrid';
import { LoadFunction } from 'ol/Tile';
var SourceTileWMSComponent = /** @class */ (function (_super) {
    tslib_1.__extends(SourceTileWMSComponent, _super);
    function SourceTileWMSComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceTileWMSComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new TileWMS(this);
        this.host.instance.setSource(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceTileWMSComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    };
    SourceTileWMSComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-tilewms',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceTileWMSComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceTileWMSComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceTileWMSComponent.propDecorators = {
        cacheSize: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        gutter: [{ type: Input }],
        hidpi: [{ type: Input }],
        params: [{ type: Input }],
        projection: [{ type: Input }],
        reprojectionErrorThreshold: [{ type: Input }],
        serverType: [{ type: Input }],
        tileGrid: [{ type: Input }],
        tileLoadFunction: [{ type: Input }],
        url: [{ type: Input }],
        urls: [{ type: Input }],
        wrapX: [{ type: Input }]
    };
    return SourceTileWMSComponent;
}(SourceComponent));
export { SourceTileWMSComponent };
if (false) {
    /** @type {?} */
    SourceTileWMSComponent.prototype.instance;
    /** @type {?} */
    SourceTileWMSComponent.prototype.cacheSize;
    /** @type {?} */
    SourceTileWMSComponent.prototype.crossOrigin;
    /** @type {?} */
    SourceTileWMSComponent.prototype.gutter;
    /** @type {?} */
    SourceTileWMSComponent.prototype.hidpi;
    /** @type {?} */
    SourceTileWMSComponent.prototype.params;
    /** @type {?} */
    SourceTileWMSComponent.prototype.projection;
    /** @type {?} */
    SourceTileWMSComponent.prototype.reprojectionErrorThreshold;
    /** @type {?} */
    SourceTileWMSComponent.prototype.serverType;
    /** @type {?} */
    SourceTileWMSComponent.prototype.tileGrid;
    /** @type {?} */
    SourceTileWMSComponent.prototype.tileLoadFunction;
    /** @type {?} */
    SourceTileWMSComponent.prototype.url;
    /** @type {?} */
    SourceTileWMSComponent.prototype.urls;
    /** @type {?} */
    SourceTileWMSComponent.prototype.wrapX;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZXdtcy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zb3VyY2VzL3RpbGV3bXMuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFxQixVQUFVLEVBQWlCLE1BQU0sZUFBZSxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdkMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUV2QztJQU80QyxrREFBZTtJQTZCekQsZ0NBQW9CLEtBQXlCO2VBQzNDLGtCQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7Ozs7SUFFRCx5Q0FBUTs7O0lBQVI7UUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQzs7Ozs7SUFFRCw0Q0FBVzs7OztJQUFYLFVBQVksT0FBc0I7UUFDaEMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQzs7Z0JBakRGLFNBQVMsU0FBQztvQkFDVCxRQUFRLEVBQUUsb0JBQW9CO29CQUM5QixRQUFRLEVBQUUscUNBRVQ7b0JBQ0QsU0FBUyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxVQUFVOzs7NEJBQUMsY0FBTSxPQUFBLHNCQUFzQixFQUF0QixDQUFzQixFQUFDLEVBQUUsQ0FBQztpQkFDakc7Ozs7Z0JBWlEsa0JBQWtCLHVCQTBDWixJQUFJOzs7NEJBM0JoQixLQUFLOzhCQUVMLEtBQUs7eUJBRUwsS0FBSzt3QkFFTCxLQUFLO3lCQUVMLEtBQUs7NkJBRUwsS0FBSzs2Q0FFTCxLQUFLOzZCQUVMLEtBQUs7MkJBRUwsS0FBSzttQ0FFTCxLQUFLO3NCQUVMLEtBQUs7dUJBRUwsS0FBSzt3QkFFTCxLQUFLOztJQWlCUiw2QkFBQztDQUFBLEFBbERELENBTzRDLGVBQWUsR0EyQzFEO1NBM0NZLHNCQUFzQjs7O0lBQ2pDLDBDQUFrQjs7SUFDbEIsMkNBQ2tCOztJQUNsQiw2Q0FDb0I7O0lBQ3BCLHdDQUNlOztJQUNmLHVDQUNlOztJQUNmLHdDQUNlOztJQUNmLDRDQUNtQjs7SUFDbkIsNERBQ21DOztJQUNuQyw0Q0FDbUI7O0lBQ25CLDBDQUNtQjs7SUFDbkIsa0RBQytCOztJQUMvQixxQ0FDWTs7SUFDWixzQ0FDZTs7SUFDZix1Q0FDZSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSG9zdCwgSW5wdXQsIE9uQ2hhbmdlcywgT25Jbml0LCBmb3J3YXJkUmVmLCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBMYXllclRpbGVDb21wb25lbnQgfSBmcm9tICcuLi9sYXllcnMvbGF5ZXJ0aWxlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTb3VyY2VDb21wb25lbnQgfSBmcm9tICcuL3NvdXJjZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgVGlsZVdNUyB9IGZyb20gJ29sL3NvdXJjZSc7XG5pbXBvcnQgeyBUaWxlR3JpZCB9IGZyb20gJ29sL3RpbGVncmlkJztcbmltcG9ydCB7IExvYWRGdW5jdGlvbiB9IGZyb20gJ29sL1RpbGUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtc291cmNlLXRpbGV3bXMnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbiAgcHJvdmlkZXJzOiBbeyBwcm92aWRlOiBTb3VyY2VDb21wb25lbnQsIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IFNvdXJjZVRpbGVXTVNDb21wb25lbnQpIH1dLFxufSlcbmV4cG9ydCBjbGFzcyBTb3VyY2VUaWxlV01TQ29tcG9uZW50IGV4dGVuZHMgU291cmNlQ29tcG9uZW50IGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkluaXQge1xuICBpbnN0YW5jZTogVGlsZVdNUztcbiAgQElucHV0KClcbiAgY2FjaGVTaXplOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGNyb3NzT3JpZ2luOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGd1dHRlcjogbnVtYmVyO1xuICBASW5wdXQoKVxuICBoaWRwaTogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgcGFyYW1zOiBPYmplY3Q7XG4gIEBJbnB1dCgpXG4gIHByb2plY3Rpb246IHN0cmluZztcbiAgQElucHV0KClcbiAgcmVwcm9qZWN0aW9uRXJyb3JUaHJlc2hvbGQ6IG51bWJlcjtcbiAgQElucHV0KClcbiAgc2VydmVyVHlwZTogc3RyaW5nO1xuICBASW5wdXQoKVxuICB0aWxlR3JpZDogVGlsZUdyaWQ7XG4gIEBJbnB1dCgpXG4gIHRpbGVMb2FkRnVuY3Rpb246IExvYWRGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgdXJsOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHVybHM6IHN0cmluZ1tdO1xuICBASW5wdXQoKVxuICB3cmFwWDogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihASG9zdCgpIGxheWVyOiBMYXllclRpbGVDb21wb25lbnQpIHtcbiAgICBzdXBlcihsYXllcik7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IFRpbGVXTVModGhpcyk7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldFNvdXJjZSh0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAodGhpcy5pbnN0YW5jZSAmJiBjaGFuZ2VzLmhhc093blByb3BlcnR5KCdwYXJhbXMnKSkge1xuICAgICAgdGhpcy5pbnN0YW5jZS51cGRhdGVQYXJhbXModGhpcy5wYXJhbXMpO1xuICAgIH1cbiAgfVxufVxuIl19