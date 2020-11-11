/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Input } from '@angular/core';
/**
 * @abstract
 */
var SimpleGeometryComponent = /** @class */ (function () {
    function SimpleGeometryComponent(map, host) {
        this.map = map;
        this.host = host;
        this.componentType = 'simple-geometry';
    }
    /**
     * @return {?}
     */
    SimpleGeometryComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.host.instance.setGeometry(this.instance);
    };
    SimpleGeometryComponent.propDecorators = {
        srid: [{ type: Input }]
    };
    return SimpleGeometryComponent;
}());
export { SimpleGeometryComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlZ2VvbWV0cnkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvZ2VvbS9zaW1wbGVnZW9tZXRyeS5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSxlQUFlLENBQUM7Ozs7QUFLOUM7SUFNRSxpQ0FBc0IsR0FBaUIsRUFBWSxJQUFzQjtRQUFuRCxRQUFHLEdBQUgsR0FBRyxDQUFjO1FBQVksU0FBSSxHQUFKLElBQUksQ0FBa0I7UUFKbEUsa0JBQWEsR0FBRyxpQkFBaUIsQ0FBQztJQUltQyxDQUFDOzs7O0lBRTdFLDBDQUFROzs7SUFBUjtRQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEQsQ0FBQzs7dUJBTkEsS0FBSzs7SUFPUiw4QkFBQztDQUFBLEFBWEQsSUFXQztTQVhxQix1QkFBdUI7OztJQUMzQywyQ0FBZ0M7O0lBQ2hDLGdEQUF5Qzs7SUFFekMsdUNBQXNCOzs7OztJQUVWLHNDQUEyQjs7Ozs7SUFBRSx1Q0FBZ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbnB1dCwgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBGZWF0dXJlQ29tcG9uZW50IH0gZnJvbSAnLi4vZmVhdHVyZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgU2ltcGxlR2VvbWV0cnkgZnJvbSAnb2wvZ2VvbS9TaW1wbGVHZW9tZXRyeSc7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTaW1wbGVHZW9tZXRyeUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCB7XG4gIHB1YmxpYyBpbnN0YW5jZTogU2ltcGxlR2VvbWV0cnk7XG4gIHB1YmxpYyBjb21wb25lbnRUeXBlID0gJ3NpbXBsZS1nZW9tZXRyeSc7XG5cbiAgQElucHV0KCkgc3JpZDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBtYXA6IE1hcENvbXBvbmVudCwgcHJvdGVjdGVkIGhvc3Q6IEZlYXR1cmVDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldEdlb21ldHJ5KHRoaXMuaW5zdGFuY2UpO1xuICB9XG59XG4iXX0=