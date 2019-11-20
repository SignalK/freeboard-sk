/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { MultiLineString } from 'ol/geom';
var GeometryMultiLinestringComponent = /** @class */ (function (_super) {
    tslib_1.__extends(GeometryMultiLinestringComponent, _super);
    function GeometryMultiLinestringComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-multilinestring';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryMultiLinestringComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new MultiLineString([[[0, 0], [1, 1]]]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryMultiLinestringComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-multilinestring',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryMultiLinestringComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryMultiLinestringComponent;
}(SimpleGeometryComponent));
export { GeometryMultiLinestringComponent };
if (false) {
    /** @type {?} */
    GeometryMultiLinestringComponent.prototype.componentType;
    /** @type {?} */
    GeometryMultiLinestringComponent.prototype.instance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvbWV0cnltdWx0aWxpbmVzdHJpbmcuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvZ2VvbS9nZW9tZXRyeW11bHRpbGluZXN0cmluZy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFVLE1BQU0sZUFBZSxDQUFDO0FBQ2xELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRTFDO0lBTXNELDREQUF1QjtJQUkzRSwwQ0FBWSxHQUFpQixFQUFFLElBQXNCO1FBQXJELFlBQ0Usa0JBQU0sR0FBRyxFQUFFLElBQUksQ0FBQyxTQUNqQjtRQUxNLG1CQUFhLEdBQUcsMEJBQTBCLENBQUM7O0lBS2xELENBQUM7Ozs7SUFFRCxtREFBUTs7O0lBQVI7UUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RCxpQkFBTSxRQUFRLFdBQUUsQ0FBQztJQUNuQixDQUFDOztnQkFqQkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSw4QkFBOEI7b0JBQ3hDLFFBQVEsRUFBRSxxQ0FFVDtpQkFDRjs7OztnQkFSUSxZQUFZO2dCQUZaLGdCQUFnQjs7SUF1QnpCLHVDQUFDO0NBQUEsQUFsQkQsQ0FNc0QsdUJBQXVCLEdBWTVFO1NBWlksZ0NBQWdDOzs7SUFDM0MseURBQWtEOztJQUNsRCxvREFBaUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIE9uSW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgRmVhdHVyZUNvbXBvbmVudCB9IGZyb20gJy4uL2ZlYXR1cmUuY29tcG9uZW50JztcbmltcG9ydCB7IFNpbXBsZUdlb21ldHJ5Q29tcG9uZW50IH0gZnJvbSAnLi9zaW1wbGVnZW9tZXRyeS5jb21wb25lbnQnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBNdWx0aUxpbmVTdHJpbmcgfSBmcm9tICdvbC9nZW9tJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLWdlb21ldHJ5LW11bHRpbGluZXN0cmluZycsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBHZW9tZXRyeU11bHRpTGluZXN0cmluZ0NvbXBvbmVudCBleHRlbmRzIFNpbXBsZUdlb21ldHJ5Q29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgcHVibGljIGNvbXBvbmVudFR5cGUgPSAnZ2VvbWV0cnktbXVsdGlsaW5lc3RyaW5nJztcbiAgcHVibGljIGluc3RhbmNlOiBNdWx0aUxpbmVTdHJpbmc7XG5cbiAgY29uc3RydWN0b3IobWFwOiBNYXBDb21wb25lbnQsIGhvc3Q6IEZlYXR1cmVDb21wb25lbnQpIHtcbiAgICBzdXBlcihtYXAsIGhvc3QpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBNdWx0aUxpbmVTdHJpbmcoW1tbMCwgMF0sIFsxLCAxXV1dKTtcbiAgICBzdXBlci5uZ09uSW5pdCgpO1xuICB9XG59XG4iXX0=