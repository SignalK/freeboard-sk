/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Host, Input, forwardRef, ContentChild } from '@angular/core';
import { VectorTile } from 'ol';
import { LayerVectorTileComponent } from '../layers/layervectortile.component';
import { FormatComponent } from '../formats/format.component';
import { TileGridComponent } from '../tilegrid.component';
import { SourceComponent } from './source.component';
import { ProjectionLike } from 'ol/proj';
import { UrlFunction } from 'ol/Tile';
export class SourceVectorTileComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /* need the children to construct the OL3 object */
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.format = this.formatComponent.instance;
        this.tileGrid = this.tileGridComponent.instance;
        // console.log('creating ol.source.VectorTile instance with:', this);
        this.instance = new VectorTile(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceVectorTileComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-vectortile',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceVectorTileComponent)) }]
            }] }
];
/** @nocollapse */
SourceVectorTileComponent.ctorParameters = () => [
    { type: LayerVectorTileComponent, decorators: [{ type: Host }] }
];
SourceVectorTileComponent.propDecorators = {
    cacheSize: [{ type: Input }],
    overlaps: [{ type: Input }],
    projection: [{ type: Input }],
    tilePixelRatio: [{ type: Input }],
    tileUrlFunction: [{ type: Input }],
    url: [{ type: Input }],
    urls: [{ type: Input }],
    wrapX: [{ type: Input }],
    formatComponent: [{ type: ContentChild, args: [FormatComponent,] }],
    tileGridComponent: [{ type: ContentChild, args: [TileGridComponent,] }]
};
if (false) {
    /** @type {?} */
    SourceVectorTileComponent.prototype.instance;
    /** @type {?} */
    SourceVectorTileComponent.prototype.cacheSize;
    /** @type {?} */
    SourceVectorTileComponent.prototype.overlaps;
    /** @type {?} */
    SourceVectorTileComponent.prototype.projection;
    /** @type {?} */
    SourceVectorTileComponent.prototype.tilePixelRatio;
    /** @type {?} */
    SourceVectorTileComponent.prototype.tileUrlFunction;
    /** @type {?} */
    SourceVectorTileComponent.prototype.url;
    /** @type {?} */
    SourceVectorTileComponent.prototype.urls;
    /** @type {?} */
    SourceVectorTileComponent.prototype.wrapX;
    /** @type {?} */
    SourceVectorTileComponent.prototype.formatComponent;
    /** @type {?} */
    SourceVectorTileComponent.prototype.format;
    /** @type {?} */
    SourceVectorTileComponent.prototype.tileGridComponent;
    /** @type {?} */
    SourceVectorTileComponent.prototype.tileGrid;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVjdG9ydGlsZS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zb3VyY2VzL3ZlY3RvcnRpbGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBb0IsTUFBTSxlQUFlLENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUdoQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDekMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQVN0QyxNQUFNLE9BQU8seUJBQTBCLFNBQVEsZUFBZTs7OztJQTBCNUQsWUFBb0IsS0FBK0I7UUFDakQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2YsQ0FBQzs7Ozs7SUFHRCxrQkFBa0I7UUFDaEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQztRQUM1QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7UUFDaEQscUVBQXFFO1FBQ3JFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDOzs7WUE1Q0YsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSx1QkFBdUI7Z0JBQ2pDLFFBQVEsRUFBRTs7R0FFVDtnQkFDRCxTQUFTLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFVBQVU7Ozt3QkFBQyxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsRUFBQyxFQUFFLENBQUM7YUFDcEc7Ozs7WUFiUSx3QkFBd0IsdUJBd0NsQixJQUFJOzs7d0JBeEJoQixLQUFLO3VCQUVMLEtBQUs7eUJBRUwsS0FBSzs2QkFFTCxLQUFLOzhCQUVMLEtBQUs7a0JBRUwsS0FBSzttQkFFTCxLQUFLO29CQUVMLEtBQUs7OEJBR0wsWUFBWSxTQUFDLGVBQWU7Z0NBRzVCLFlBQVksU0FBQyxpQkFBaUI7Ozs7SUFyQi9CLDZDQUE0Qjs7SUFDNUIsOENBQ2tCOztJQUNsQiw2Q0FDa0I7O0lBQ2xCLCtDQUMyQjs7SUFDM0IsbURBQ3VCOztJQUN2QixvREFDNkI7O0lBQzdCLHdDQUNZOztJQUNaLHlDQUNlOztJQUNmLDBDQUNlOztJQUVmLG9EQUNpQzs7SUFDakMsMkNBQWdCOztJQUNoQixzREFDcUM7O0lBQ3JDLDZDQUFtQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSG9zdCwgSW5wdXQsIGZvcndhcmRSZWYsIENvbnRlbnRDaGlsZCwgQWZ0ZXJDb250ZW50SW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgVmVjdG9yVGlsZSB9IGZyb20gJ29sJztcbmltcG9ydCBGZWF0dXJlIGZyb20gJ29sL2Zvcm1hdC9GZWF0dXJlJztcbmltcG9ydCBUaWxlR3JpZCBmcm9tICdvbC90aWxlZ3JpZC9UaWxlR3JpZCc7XG5pbXBvcnQgeyBMYXllclZlY3RvclRpbGVDb21wb25lbnQgfSBmcm9tICcuLi9sYXllcnMvbGF5ZXJ2ZWN0b3J0aWxlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBGb3JtYXRDb21wb25lbnQgfSBmcm9tICcuLi9mb3JtYXRzL2Zvcm1hdC5jb21wb25lbnQnO1xuaW1wb3J0IHsgVGlsZUdyaWRDb21wb25lbnQgfSBmcm9tICcuLi90aWxlZ3JpZC5jb21wb25lbnQnO1xuaW1wb3J0IHsgU291cmNlQ29tcG9uZW50IH0gZnJvbSAnLi9zb3VyY2UuY29tcG9uZW50JztcbmltcG9ydCB7IFByb2plY3Rpb25MaWtlIH0gZnJvbSAnb2wvcHJvaic7XG5pbXBvcnQgeyBVcmxGdW5jdGlvbiB9IGZyb20gJ29sL1RpbGUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtc291cmNlLXZlY3RvcnRpbGUnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbiAgcHJvdmlkZXJzOiBbeyBwcm92aWRlOiBTb3VyY2VDb21wb25lbnQsIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IFNvdXJjZVZlY3RvclRpbGVDb21wb25lbnQpIH1dLFxufSlcbmV4cG9ydCBjbGFzcyBTb3VyY2VWZWN0b3JUaWxlQ29tcG9uZW50IGV4dGVuZHMgU291cmNlQ29tcG9uZW50IGltcGxlbWVudHMgQWZ0ZXJDb250ZW50SW5pdCB7XG4gIHB1YmxpYyBpbnN0YW5jZTogVmVjdG9yVGlsZTtcbiAgQElucHV0KClcbiAgY2FjaGVTaXplOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIG92ZXJsYXBzOiBib29sZWFuO1xuICBASW5wdXQoKVxuICBwcm9qZWN0aW9uOiBQcm9qZWN0aW9uTGlrZTtcbiAgQElucHV0KClcbiAgdGlsZVBpeGVsUmF0aW86IG51bWJlcjtcbiAgQElucHV0KClcbiAgdGlsZVVybEZ1bmN0aW9uOiBVcmxGdW5jdGlvbjtcbiAgQElucHV0KClcbiAgdXJsOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHVybHM6IHN0cmluZ1tdO1xuICBASW5wdXQoKVxuICB3cmFwWDogYm9vbGVhbjtcblxuICBAQ29udGVudENoaWxkKEZvcm1hdENvbXBvbmVudClcbiAgZm9ybWF0Q29tcG9uZW50OiBGb3JtYXRDb21wb25lbnQ7XG4gIGZvcm1hdDogRmVhdHVyZTtcbiAgQENvbnRlbnRDaGlsZChUaWxlR3JpZENvbXBvbmVudClcbiAgdGlsZUdyaWRDb21wb25lbnQ6IFRpbGVHcmlkQ29tcG9uZW50O1xuICB0aWxlR3JpZDogVGlsZUdyaWQ7XG5cbiAgY29uc3RydWN0b3IoQEhvc3QoKSBsYXllcjogTGF5ZXJWZWN0b3JUaWxlQ29tcG9uZW50KSB7XG4gICAgc3VwZXIobGF5ZXIpO1xuICB9XG5cbiAgLyogbmVlZCB0aGUgY2hpbGRyZW4gdG8gY29uc3RydWN0IHRoZSBPTDMgb2JqZWN0ICovXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpIHtcbiAgICB0aGlzLmZvcm1hdCA9IHRoaXMuZm9ybWF0Q29tcG9uZW50Lmluc3RhbmNlO1xuICAgIHRoaXMudGlsZUdyaWQgPSB0aGlzLnRpbGVHcmlkQ29tcG9uZW50Lmluc3RhbmNlO1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBvbC5zb3VyY2UuVmVjdG9yVGlsZSBpbnN0YW5jZSB3aXRoOicsIHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgVmVjdG9yVGlsZSh0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0U291cmNlKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=