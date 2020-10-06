/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Host, Input, forwardRef, ContentChild, } from '@angular/core';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
import { TileGridWMTSComponent } from '../tilegridwmts.component';
import { WMTS } from 'ol/source';
import { WMTS as TileGridWMTS } from 'ol/tilegrid';
import { ProjectionLike } from 'ol/proj';
import { LoadFunction } from 'ol/Tile';
export class SourceTileWMTSComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
            if (changes.hasOwnProperty(key)) {
                switch (key) {
                    case 'url':
                        this.url = changes[key].currentValue;
                        this.setLayerSource();
                        break;
                    default:
                        break;
                }
                properties[key] = changes[key].currentValue;
            }
        }
        this.instance.setProperties(properties, false);
    }
    /**
     * @return {?}
     */
    setLayerSource() {
        this.instance = new WMTS(this);
        this.host.instance.setSource(this.instance);
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        if (this.tileGridWMTS) {
            this.tileGrid = this.tileGridWMTS.instance;
            this.setLayerSource();
        }
    }
}
SourceTileWMTSComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-tilewmts',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceTileWMTSComponent)) }]
            }] }
];
/** @nocollapse */
SourceTileWMTSComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
SourceTileWMTSComponent.propDecorators = {
    cacheSize: [{ type: Input }],
    crossOrigin: [{ type: Input }],
    tileGrid: [{ type: Input }],
    projection: [{ type: Input }],
    reprojectionErrorThreshold: [{ type: Input }],
    requestEncoding: [{ type: Input }],
    layer: [{ type: Input }],
    style: [{ type: Input }],
    tileClass: [{ type: Input }],
    tilePixelRatio: [{ type: Input }],
    version: [{ type: Input }],
    format: [{ type: Input }],
    matrixSet: [{ type: Input }],
    dimensions: [{ type: Input }],
    url: [{ type: Input }],
    tileLoadFunction: [{ type: Input }],
    urls: [{ type: Input }],
    wrapX: [{ type: Input }],
    tileGridWMTS: [{ type: ContentChild, args: [TileGridWMTSComponent,] }]
};
if (false) {
    /** @type {?} */
    SourceTileWMTSComponent.prototype.instance;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.cacheSize;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.crossOrigin;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.tileGrid;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.projection;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.reprojectionErrorThreshold;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.requestEncoding;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.layer;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.style;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.tileClass;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.tilePixelRatio;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.version;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.format;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.matrixSet;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.dimensions;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.url;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.tileLoadFunction;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.urls;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.wrapX;
    /** @type {?} */
    SourceTileWMTSComponent.prototype.tileGridWMTS;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZXdtdHMuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvc291cmNlcy90aWxld210cy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFDTCxTQUFTLEVBQ1QsSUFBSSxFQUNKLEtBQUssRUFDTCxVQUFVLEVBRVYsWUFBWSxHQUdiLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRW5ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQVN2QyxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsZUFBZTs7OztJQTBDMUQsWUFBb0IsS0FBeUI7UUFDM0MsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2YsQ0FBQzs7Ozs7SUFFRCxXQUFXLENBQUMsT0FBc0I7O2NBQzFCLFVBQVUsR0FBNkIsRUFBRTtRQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNsQixPQUFPO1NBQ1I7UUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtZQUN6QixJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQy9CLFFBQVEsR0FBRyxFQUFFO29CQUNYLEtBQUssS0FBSzt3QkFDUixJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUM7d0JBQ3JDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDdEIsTUFBTTtvQkFDUjt3QkFDRSxNQUFNO2lCQUNUO2dCQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDO2FBQzdDO1NBQ0Y7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQzs7OztJQUVELGNBQWM7UUFDWixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQzs7OztJQUVELGtCQUFrQjtRQUNoQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztZQUMzQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDdkI7SUFDSCxDQUFDOzs7WUFwRkYsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxxQkFBcUI7Z0JBQy9CLFFBQVEsRUFBRTs7R0FFVDtnQkFDRCxTQUFTLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFVBQVU7Ozt3QkFBQyxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsRUFBQyxFQUFFLENBQUM7YUFDbEc7Ozs7WUFmUSxrQkFBa0IsdUJBMERaLElBQUk7Ozt3QkF4Q2hCLEtBQUs7MEJBRUwsS0FBSzt1QkFFTCxLQUFLO3lCQUVMLEtBQUs7eUNBRUwsS0FBSzs4QkFFTCxLQUFLO29CQUVMLEtBQUs7b0JBRUwsS0FBSzt3QkFFTCxLQUFLOzZCQUVMLEtBQUs7c0JBRUwsS0FBSztxQkFFTCxLQUFLO3dCQUVMLEtBQUs7eUJBRUwsS0FBSztrQkFFTCxLQUFLOytCQUVMLEtBQUs7bUJBRUwsS0FBSztvQkFFTCxLQUFLOzJCQUdMLFlBQVksU0FBQyxxQkFBcUI7Ozs7SUF0Q25DLDJDQUFlOztJQUNmLDRDQUNtQjs7SUFDbkIsOENBQ3FCOztJQUNyQiwyQ0FDdUI7O0lBQ3ZCLDZDQUMyQjs7SUFDM0IsNkRBQ29DOztJQUNwQyxrREFDK0M7O0lBQy9DLHdDQUNjOztJQUNkLHdDQUNjOztJQUNkLDRDQUNnQjs7SUFDaEIsaURBQ3dCOztJQUN4QiwwQ0FDaUI7O0lBQ2pCLHlDQUNnQjs7SUFDaEIsNENBQ2tCOztJQUNsQiw2Q0FDb0I7O0lBQ3BCLHNDQUNhOztJQUNiLG1EQUNnQzs7SUFDaEMsdUNBQ2dCOztJQUNoQix3Q0FDZ0I7O0lBRWhCLCtDQUNvQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudCxcbiAgSG9zdCxcbiAgSW5wdXQsXG4gIGZvcndhcmRSZWYsXG4gIEFmdGVyQ29udGVudEluaXQsXG4gIENvbnRlbnRDaGlsZCxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgT25DaGFuZ2VzLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IExheWVyVGlsZUNvbXBvbmVudCB9IGZyb20gJy4uL2xheWVycy9sYXllcnRpbGUuY29tcG9uZW50JztcbmltcG9ydCB7IFNvdXJjZUNvbXBvbmVudCB9IGZyb20gJy4vc291cmNlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBUaWxlR3JpZFdNVFNDb21wb25lbnQgfSBmcm9tICcuLi90aWxlZ3JpZHdtdHMuY29tcG9uZW50JztcbmltcG9ydCB7IFdNVFMgfSBmcm9tICdvbC9zb3VyY2UnO1xuaW1wb3J0IHsgV01UUyBhcyBUaWxlR3JpZFdNVFMgfSBmcm9tICdvbC90aWxlZ3JpZCc7XG5pbXBvcnQgeyBXTVRTUmVxdWVzdEVuY29kaW5nIH0gZnJvbSAnb2wvc291cmNlJztcbmltcG9ydCB7IFByb2plY3Rpb25MaWtlIH0gZnJvbSAnb2wvcHJvaic7XG5pbXBvcnQgeyBMb2FkRnVuY3Rpb24gfSBmcm9tICdvbC9UaWxlJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLXNvdXJjZS10aWxld210cycsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxuICBwcm92aWRlcnM6IFt7IHByb3ZpZGU6IFNvdXJjZUNvbXBvbmVudCwgdXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gU291cmNlVGlsZVdNVFNDb21wb25lbnQpIH1dLFxufSlcbmV4cG9ydCBjbGFzcyBTb3VyY2VUaWxlV01UU0NvbXBvbmVudCBleHRlbmRzIFNvdXJjZUNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyQ29udGVudEluaXQsIE9uQ2hhbmdlcyB7XG4gIGluc3RhbmNlOiBXTVRTO1xuICBASW5wdXQoKVxuICBjYWNoZVNpemU/OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGNyb3NzT3JpZ2luPzogc3RyaW5nO1xuICBASW5wdXQoKVxuICB0aWxlR3JpZDogVGlsZUdyaWRXTVRTO1xuICBASW5wdXQoKVxuICBwcm9qZWN0aW9uOiBQcm9qZWN0aW9uTGlrZTtcbiAgQElucHV0KClcbiAgcmVwcm9qZWN0aW9uRXJyb3JUaHJlc2hvbGQ/OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHJlcXVlc3RFbmNvZGluZz86IFdNVFNSZXF1ZXN0RW5jb2RpbmcgfCBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGxheWVyOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHN0eWxlOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHRpbGVDbGFzcz86IGFueTtcbiAgQElucHV0KClcbiAgdGlsZVBpeGVsUmF0aW8/OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHZlcnNpb24/OiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGZvcm1hdD86IHN0cmluZztcbiAgQElucHV0KClcbiAgbWF0cml4U2V0OiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGRpbWVuc2lvbnM/OiBPYmplY3Q7XG4gIEBJbnB1dCgpXG4gIHVybD86IHN0cmluZztcbiAgQElucHV0KClcbiAgdGlsZUxvYWRGdW5jdGlvbj86IExvYWRGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgdXJscz86IHN0cmluZ1tdO1xuICBASW5wdXQoKVxuICB3cmFwWD86IGJvb2xlYW47XG5cbiAgQENvbnRlbnRDaGlsZChUaWxlR3JpZFdNVFNDb21wb25lbnQpXG4gIHRpbGVHcmlkV01UUzogVGlsZUdyaWRXTVRTQ29tcG9uZW50O1xuXG4gIGNvbnN0cnVjdG9yKEBIb3N0KCkgbGF5ZXI6IExheWVyVGlsZUNvbXBvbmVudCkge1xuICAgIHN1cGVyKGxheWVyKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzOiB7IFtpbmRleDogc3RyaW5nXTogYW55IH0gPSB7fTtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gY2hhbmdlcykge1xuICAgICAgaWYgKGNoYW5nZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICB0aGlzLnVybCA9IGNoYW5nZXNba2V5XS5jdXJyZW50VmFsdWU7XG4gICAgICAgICAgICB0aGlzLnNldExheWVyU291cmNlKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcHJvcGVydGllc1trZXldID0gY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5pbnN0YW5jZS5zZXRQcm9wZXJ0aWVzKHByb3BlcnRpZXMsIGZhbHNlKTtcbiAgfVxuXG4gIHNldExheWVyU291cmNlKCk6IHZvaWQge1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgV01UUyh0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0U291cmNlKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdBZnRlckNvbnRlbnRJbml0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnRpbGVHcmlkV01UUykge1xuICAgICAgdGhpcy50aWxlR3JpZCA9IHRoaXMudGlsZUdyaWRXTVRTLmluc3RhbmNlO1xuICAgICAgdGhpcy5zZXRMYXllclNvdXJjZSgpO1xuICAgIH1cbiAgfVxufVxuIl19