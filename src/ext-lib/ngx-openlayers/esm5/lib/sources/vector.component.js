/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import * as tslib_1 from "tslib";
import { Component, Host, Input, forwardRef } from '@angular/core';
import { Vector } from 'ol/source';
import Feature from 'ol/format/Feature';
import { LayerVectorComponent } from '../layers/layervector.component';
import { SourceComponent } from './source.component';
import { LoadingStrategy } from 'ol/source/Vector';
var SourceVectorComponent = /** @class */ (function (_super) {
    tslib_1.__extends(SourceVectorComponent, _super);
    function SourceVectorComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceVectorComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Vector(this);
        this.host.instance.setSource(this.instance);
    };
    SourceVectorComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-vector',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceVectorComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceVectorComponent.ctorParameters = function () { return [
        { type: LayerVectorComponent, decorators: [{ type: Host }] }
    ]; };
    SourceVectorComponent.propDecorators = {
        overlaps: [{ type: Input }],
        useSpatialIndex: [{ type: Input }],
        wrapX: [{ type: Input }],
        url: [{ type: Input }],
        format: [{ type: Input }],
        strategy: [{ type: Input }]
    };
    return SourceVectorComponent;
}(SourceComponent));
export { SourceVectorComponent };
if (false) {
    /** @type {?} */
    SourceVectorComponent.prototype.instance;
    /** @type {?} */
    SourceVectorComponent.prototype.overlaps;
    /** @type {?} */
    SourceVectorComponent.prototype.useSpatialIndex;
    /** @type {?} */
    SourceVectorComponent.prototype.wrapX;
    /** @type {?} */
    SourceVectorComponent.prototype.url;
    /** @type {?} */
    SourceVectorComponent.prototype.format;
    /** @type {?} */
    SourceVectorComponent.prototype.strategy;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVjdG9yLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3NvdXJjZXMvdmVjdG9yLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBVSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLE9BQU8sTUFBTSxtQkFBbUIsQ0FBQztBQUN4QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRW5EO0lBTzJDLGlEQUFlO0lBZXhELCtCQUFvQixLQUEyQjtlQUM3QyxrQkFBTSxLQUFLLENBQUM7SUFDZCxDQUFDOzs7O0lBRUQsd0NBQVE7OztJQUFSO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7O2dCQTdCRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLG1CQUFtQjtvQkFDN0IsUUFBUSxFQUFFLHFDQUVUO29CQUNELFNBQVMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsVUFBVTs7OzRCQUFDLGNBQU0sT0FBQSxxQkFBcUIsRUFBckIsQ0FBcUIsRUFBQyxFQUFFLENBQUM7aUJBQ2hHOzs7O2dCQVZRLG9CQUFvQix1QkEwQmQsSUFBSTs7OzJCQWJoQixLQUFLO2tDQUVMLEtBQUs7d0JBRUwsS0FBSztzQkFFTCxLQUFLO3lCQUVMLEtBQUs7MkJBRUwsS0FBSzs7SUFXUiw0QkFBQztDQUFBLEFBOUJELENBTzJDLGVBQWUsR0F1QnpEO1NBdkJZLHFCQUFxQjs7O0lBQ2hDLHlDQUFpQjs7SUFDakIseUNBQ2tCOztJQUNsQixnREFDeUI7O0lBQ3pCLHNDQUNlOztJQUNmLG9DQUNZOztJQUNaLHVDQUNnQjs7SUFDaEIseUNBQzBCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBIb3N0LCBJbnB1dCwgT25Jbml0LCBmb3J3YXJkUmVmIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICdvbC9zb3VyY2UnO1xuaW1wb3J0IEZlYXR1cmUgZnJvbSAnb2wvZm9ybWF0L0ZlYXR1cmUnO1xuaW1wb3J0IHsgTGF5ZXJWZWN0b3JDb21wb25lbnQgfSBmcm9tICcuLi9sYXllcnMvbGF5ZXJ2ZWN0b3IuY29tcG9uZW50JztcbmltcG9ydCB7IFNvdXJjZUNvbXBvbmVudCB9IGZyb20gJy4vc291cmNlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMb2FkaW5nU3RyYXRlZ3kgfSBmcm9tICdvbC9zb3VyY2UvVmVjdG9yJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLXNvdXJjZS12ZWN0b3InLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbiAgcHJvdmlkZXJzOiBbeyBwcm92aWRlOiBTb3VyY2VDb21wb25lbnQsIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IFNvdXJjZVZlY3RvckNvbXBvbmVudCkgfV0sXG59KVxuZXhwb3J0IGNsYXNzIFNvdXJjZVZlY3RvckNvbXBvbmVudCBleHRlbmRzIFNvdXJjZUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCB7XG4gIGluc3RhbmNlOiBWZWN0b3I7XG4gIEBJbnB1dCgpXG4gIG92ZXJsYXBzOiBib29sZWFuO1xuICBASW5wdXQoKVxuICB1c2VTcGF0aWFsSW5kZXg6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIHdyYXBYOiBib29sZWFuO1xuICBASW5wdXQoKVxuICB1cmw6IHN0cmluZztcbiAgQElucHV0KClcbiAgZm9ybWF0OiBGZWF0dXJlO1xuICBASW5wdXQoKVxuICBzdHJhdGVneTogTG9hZGluZ1N0cmF0ZWd5O1xuXG4gIGNvbnN0cnVjdG9yKEBIb3N0KCkgbGF5ZXI6IExheWVyVmVjdG9yQ29tcG9uZW50KSB7XG4gICAgc3VwZXIobGF5ZXIpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBWZWN0b3IodGhpcyk7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldFNvdXJjZSh0aGlzLmluc3RhbmNlKTtcbiAgfVxufVxuIl19