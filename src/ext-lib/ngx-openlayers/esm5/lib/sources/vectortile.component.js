/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, Host, Input, forwardRef, ContentChild } from '@angular/core';
import { VectorTile } from 'ol';
import { LayerVectorTileComponent } from '../layers/layervectortile.component';
import { FormatComponent } from '../formats/format.component';
import { TileGridComponent } from '../tilegrid.component';
import { SourceComponent } from './source.component';
import { ProjectionLike } from 'ol/proj';
import { UrlFunction } from 'ol/Tile';
var SourceVectorTileComponent = /** @class */ (function (_super) {
    tslib_1.__extends(SourceVectorTileComponent, _super);
    function SourceVectorTileComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /* need the children to construct the OL3 object */
    /* need the children to construct the OL3 object */
    /**
     * @return {?}
     */
    SourceVectorTileComponent.prototype.ngAfterContentInit = /* need the children to construct the OL3 object */
    /**
     * @return {?}
     */
    function () {
        this.format = this.formatComponent.instance;
        this.tileGrid = this.tileGridComponent.instance;
        // console.log('creating ol.source.VectorTile instance with:', this);
        this.instance = new VectorTile(this);
        this.host.instance.setSource(this.instance);
    };
    SourceVectorTileComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-vectortile',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceVectorTileComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceVectorTileComponent.ctorParameters = function () { return [
        { type: LayerVectorTileComponent, decorators: [{ type: Host }] }
    ]; };
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
    return SourceVectorTileComponent;
}(SourceComponent));
export { SourceVectorTileComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVjdG9ydGlsZS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zb3VyY2VzL3ZlY3RvcnRpbGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQW9CLE1BQU0sZUFBZSxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFHaEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFFdEM7SUFPK0MscURBQWU7SUEwQjVELG1DQUFvQixLQUErQjtlQUNqRCxrQkFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsbURBQW1EOzs7OztJQUNuRCxzREFBa0I7Ozs7SUFBbEI7UUFDRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDO1FBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztRQUNoRCxxRUFBcUU7UUFDckUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7O2dCQTVDRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLHVCQUF1QjtvQkFDakMsUUFBUSxFQUFFLHFDQUVUO29CQUNELFNBQVMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsVUFBVTs7OzRCQUFDLGNBQU0sT0FBQSx5QkFBeUIsRUFBekIsQ0FBeUIsRUFBQyxFQUFFLENBQUM7aUJBQ3BHOzs7O2dCQWJRLHdCQUF3Qix1QkF3Q2xCLElBQUk7Ozs0QkF4QmhCLEtBQUs7MkJBRUwsS0FBSzs2QkFFTCxLQUFLO2lDQUVMLEtBQUs7a0NBRUwsS0FBSztzQkFFTCxLQUFLO3VCQUVMLEtBQUs7d0JBRUwsS0FBSztrQ0FHTCxZQUFZLFNBQUMsZUFBZTtvQ0FHNUIsWUFBWSxTQUFDLGlCQUFpQjs7SUFnQmpDLGdDQUFDO0NBQUEsQUE3Q0QsQ0FPK0MsZUFBZSxHQXNDN0Q7U0F0Q1kseUJBQXlCOzs7SUFDcEMsNkNBQTRCOztJQUM1Qiw4Q0FDa0I7O0lBQ2xCLDZDQUNrQjs7SUFDbEIsK0NBQzJCOztJQUMzQixtREFDdUI7O0lBQ3ZCLG9EQUM2Qjs7SUFDN0Isd0NBQ1k7O0lBQ1oseUNBQ2U7O0lBQ2YsMENBQ2U7O0lBRWYsb0RBQ2lDOztJQUNqQywyQ0FBZ0I7O0lBQ2hCLHNEQUNxQzs7SUFDckMsNkNBQW1CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBIb3N0LCBJbnB1dCwgZm9yd2FyZFJlZiwgQ29udGVudENoaWxkLCBBZnRlckNvbnRlbnRJbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBWZWN0b3JUaWxlIH0gZnJvbSAnb2wnO1xuaW1wb3J0IEZlYXR1cmUgZnJvbSAnb2wvZm9ybWF0L0ZlYXR1cmUnO1xuaW1wb3J0IFRpbGVHcmlkIGZyb20gJ29sL3RpbGVncmlkL1RpbGVHcmlkJztcbmltcG9ydCB7IExheWVyVmVjdG9yVGlsZUNvbXBvbmVudCB9IGZyb20gJy4uL2xheWVycy9sYXllcnZlY3RvcnRpbGUuY29tcG9uZW50JztcbmltcG9ydCB7IEZvcm1hdENvbXBvbmVudCB9IGZyb20gJy4uL2Zvcm1hdHMvZm9ybWF0LmNvbXBvbmVudCc7XG5pbXBvcnQgeyBUaWxlR3JpZENvbXBvbmVudCB9IGZyb20gJy4uL3RpbGVncmlkLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTb3VyY2VDb21wb25lbnQgfSBmcm9tICcuL3NvdXJjZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgUHJvamVjdGlvbkxpa2UgfSBmcm9tICdvbC9wcm9qJztcbmltcG9ydCB7IFVybEZ1bmN0aW9uIH0gZnJvbSAnb2wvVGlsZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1zb3VyY2UtdmVjdG9ydGlsZScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxuICBwcm92aWRlcnM6IFt7IHByb3ZpZGU6IFNvdXJjZUNvbXBvbmVudCwgdXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gU291cmNlVmVjdG9yVGlsZUNvbXBvbmVudCkgfV0sXG59KVxuZXhwb3J0IGNsYXNzIFNvdXJjZVZlY3RvclRpbGVDb21wb25lbnQgZXh0ZW5kcyBTb3VyY2VDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlckNvbnRlbnRJbml0IHtcbiAgcHVibGljIGluc3RhbmNlOiBWZWN0b3JUaWxlO1xuICBASW5wdXQoKVxuICBjYWNoZVNpemU6IG51bWJlcjtcbiAgQElucHV0KClcbiAgb3ZlcmxhcHM6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIHByb2plY3Rpb246IFByb2plY3Rpb25MaWtlO1xuICBASW5wdXQoKVxuICB0aWxlUGl4ZWxSYXRpbzogbnVtYmVyO1xuICBASW5wdXQoKVxuICB0aWxlVXJsRnVuY3Rpb246IFVybEZ1bmN0aW9uO1xuICBASW5wdXQoKVxuICB1cmw6IHN0cmluZztcbiAgQElucHV0KClcbiAgdXJsczogc3RyaW5nW107XG4gIEBJbnB1dCgpXG4gIHdyYXBYOiBib29sZWFuO1xuXG4gIEBDb250ZW50Q2hpbGQoRm9ybWF0Q29tcG9uZW50KVxuICBmb3JtYXRDb21wb25lbnQ6IEZvcm1hdENvbXBvbmVudDtcbiAgZm9ybWF0OiBGZWF0dXJlO1xuICBAQ29udGVudENoaWxkKFRpbGVHcmlkQ29tcG9uZW50KVxuICB0aWxlR3JpZENvbXBvbmVudDogVGlsZUdyaWRDb21wb25lbnQ7XG4gIHRpbGVHcmlkOiBUaWxlR3JpZDtcblxuICBjb25zdHJ1Y3RvcihASG9zdCgpIGxheWVyOiBMYXllclZlY3RvclRpbGVDb21wb25lbnQpIHtcbiAgICBzdXBlcihsYXllcik7XG4gIH1cblxuICAvKiBuZWVkIHRoZSBjaGlsZHJlbiB0byBjb25zdHJ1Y3QgdGhlIE9MMyBvYmplY3QgKi9cbiAgbmdBZnRlckNvbnRlbnRJbml0KCkge1xuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5mb3JtYXRDb21wb25lbnQuaW5zdGFuY2U7XG4gICAgdGhpcy50aWxlR3JpZCA9IHRoaXMudGlsZUdyaWRDb21wb25lbnQuaW5zdGFuY2U7XG4gICAgLy8gY29uc29sZS5sb2coJ2NyZWF0aW5nIG9sLnNvdXJjZS5WZWN0b3JUaWxlIGluc3RhbmNlIHdpdGg6JywgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBWZWN0b3JUaWxlKHRoaXMpO1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRTb3VyY2UodGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==