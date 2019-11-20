/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Host, Input, forwardRef } from '@angular/core';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
import { TileWMS } from 'ol/source';
import { TileGrid } from 'ol/tilegrid';
import { LoadFunction } from 'ol/Tile';
export class SourceTileWMSComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new TileWMS(this);
        this.host.instance.setSource(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    }
}
SourceTileWMSComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-tilewms',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceTileWMSComponent)) }]
            }] }
];
/** @nocollapse */
SourceTileWMSComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZXdtcy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zb3VyY2VzL3RpbGV3bXMuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQXFCLFVBQVUsRUFBaUIsTUFBTSxlQUFlLENBQUM7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDcEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN2QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBU3ZDLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxlQUFlOzs7O0lBNkJ6RCxZQUFvQixLQUF5QjtRQUMzQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDZixDQUFDOzs7O0lBRUQsUUFBUTtRQUNOLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDOzs7OztJQUVELFdBQVcsQ0FBQyxPQUFzQjtRQUNoQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDOzs7WUFqREYsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxvQkFBb0I7Z0JBQzlCLFFBQVEsRUFBRTs7R0FFVDtnQkFDRCxTQUFTLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFVBQVU7Ozt3QkFBQyxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsRUFBQyxFQUFFLENBQUM7YUFDakc7Ozs7WUFaUSxrQkFBa0IsdUJBMENaLElBQUk7Ozt3QkEzQmhCLEtBQUs7MEJBRUwsS0FBSztxQkFFTCxLQUFLO29CQUVMLEtBQUs7cUJBRUwsS0FBSzt5QkFFTCxLQUFLO3lDQUVMLEtBQUs7eUJBRUwsS0FBSzt1QkFFTCxLQUFLOytCQUVMLEtBQUs7a0JBRUwsS0FBSzttQkFFTCxLQUFLO29CQUVMLEtBQUs7Ozs7SUF6Qk4sMENBQWtCOztJQUNsQiwyQ0FDa0I7O0lBQ2xCLDZDQUNvQjs7SUFDcEIsd0NBQ2U7O0lBQ2YsdUNBQ2U7O0lBQ2Ysd0NBQ2U7O0lBQ2YsNENBQ21COztJQUNuQiw0REFDbUM7O0lBQ25DLDRDQUNtQjs7SUFDbkIsMENBQ21COztJQUNuQixrREFDK0I7O0lBQy9CLHFDQUNZOztJQUNaLHNDQUNlOztJQUNmLHVDQUNlIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBIb3N0LCBJbnB1dCwgT25DaGFuZ2VzLCBPbkluaXQsIGZvcndhcmRSZWYsIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IExheWVyVGlsZUNvbXBvbmVudCB9IGZyb20gJy4uL2xheWVycy9sYXllcnRpbGUuY29tcG9uZW50JztcbmltcG9ydCB7IFNvdXJjZUNvbXBvbmVudCB9IGZyb20gJy4vc291cmNlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBUaWxlV01TIH0gZnJvbSAnb2wvc291cmNlJztcbmltcG9ydCB7IFRpbGVHcmlkIH0gZnJvbSAnb2wvdGlsZWdyaWQnO1xuaW1wb3J0IHsgTG9hZEZ1bmN0aW9uIH0gZnJvbSAnb2wvVGlsZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1zb3VyY2UtdGlsZXdtcycsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxuICBwcm92aWRlcnM6IFt7IHByb3ZpZGU6IFNvdXJjZUNvbXBvbmVudCwgdXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gU291cmNlVGlsZVdNU0NvbXBvbmVudCkgfV0sXG59KVxuZXhwb3J0IGNsYXNzIFNvdXJjZVRpbGVXTVNDb21wb25lbnQgZXh0ZW5kcyBTb3VyY2VDb21wb25lbnQgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uSW5pdCB7XG4gIGluc3RhbmNlOiBUaWxlV01TO1xuICBASW5wdXQoKVxuICBjYWNoZVNpemU6IG51bWJlcjtcbiAgQElucHV0KClcbiAgY3Jvc3NPcmlnaW46IHN0cmluZztcbiAgQElucHV0KClcbiAgZ3V0dGVyOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGhpZHBpOiBib29sZWFuO1xuICBASW5wdXQoKVxuICBwYXJhbXM6IE9iamVjdDtcbiAgQElucHV0KClcbiAgcHJvamVjdGlvbjogc3RyaW5nO1xuICBASW5wdXQoKVxuICByZXByb2plY3Rpb25FcnJvclRocmVzaG9sZDogbnVtYmVyO1xuICBASW5wdXQoKVxuICBzZXJ2ZXJUeXBlOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHRpbGVHcmlkOiBUaWxlR3JpZDtcbiAgQElucHV0KClcbiAgdGlsZUxvYWRGdW5jdGlvbjogTG9hZEZ1bmN0aW9uO1xuICBASW5wdXQoKVxuICB1cmw6IHN0cmluZztcbiAgQElucHV0KClcbiAgdXJsczogc3RyaW5nW107XG4gIEBJbnB1dCgpXG4gIHdyYXBYOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKEBIb3N0KCkgbGF5ZXI6IExheWVyVGlsZUNvbXBvbmVudCkge1xuICAgIHN1cGVyKGxheWVyKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgVGlsZVdNUyh0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0U291cmNlKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmICh0aGlzLmluc3RhbmNlICYmIGNoYW5nZXMuaGFzT3duUHJvcGVydHkoJ3BhcmFtcycpKSB7XG4gICAgICB0aGlzLmluc3RhbmNlLnVwZGF0ZVBhcmFtcyh0aGlzLnBhcmFtcyk7XG4gICAgfVxuICB9XG59XG4iXX0=