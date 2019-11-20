/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Input } from '@angular/core';
/**
 * @abstract
 */
export class SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        this.map = map;
        this.host = host;
        this.componentType = 'simple-geometry';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.host.instance.setGeometry(this.instance);
    }
}
SimpleGeometryComponent.propDecorators = {
    srid: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    SimpleGeometryComponent.prototype.instance;
    /** @type {?} */
    SimpleGeometryComponent.prototype.componentType;
    /** @type {?} */
    SimpleGeometryComponent.prototype.srid;
    /**
     * @type {?}
     * @protected
     */
    SimpleGeometryComponent.prototype.map;
    /**
     * @type {?}
     * @protected
     */
    SimpleGeometryComponent.prototype.host;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlZ2VvbWV0cnkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvZ2VvbS9zaW1wbGVnZW9tZXRyeS5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSxlQUFlLENBQUM7Ozs7QUFLOUMsTUFBTSxPQUFnQix1QkFBdUI7Ozs7O0lBTTNDLFlBQXNCLEdBQWlCLEVBQVksSUFBc0I7UUFBbkQsUUFBRyxHQUFILEdBQUcsQ0FBYztRQUFZLFNBQUksR0FBSixJQUFJLENBQWtCO1FBSmxFLGtCQUFhLEdBQUcsaUJBQWlCLENBQUM7SUFJbUMsQ0FBQzs7OztJQUU3RSxRQUFRO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDOzs7bUJBTkEsS0FBSzs7OztJQUhOLDJDQUFnQzs7SUFDaEMsZ0RBQXlDOztJQUV6Qyx1Q0FBc0I7Ozs7O0lBRVYsc0NBQTJCOzs7OztJQUFFLHVDQUFnQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElucHV0LCBPbkluaXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEZlYXR1cmVDb21wb25lbnQgfSBmcm9tICcuLi9mZWF0dXJlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuLi9tYXAuY29tcG9uZW50JztcbmltcG9ydCBTaW1wbGVHZW9tZXRyeSBmcm9tICdvbC9nZW9tL1NpbXBsZUdlb21ldHJ5JztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNpbXBsZUdlb21ldHJ5Q29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgcHVibGljIGluc3RhbmNlOiBTaW1wbGVHZW9tZXRyeTtcbiAgcHVibGljIGNvbXBvbmVudFR5cGUgPSAnc2ltcGxlLWdlb21ldHJ5JztcblxuICBASW5wdXQoKSBzcmlkOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIG1hcDogTWFwQ29tcG9uZW50LCBwcm90ZWN0ZWQgaG9zdDogRmVhdHVyZUNvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0R2VvbWV0cnkodGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==