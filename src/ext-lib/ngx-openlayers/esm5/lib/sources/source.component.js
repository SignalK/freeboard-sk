/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Input } from '@angular/core';
var SourceComponent = /** @class */ (function () {
    function SourceComponent(host, raster) {
        this.host = host;
        this.raster = raster;
        this.componentType = 'source';
    }
    /**
     * @return {?}
     */
    SourceComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        if (this.host && this.host.instance) {
            this.host.instance.setSource(null);
        }
        if (this.raster) {
            this.raster.sources = [];
        }
    };
    /**
     * @protected
     * @param {?} s
     * @return {?}
     */
    SourceComponent.prototype._register = /**
     * @protected
     * @param {?} s
     * @return {?}
     */
    function (s) {
        if (this.host) {
            this.host.instance.setSource(s);
        }
        if (this.raster) {
            this.raster.sources = [s];
            this.raster.init();
        }
    };
    SourceComponent.propDecorators = {
        attributions: [{ type: Input }]
    };
    return SourceComponent;
}());
export { SourceComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3NvdXJjZXMvc291cmNlLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLEtBQUssRUFBYSxNQUFNLGVBQWUsQ0FBQztBQUtqRDtJQU9FLHlCQUFzQixJQUFvQixFQUFZLE1BQThCO1FBQTlELFNBQUksR0FBSixJQUFJLENBQWdCO1FBQVksV0FBTSxHQUFOLE1BQU0sQ0FBd0I7UUFMN0Usa0JBQWEsR0FBRyxRQUFRLENBQUM7SUFLdUQsQ0FBQzs7OztJQUV4RixxQ0FBVzs7O0lBQVg7UUFDRSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQzFCO0lBQ0gsQ0FBQzs7Ozs7O0lBRVMsbUNBQVM7Ozs7O0lBQW5CLFVBQW9CLENBQVM7UUFDM0IsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQzs7K0JBeEJBLEtBQUs7O0lBeUJSLHNCQUFDO0NBQUEsQUE3QkQsSUE2QkM7U0E3QlksZUFBZTs7O0lBQzFCLG1DQUF3Qjs7SUFDeEIsd0NBQWdDOztJQUVoQyx1Q0FDa0I7Ozs7O0lBRU4sK0JBQThCOzs7OztJQUFFLGlDQUF3QyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElucHV0LCBPbkRlc3Ryb3kgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFNvdXJjZSB9IGZyb20gJ29sJztcbmltcG9ydCB7IExheWVyQ29tcG9uZW50IH0gZnJvbSAnLi4vbGF5ZXJzL2xheWVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTb3VyY2VSYXN0ZXJDb21wb25lbnQgfSBmcm9tICcuL3Jhc3Rlci5jb21wb25lbnQnO1xuXG5leHBvcnQgY2xhc3MgU291cmNlQ29tcG9uZW50IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHVibGljIGluc3RhbmNlOiBTb3VyY2U7XG4gIHB1YmxpYyBjb21wb25lbnRUeXBlID0gJ3NvdXJjZSc7XG5cbiAgQElucHV0KClcbiAgYXR0cmlidXRpb25zOiBhbnk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGhvc3Q6IExheWVyQ29tcG9uZW50LCBwcm90ZWN0ZWQgcmFzdGVyPzogU291cmNlUmFzdGVyQ29tcG9uZW50KSB7fVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLmhvc3QgJiYgdGhpcy5ob3N0Lmluc3RhbmNlKSB7XG4gICAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0U291cmNlKG51bGwpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJhc3Rlcikge1xuICAgICAgdGhpcy5yYXN0ZXIuc291cmNlcyA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfcmVnaXN0ZXIoczogU291cmNlKSB7XG4gICAgaWYgKHRoaXMuaG9zdCkge1xuICAgICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldFNvdXJjZShzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yYXN0ZXIpIHtcbiAgICAgIHRoaXMucmFzdGVyLnNvdXJjZXMgPSBbc107XG4gICAgICB0aGlzLnJhc3Rlci5pbml0KCk7XG4gICAgfVxuICB9XG59XG4iXX0=