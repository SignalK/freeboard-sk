/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, forwardRef, Input } from '@angular/core';
import { FormatComponent } from './format.component';
import { MVT } from 'ol/format';
var FormatMVTComponent = /** @class */ (function (_super) {
    tslib_1.__extends(FormatMVTComponent, _super);
    function FormatMVTComponent() {
        var _this = _super.call(this) || this;
        _this.instance = new MVT(_this);
        return _this;
    }
    FormatMVTComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-format-mvt',
                    template: '',
                    providers: [{ provide: FormatComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return FormatMVTComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    FormatMVTComponent.ctorParameters = function () { return []; };
    FormatMVTComponent.propDecorators = {
        featureClass: [{ type: Input }],
        geometryName: [{ type: Input }],
        layerName: [{ type: Input }],
        layers: [{ type: Input }]
    };
    return FormatMVTComponent;
}(FormatComponent));
export { FormatMVTComponent };
if (false) {
    /** @type {?} */
    FormatMVTComponent.prototype.instance;
    /** @type {?} */
    FormatMVTComponent.prototype.featureClass;
    /** @type {?} */
    FormatMVTComponent.prototype.geometryName;
    /** @type {?} */
    FormatMVTComponent.prototype.layerName;
    /** @type {?} */
    FormatMVTComponent.prototype.layers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXZ0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2Zvcm1hdHMvbXZ0LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUloQztJQUt3Qyw4Q0FBZTtJQWNyRDtRQUFBLFlBQ0UsaUJBQU8sU0FFUjtRQURDLEtBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSSxDQUFDLENBQUM7O0lBQ2hDLENBQUM7O2dCQXRCRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLGdCQUFnQjtvQkFDMUIsUUFBUSxFQUFFLEVBQUU7b0JBQ1osU0FBUyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxVQUFVOzs7NEJBQUMsY0FBTSxPQUFBLGtCQUFrQixFQUFsQixDQUFrQixFQUFDLEVBQUUsQ0FBQztpQkFDN0Y7Ozs7OytCQUlFLEtBQUs7K0JBSUwsS0FBSzs0QkFFTCxLQUFLO3lCQUVMLEtBQUs7O0lBT1IseUJBQUM7Q0FBQSxBQXZCRCxDQUt3QyxlQUFlLEdBa0J0RDtTQWxCWSxrQkFBa0I7OztJQUM3QixzQ0FBYzs7SUFFZCwwQ0FHMkc7O0lBQzNHLDBDQUNxQjs7SUFDckIsdUNBQ2tCOztJQUNsQixvQ0FDaUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIGZvcndhcmRSZWYsIElucHV0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBGb3JtYXRDb21wb25lbnQgfSBmcm9tICcuL2Zvcm1hdC5jb21wb25lbnQnO1xuaW1wb3J0IHsgTVZUIH0gZnJvbSAnb2wvZm9ybWF0JztcbmltcG9ydCB7IEdlb21ldHJ5IH0gZnJvbSAnb2wvZ2VvbSc7XG5pbXBvcnQgR2VvbWV0cnlUeXBlIGZyb20gJ29sL2dlb20vR2VvbWV0cnlUeXBlJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLWZvcm1hdC1tdnQnLFxuICB0ZW1wbGF0ZTogJycsXG4gIHByb3ZpZGVyczogW3sgcHJvdmlkZTogRm9ybWF0Q29tcG9uZW50LCB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBGb3JtYXRNVlRDb21wb25lbnQpIH1dLFxufSlcbmV4cG9ydCBjbGFzcyBGb3JtYXRNVlRDb21wb25lbnQgZXh0ZW5kcyBGb3JtYXRDb21wb25lbnQge1xuICBpbnN0YW5jZTogTVZUO1xuXG4gIEBJbnB1dCgpXG4gIGZlYXR1cmVDbGFzczpcbiAgICB8ICgoZ2VvbTogR2VvbWV0cnkgfCB7IFtrOiBzdHJpbmddOiBhbnkgfSkgPT4gYW55KVxuICAgIHwgKChnZW9tOiBHZW9tZXRyeVR5cGUsIGFyZzI6IG51bWJlcltdLCBhcmczOiBudW1iZXJbXSB8IG51bWJlcltdW10sIGFyZzQ6IHsgW2s6IHN0cmluZ106IGFueSB9KSA9PiBhbnkpO1xuICBASW5wdXQoKVxuICBnZW9tZXRyeU5hbWU6IHN0cmluZztcbiAgQElucHV0KClcbiAgbGF5ZXJOYW1lOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGxheWVyczogc3RyaW5nW107XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IE1WVCh0aGlzKTtcbiAgfVxufVxuIl19