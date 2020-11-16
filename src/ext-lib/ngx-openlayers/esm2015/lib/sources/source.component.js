/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Input } from '@angular/core';
export class SourceComponent {
    /**
     * @param {?} host
     * @param {?=} raster
     */
    constructor(host, raster) {
        this.host = host;
        this.raster = raster;
        this.componentType = 'source';
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this.host && this.host.instance) {
            this.host.instance.setSource(null);
        }
        if (this.raster) {
            this.raster.sources = [];
        }
    }
    /**
     * @protected
     * @param {?} s
     * @return {?}
     */
    _register(s) {
        if (this.host) {
            this.host.instance.setSource(s);
        }
        if (this.raster) {
            this.raster.sources = [s];
            this.raster.init();
        }
    }
}
SourceComponent.propDecorators = {
    attributions: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    SourceComponent.prototype.instance;
    /** @type {?} */
    SourceComponent.prototype.componentType;
    /** @type {?} */
    SourceComponent.prototype.attributions;
    /**
     * @type {?}
     * @protected
     */
    SourceComponent.prototype.host;
    /**
     * @type {?}
     * @protected
     */
    SourceComponent.prototype.raster;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3NvdXJjZXMvc291cmNlLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLEtBQUssRUFBYSxNQUFNLGVBQWUsQ0FBQztBQUtqRCxNQUFNLE9BQU8sZUFBZTs7Ozs7SUFPMUIsWUFBc0IsSUFBb0IsRUFBWSxNQUE4QjtRQUE5RCxTQUFJLEdBQUosSUFBSSxDQUFnQjtRQUFZLFdBQU0sR0FBTixNQUFNLENBQXdCO1FBTDdFLGtCQUFhLEdBQUcsUUFBUSxDQUFDO0lBS3VELENBQUM7Ozs7SUFFeEYsV0FBVztRQUNULElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDMUI7SUFDSCxDQUFDOzs7Ozs7SUFFUyxTQUFTLENBQUMsQ0FBUztRQUMzQixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDcEI7SUFDSCxDQUFDOzs7MkJBeEJBLEtBQUs7Ozs7SUFITixtQ0FBd0I7O0lBQ3hCLHdDQUFnQzs7SUFFaEMsdUNBQ2tCOzs7OztJQUVOLCtCQUE4Qjs7Ozs7SUFBRSxpQ0FBd0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbnB1dCwgT25EZXN0cm95IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBTb3VyY2UgfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBMYXllckNvbXBvbmVudCB9IGZyb20gJy4uL2xheWVycy9sYXllci5jb21wb25lbnQnO1xuaW1wb3J0IHsgU291cmNlUmFzdGVyQ29tcG9uZW50IH0gZnJvbSAnLi9yYXN0ZXIuY29tcG9uZW50JztcblxuZXhwb3J0IGNsYXNzIFNvdXJjZUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHB1YmxpYyBpbnN0YW5jZTogU291cmNlO1xuICBwdWJsaWMgY29tcG9uZW50VHlwZSA9ICdzb3VyY2UnO1xuXG4gIEBJbnB1dCgpXG4gIGF0dHJpYnV0aW9uczogYW55O1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBob3N0OiBMYXllckNvbXBvbmVudCwgcHJvdGVjdGVkIHJhc3Rlcj86IFNvdXJjZVJhc3RlckNvbXBvbmVudCkge31cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5ob3N0ICYmIHRoaXMuaG9zdC5pbnN0YW5jZSkge1xuICAgICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldFNvdXJjZShudWxsKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yYXN0ZXIpIHtcbiAgICAgIHRoaXMucmFzdGVyLnNvdXJjZXMgPSBbXTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX3JlZ2lzdGVyKHM6IFNvdXJjZSkge1xuICAgIGlmICh0aGlzLmhvc3QpIHtcbiAgICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRTb3VyY2Uocyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmFzdGVyKSB7XG4gICAgICB0aGlzLnJhc3Rlci5zb3VyY2VzID0gW3NdO1xuICAgICAgdGhpcy5yYXN0ZXIuaW5pdCgpO1xuICAgIH1cbiAgfVxufVxuIl19