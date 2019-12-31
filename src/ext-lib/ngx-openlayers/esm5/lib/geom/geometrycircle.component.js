/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, Input } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { Circle } from 'ol/geom';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
var GeometryCircleComponent = /** @class */ (function (_super) {
    tslib_1.__extends(GeometryCircleComponent, _super);
    function GeometryCircleComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-circle';
        // defaulting coordinates to [0,0]. To be overridden in child component.
        _this.instance = new Circle([0, 0]);
        return _this;
    }
    Object.defineProperty(GeometryCircleComponent.prototype, "radius", {
        get: /**
         * @return {?}
         */
        function () {
            return this.instance.getRadius();
        },
        set: /**
         * @param {?} radius
         * @return {?}
         */
        function (radius) {
            this.instance.setRadius(radius);
        },
        enumerable: true,
        configurable: true
    });
    GeometryCircleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-circle',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryCircleComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    GeometryCircleComponent.propDecorators = {
        radius: [{ type: Input }]
    };
    return GeometryCircleComponent;
}(SimpleGeometryComponent));
export { GeometryCircleComponent };
if (false) {
    /** @type {?} */
    GeometryCircleComponent.prototype.componentType;
    /** @type {?} */
    GeometryCircleComponent.prototype.instance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvbWV0cnljaXJjbGUuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvZ2VvbS9nZW9tZXRyeWNpcmNsZS5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBVSxNQUFNLGVBQWUsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVoRDtJQU02QyxtREFBdUI7SUFZbEUsaUNBQVksR0FBaUIsRUFBRSxJQUFzQjtRQUFyRCxZQUNFLGtCQUFNLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FHakI7UUFmTSxtQkFBYSxHQUFHLGlCQUFpQixDQUFDO1FBYXZDLHdFQUF3RTtRQUN4RSxLQUFJLENBQUMsUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7O0lBQ3JDLENBQUM7SUFaRCxzQkFDSSwyQ0FBTTs7OztRQURWO1lBRUUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLENBQUM7Ozs7O1FBQ0QsVUFBVyxNQUFjO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLENBQUM7OztPQUhBOztnQkFiRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLHFCQUFxQjtvQkFDL0IsUUFBUSxFQUFFLHFDQUVUO2lCQUNGOzs7O2dCQVBRLFlBQVk7Z0JBSFosZ0JBQWdCOzs7eUJBZXRCLEtBQUs7O0lBYVIsOEJBQUM7Q0FBQSxBQXZCRCxDQU02Qyx1QkFBdUIsR0FpQm5FO1NBakJZLHVCQUF1Qjs7O0lBQ2xDLGdEQUF5Qzs7SUFDekMsMkNBQXdCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBGZWF0dXJlQ29tcG9uZW50IH0gZnJvbSAnLi4vZmVhdHVyZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgQ2lyY2xlIH0gZnJvbSAnb2wvZ2VvbSc7XG5pbXBvcnQgeyBTaW1wbGVHZW9tZXRyeUNvbXBvbmVudCB9IGZyb20gJy4vc2ltcGxlZ2VvbWV0cnkuY29tcG9uZW50JztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtZ2VvbWV0cnktY2lyY2xlJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIEdlb21ldHJ5Q2lyY2xlQ29tcG9uZW50IGV4dGVuZHMgU2ltcGxlR2VvbWV0cnlDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQge1xuICBwdWJsaWMgY29tcG9uZW50VHlwZSA9ICdnZW9tZXRyeS1jaXJjbGUnO1xuICBwdWJsaWMgaW5zdGFuY2U6IENpcmNsZTtcblxuICBASW5wdXQoKVxuICBnZXQgcmFkaXVzKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuZ2V0UmFkaXVzKCk7XG4gIH1cbiAgc2V0IHJhZGl1cyhyYWRpdXM6IG51bWJlcikge1xuICAgIHRoaXMuaW5zdGFuY2Uuc2V0UmFkaXVzKHJhZGl1cyk7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihtYXA6IE1hcENvbXBvbmVudCwgaG9zdDogRmVhdHVyZUNvbXBvbmVudCkge1xuICAgIHN1cGVyKG1hcCwgaG9zdCk7XG4gICAgLy8gZGVmYXVsdGluZyBjb29yZGluYXRlcyB0byBbMCwwXS4gVG8gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjb21wb25lbnQuXG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBDaXJjbGUoWzAsIDBdKTtcbiAgfVxufVxuIl19