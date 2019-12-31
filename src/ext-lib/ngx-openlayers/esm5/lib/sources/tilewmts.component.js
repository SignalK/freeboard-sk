/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, Host, Input, forwardRef, ContentChild, } from '@angular/core';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
import { TileGridWMTSComponent } from '../tilegridwmts.component';
import { WMTS } from 'ol/source';
import { WMTS as TileGridWMTS } from 'ol/tilegrid';
import { ProjectionLike } from 'ol/proj';
import { LoadFunction } from 'ol/Tile';
var SourceTileWMTSComponent = /** @class */ (function (_super) {
    tslib_1.__extends(SourceTileWMTSComponent, _super);
    function SourceTileWMTSComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceTileWMTSComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
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
    };
    /**
     * @return {?}
     */
    SourceTileWMTSComponent.prototype.setLayerSource = /**
     * @return {?}
     */
    function () {
        this.instance = new WMTS(this);
        this.host.instance.setSource(this.instance);
    };
    /**
     * @return {?}
     */
    SourceTileWMTSComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        if (this.tileGridWMTS) {
            this.tileGrid = this.tileGridWMTS.instance;
            this.setLayerSource();
        }
    };
    SourceTileWMTSComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-tilewmts',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceTileWMTSComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceTileWMTSComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
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
    return SourceTileWMTSComponent;
}(SourceComponent));
export { SourceTileWMTSComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZXdtdHMuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvc291cmNlcy90aWxld210cy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULElBQUksRUFDSixLQUFLLEVBQ0wsVUFBVSxFQUVWLFlBQVksR0FHYixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNqQyxPQUFPLEVBQUUsSUFBSSxJQUFJLFlBQVksRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVuRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFFdkM7SUFPNkMsbURBQWU7SUEwQzFELGlDQUFvQixLQUF5QjtlQUMzQyxrQkFBTSxLQUFLLENBQUM7SUFDZCxDQUFDOzs7OztJQUVELDZDQUFXOzs7O0lBQVgsVUFBWSxPQUFzQjs7WUFDMUIsVUFBVSxHQUE2QixFQUFFO1FBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLE9BQU87U0FDUjtRQUNELEtBQUssSUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO1lBQ3pCLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDL0IsUUFBUSxHQUFHLEVBQUU7b0JBQ1gsS0FBSyxLQUFLO3dCQUNSLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQzt3QkFDckMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO3dCQUN0QixNQUFNO29CQUNSO3dCQUNFLE1BQU07aUJBQ1Q7Z0JBQ0QsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUM7YUFDN0M7U0FDRjtRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqRCxDQUFDOzs7O0lBRUQsZ0RBQWM7OztJQUFkO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Ozs7SUFFRCxvREFBa0I7OztJQUFsQjtRQUNFLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1lBQzNDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUN2QjtJQUNILENBQUM7O2dCQXBGRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLHFCQUFxQjtvQkFDL0IsUUFBUSxFQUFFLHFDQUVUO29CQUNELFNBQVMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsVUFBVTs7OzRCQUFDLGNBQU0sT0FBQSx1QkFBdUIsRUFBdkIsQ0FBdUIsRUFBQyxFQUFFLENBQUM7aUJBQ2xHOzs7O2dCQWZRLGtCQUFrQix1QkEwRFosSUFBSTs7OzRCQXhDaEIsS0FBSzs4QkFFTCxLQUFLOzJCQUVMLEtBQUs7NkJBRUwsS0FBSzs2Q0FFTCxLQUFLO2tDQUVMLEtBQUs7d0JBRUwsS0FBSzt3QkFFTCxLQUFLOzRCQUVMLEtBQUs7aUNBRUwsS0FBSzswQkFFTCxLQUFLO3lCQUVMLEtBQUs7NEJBRUwsS0FBSzs2QkFFTCxLQUFLO3NCQUVMLEtBQUs7bUNBRUwsS0FBSzt1QkFFTCxLQUFLO3dCQUVMLEtBQUs7K0JBR0wsWUFBWSxTQUFDLHFCQUFxQjs7SUF1Q3JDLDhCQUFDO0NBQUEsQUFyRkQsQ0FPNkMsZUFBZSxHQThFM0Q7U0E5RVksdUJBQXVCOzs7SUFDbEMsMkNBQWU7O0lBQ2YsNENBQ21COztJQUNuQiw4Q0FDcUI7O0lBQ3JCLDJDQUN1Qjs7SUFDdkIsNkNBQzJCOztJQUMzQiw2REFDb0M7O0lBQ3BDLGtEQUMrQzs7SUFDL0Msd0NBQ2M7O0lBQ2Qsd0NBQ2M7O0lBQ2QsNENBQ2dCOztJQUNoQixpREFDd0I7O0lBQ3hCLDBDQUNpQjs7SUFDakIseUNBQ2dCOztJQUNoQiw0Q0FDa0I7O0lBQ2xCLDZDQUNvQjs7SUFDcEIsc0NBQ2E7O0lBQ2IsbURBQ2dDOztJQUNoQyx1Q0FDZ0I7O0lBQ2hCLHdDQUNnQjs7SUFFaEIsK0NBQ29DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9uZW50LFxuICBIb3N0LFxuICBJbnB1dCxcbiAgZm9yd2FyZFJlZixcbiAgQWZ0ZXJDb250ZW50SW5pdCxcbiAgQ29udGVudENoaWxkLFxuICBTaW1wbGVDaGFuZ2VzLFxuICBPbkNoYW5nZXMsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTGF5ZXJUaWxlQ29tcG9uZW50IH0gZnJvbSAnLi4vbGF5ZXJzL2xheWVydGlsZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgU291cmNlQ29tcG9uZW50IH0gZnJvbSAnLi9zb3VyY2UuY29tcG9uZW50JztcbmltcG9ydCB7IFRpbGVHcmlkV01UU0NvbXBvbmVudCB9IGZyb20gJy4uL3RpbGVncmlkd210cy5jb21wb25lbnQnO1xuaW1wb3J0IHsgV01UUyB9IGZyb20gJ29sL3NvdXJjZSc7XG5pbXBvcnQgeyBXTVRTIGFzIFRpbGVHcmlkV01UUyB9IGZyb20gJ29sL3RpbGVncmlkJztcbmltcG9ydCB7IFdNVFNSZXF1ZXN0RW5jb2RpbmcgfSBmcm9tICdvbC9zb3VyY2UnO1xuaW1wb3J0IHsgUHJvamVjdGlvbkxpa2UgfSBmcm9tICdvbC9wcm9qJztcbmltcG9ydCB7IExvYWRGdW5jdGlvbiB9IGZyb20gJ29sL1RpbGUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtc291cmNlLXRpbGV3bXRzJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gIGAsXG4gIHByb3ZpZGVyczogW3sgcHJvdmlkZTogU291cmNlQ29tcG9uZW50LCB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBTb3VyY2VUaWxlV01UU0NvbXBvbmVudCkgfV0sXG59KVxuZXhwb3J0IGNsYXNzIFNvdXJjZVRpbGVXTVRTQ29tcG9uZW50IGV4dGVuZHMgU291cmNlQ29tcG9uZW50IGltcGxlbWVudHMgQWZ0ZXJDb250ZW50SW5pdCwgT25DaGFuZ2VzIHtcbiAgaW5zdGFuY2U6IFdNVFM7XG4gIEBJbnB1dCgpXG4gIGNhY2hlU2l6ZT86IG51bWJlcjtcbiAgQElucHV0KClcbiAgY3Jvc3NPcmlnaW4/OiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHRpbGVHcmlkOiBUaWxlR3JpZFdNVFM7XG4gIEBJbnB1dCgpXG4gIHByb2plY3Rpb246IFByb2plY3Rpb25MaWtlO1xuICBASW5wdXQoKVxuICByZXByb2plY3Rpb25FcnJvclRocmVzaG9sZD86IG51bWJlcjtcbiAgQElucHV0KClcbiAgcmVxdWVzdEVuY29kaW5nPzogV01UU1JlcXVlc3RFbmNvZGluZyB8IHN0cmluZztcbiAgQElucHV0KClcbiAgbGF5ZXI6IHN0cmluZztcbiAgQElucHV0KClcbiAgc3R5bGU6IHN0cmluZztcbiAgQElucHV0KClcbiAgdGlsZUNsYXNzPzogYW55O1xuICBASW5wdXQoKVxuICB0aWxlUGl4ZWxSYXRpbz86IG51bWJlcjtcbiAgQElucHV0KClcbiAgdmVyc2lvbj86IHN0cmluZztcbiAgQElucHV0KClcbiAgZm9ybWF0Pzogc3RyaW5nO1xuICBASW5wdXQoKVxuICBtYXRyaXhTZXQ6IHN0cmluZztcbiAgQElucHV0KClcbiAgZGltZW5zaW9ucz86IE9iamVjdDtcbiAgQElucHV0KClcbiAgdXJsPzogc3RyaW5nO1xuICBASW5wdXQoKVxuICB0aWxlTG9hZEZ1bmN0aW9uPzogTG9hZEZ1bmN0aW9uO1xuICBASW5wdXQoKVxuICB1cmxzPzogc3RyaW5nW107XG4gIEBJbnB1dCgpXG4gIHdyYXBYPzogYm9vbGVhbjtcblxuICBAQ29udGVudENoaWxkKFRpbGVHcmlkV01UU0NvbXBvbmVudClcbiAgdGlsZUdyaWRXTVRTOiBUaWxlR3JpZFdNVFNDb21wb25lbnQ7XG5cbiAgY29uc3RydWN0b3IoQEhvc3QoKSBsYXllcjogTGF5ZXJUaWxlQ29tcG9uZW50KSB7XG4gICAgc3VwZXIobGF5ZXIpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGNvbnN0IHByb3BlcnRpZXM6IHsgW2luZGV4OiBzdHJpbmddOiBhbnkgfSA9IHt9O1xuICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBpbiBjaGFuZ2VzKSB7XG4gICAgICBpZiAoY2hhbmdlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgY2FzZSAndXJsJzpcbiAgICAgICAgICAgIHRoaXMudXJsID0gY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHRoaXMuc2V0TGF5ZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwcm9wZXJ0aWVzW2tleV0gPSBjaGFuZ2VzW2tleV0uY3VycmVudFZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmluc3RhbmNlLnNldFByb3BlcnRpZXMocHJvcGVydGllcywgZmFsc2UpO1xuICB9XG5cbiAgc2V0TGF5ZXJTb3VyY2UoKTogdm9pZCB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBXTVRTKHRoaXMpO1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRTb3VyY2UodGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ0FmdGVyQ29udGVudEluaXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGlsZUdyaWRXTVRTKSB7XG4gICAgICB0aGlzLnRpbGVHcmlkID0gdGhpcy50aWxlR3JpZFdNVFMuaW5zdGFuY2U7XG4gICAgICB0aGlzLnNldExheWVyU291cmNlKCk7XG4gICAgfVxuICB9XG59XG4iXX0=