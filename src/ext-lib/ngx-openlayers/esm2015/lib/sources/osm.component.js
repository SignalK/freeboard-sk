/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Host, forwardRef, Input, Optional, Output, EventEmitter } from '@angular/core';
import { OSM } from 'ol/source';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
import { SourceXYZComponent } from './xyz.component';
import { SourceRasterComponent } from './raster.component';
import { LoadFunction } from 'ol/Tile';
import { AttributionLike } from 'ol/source/Source';
export class SourceOsmComponent extends SourceXYZComponent {
    /**
     * @param {?} layer
     * @param {?=} raster
     */
    constructor(layer, raster) {
        super(layer, raster);
        this.tileLoadStart = new EventEmitter();
        this.tileLoadEnd = new EventEmitter();
        this.tileLoadError = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        if (this.tileGridXYZ) {
            this.tileGrid = this.tileGridXYZ.instance;
        }
        this.instance = new OSM(this);
        this.instance.on('tileloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadStart.emit(event)));
        this.instance.on('tileloadend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadEnd.emit(event)));
        this.instance.on('tileloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadError.emit(event)));
        this._register(this.instance);
    }
}
SourceOsmComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-osm',
                template: `
    <div class="aol-source-osm"></div>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceOsmComponent)) }]
            }] }
];
/** @nocollapse */
SourceOsmComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }, { type: Optional }] },
    { type: SourceRasterComponent, decorators: [{ type: Host }, { type: Optional }] }
];
SourceOsmComponent.propDecorators = {
    attributions: [{ type: Input }],
    cacheSize: [{ type: Input }],
    crossOrigin: [{ type: Input }],
    maxZoom: [{ type: Input }],
    opaque: [{ type: Input }],
    reprojectionErrorThreshold: [{ type: Input }],
    tileLoadFunction: [{ type: Input }],
    url: [{ type: Input }],
    wrapX: [{ type: Input }],
    tileLoadStart: [{ type: Output }],
    tileLoadEnd: [{ type: Output }],
    tileLoadError: [{ type: Output }]
};
if (false) {
    /** @type {?} */
    SourceOsmComponent.prototype.instance;
    /** @type {?} */
    SourceOsmComponent.prototype.attributions;
    /** @type {?} */
    SourceOsmComponent.prototype.cacheSize;
    /** @type {?} */
    SourceOsmComponent.prototype.crossOrigin;
    /** @type {?} */
    SourceOsmComponent.prototype.maxZoom;
    /** @type {?} */
    SourceOsmComponent.prototype.opaque;
    /** @type {?} */
    SourceOsmComponent.prototype.reprojectionErrorThreshold;
    /** @type {?} */
    SourceOsmComponent.prototype.tileLoadFunction;
    /** @type {?} */
    SourceOsmComponent.prototype.url;
    /** @type {?} */
    SourceOsmComponent.prototype.wrapX;
    /** @type {?} */
    SourceOsmComponent.prototype.tileLoadStart;
    /** @type {?} */
    SourceOsmComponent.prototype.tileLoadEnd;
    /** @type {?} */
    SourceOsmComponent.prototype.tileLoadError;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3NvdXJjZXMvb3NtLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBb0IsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNoQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFVbkQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGtCQUFrQjs7Ozs7SUE2QnhELFlBR0UsS0FBeUIsRUFHekIsTUFBOEI7UUFFOUIsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQWR2QixrQkFBYSxHQUFrQyxJQUFJLFlBQVksRUFBbUIsQ0FBQztRQUVuRixnQkFBVyxHQUFrQyxJQUFJLFlBQVksRUFBbUIsQ0FBQztRQUVqRixrQkFBYSxHQUFrQyxJQUFJLFlBQVksRUFBbUIsQ0FBQztJQVduRixDQUFDOzs7O0lBRUQsa0JBQWtCO1FBQ2hCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1NBQzNDO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU5QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlOzs7O1FBQUUsQ0FBQyxLQUFzQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGFBQWE7Ozs7UUFBRSxDQUFDLEtBQXNCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZTs7OztRQUFFLENBQUMsS0FBc0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDOzs7WUExREYsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxnQkFBZ0I7Z0JBQzFCLFFBQVEsRUFBRTs7R0FFVDtnQkFDRCxTQUFTLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFVBQVU7Ozt3QkFBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsRUFBQyxFQUFFLENBQUM7YUFDN0Y7Ozs7WUFkUSxrQkFBa0IsdUJBNkN0QixJQUFJLFlBQ0osUUFBUTtZQTNDSixxQkFBcUIsdUJBNkN6QixJQUFJLFlBQ0osUUFBUTs7OzJCQS9CVixLQUFLO3dCQUVMLEtBQUs7MEJBRUwsS0FBSztzQkFFTCxLQUFLO3FCQUVMLEtBQUs7eUNBRUwsS0FBSzsrQkFFTCxLQUFLO2tCQUVMLEtBQUs7b0JBRUwsS0FBSzs0QkFHTCxNQUFNOzBCQUVOLE1BQU07NEJBRU4sTUFBTTs7OztJQXpCUCxzQ0FBYzs7SUFFZCwwQ0FDOEI7O0lBQzlCLHVDQUNrQjs7SUFDbEIseUNBQ29COztJQUNwQixxQ0FDZ0I7O0lBQ2hCLG9DQUNnQjs7SUFDaEIsd0RBQ21DOztJQUNuQyw4Q0FDK0I7O0lBQy9CLGlDQUNZOztJQUNaLG1DQUNlOztJQUVmLDJDQUNtRjs7SUFDbkYseUNBQ2lGOztJQUNqRiwyQ0FDbUYiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEhvc3QsIGZvcndhcmRSZWYsIElucHV0LCBBZnRlckNvbnRlbnRJbml0LCBPcHRpb25hbCwgT3V0cHV0LCBFdmVudEVtaXR0ZXIgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IE9TTSB9IGZyb20gJ29sL3NvdXJjZSc7XG5pbXBvcnQgeyBMYXllclRpbGVDb21wb25lbnQgfSBmcm9tICcuLi9sYXllcnMvbGF5ZXJ0aWxlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTb3VyY2VDb21wb25lbnQgfSBmcm9tICcuL3NvdXJjZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgU291cmNlWFlaQ29tcG9uZW50IH0gZnJvbSAnLi94eXouY29tcG9uZW50JztcbmltcG9ydCB7IFNvdXJjZVJhc3RlckNvbXBvbmVudCB9IGZyb20gJy4vcmFzdGVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMb2FkRnVuY3Rpb24gfSBmcm9tICdvbC9UaWxlJztcbmltcG9ydCB7IEF0dHJpYnV0aW9uTGlrZSB9IGZyb20gJ29sL3NvdXJjZS9Tb3VyY2UnO1xuaW1wb3J0IHsgVGlsZVNvdXJjZUV2ZW50IH0gZnJvbSAnb2wvc291cmNlL1RpbGUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtc291cmNlLW9zbScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGRpdiBjbGFzcz1cImFvbC1zb3VyY2Utb3NtXCI+PC9kaXY+XG4gIGAsXG4gIHByb3ZpZGVyczogW3sgcHJvdmlkZTogU291cmNlQ29tcG9uZW50LCB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBTb3VyY2VPc21Db21wb25lbnQpIH1dLFxufSlcbmV4cG9ydCBjbGFzcyBTb3VyY2VPc21Db21wb25lbnQgZXh0ZW5kcyBTb3VyY2VYWVpDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlckNvbnRlbnRJbml0IHtcbiAgaW5zdGFuY2U6IE9TTTtcblxuICBASW5wdXQoKVxuICBhdHRyaWJ1dGlvbnM6IEF0dHJpYnV0aW9uTGlrZTtcbiAgQElucHV0KClcbiAgY2FjaGVTaXplOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGNyb3NzT3JpZ2luOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIG1heFpvb206IG51bWJlcjtcbiAgQElucHV0KClcbiAgb3BhcXVlOiBib29sZWFuO1xuICBASW5wdXQoKVxuICByZXByb2plY3Rpb25FcnJvclRocmVzaG9sZDogbnVtYmVyO1xuICBASW5wdXQoKVxuICB0aWxlTG9hZEZ1bmN0aW9uOiBMb2FkRnVuY3Rpb247XG4gIEBJbnB1dCgpXG4gIHVybDogc3RyaW5nO1xuICBASW5wdXQoKVxuICB3cmFwWDogYm9vbGVhbjtcblxuICBAT3V0cHV0KClcbiAgdGlsZUxvYWRTdGFydDogRXZlbnRFbWl0dGVyPFRpbGVTb3VyY2VFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPFRpbGVTb3VyY2VFdmVudD4oKTtcbiAgQE91dHB1dCgpXG4gIHRpbGVMb2FkRW5kOiBFdmVudEVtaXR0ZXI8VGlsZVNvdXJjZUV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8VGlsZVNvdXJjZUV2ZW50PigpO1xuICBAT3V0cHV0KClcbiAgdGlsZUxvYWRFcnJvcjogRXZlbnRFbWl0dGVyPFRpbGVTb3VyY2VFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPFRpbGVTb3VyY2VFdmVudD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBASG9zdCgpXG4gICAgQE9wdGlvbmFsKClcbiAgICBsYXllcjogTGF5ZXJUaWxlQ29tcG9uZW50LFxuICAgIEBIb3N0KClcbiAgICBAT3B0aW9uYWwoKVxuICAgIHJhc3Rlcj86IFNvdXJjZVJhc3RlckNvbXBvbmVudFxuICApIHtcbiAgICBzdXBlcihsYXllciwgcmFzdGVyKTtcbiAgfVxuXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpIHtcbiAgICBpZiAodGhpcy50aWxlR3JpZFhZWikge1xuICAgICAgdGhpcy50aWxlR3JpZCA9IHRoaXMudGlsZUdyaWRYWVouaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBPU00odGhpcyk7XG5cbiAgICB0aGlzLmluc3RhbmNlLm9uKCd0aWxlbG9hZHN0YXJ0JywgKGV2ZW50OiBUaWxlU291cmNlRXZlbnQpID0+IHRoaXMudGlsZUxvYWRTdGFydC5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbigndGlsZWxvYWRlbmQnLCAoZXZlbnQ6IFRpbGVTb3VyY2VFdmVudCkgPT4gdGhpcy50aWxlTG9hZEVuZC5lbWl0KGV2ZW50KSk7XG4gICAgdGhpcy5pbnN0YW5jZS5vbigndGlsZWxvYWRlcnJvcicsIChldmVudDogVGlsZVNvdXJjZUV2ZW50KSA9PiB0aGlzLnRpbGVMb2FkRXJyb3IuZW1pdChldmVudCkpO1xuICAgIHRoaXMuX3JlZ2lzdGVyKHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=