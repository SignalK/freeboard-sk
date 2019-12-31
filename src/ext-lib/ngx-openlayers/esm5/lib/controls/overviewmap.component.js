/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { View } from 'ol';
import { OverviewMap } from 'ol/control';
import { MapComponent } from '../map.component';
var ControlOverviewMapComponent = /** @class */ (function () {
    function ControlOverviewMapComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeControl(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance != null && changes.hasOwnProperty('view')) {
            this.reloadInstance();
        }
    };
    /**
     * @private
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.reloadInstance = /**
     * @private
     * @return {?}
     */
    function () {
        this.map.instance.removeControl(this.instance);
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    };
    ControlOverviewMapComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-overviewmap',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlOverviewMapComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlOverviewMapComponent.propDecorators = {
        collapsed: [{ type: Input }],
        collapseLabel: [{ type: Input }],
        collapsible: [{ type: Input }],
        label: [{ type: Input }],
        layers: [{ type: Input }],
        target: [{ type: Input }],
        tipLabel: [{ type: Input }],
        view: [{ type: Input }]
    };
    return ControlOverviewMapComponent;
}());
export { ControlOverviewMapComponent };
if (false) {
    /** @type {?} */
    ControlOverviewMapComponent.prototype.instance;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.collapsed;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.collapseLabel;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.collapsible;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.label;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.layers;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.target;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.tipLabel;
    /** @type {?} */
    ControlOverviewMapComponent.prototype.view;
    /**
     * @type {?}
     * @private
     */
    ControlOverviewMapComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdtYXAuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvY29udHJvbHMvb3ZlcnZpZXdtYXAuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBK0MsTUFBTSxlQUFlLENBQUM7QUFFOUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLElBQUksQ0FBQztBQUMxQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVoRDtJQXlCRSxxQ0FBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztJQUFHLENBQUM7Ozs7SUFFekMsOENBQVE7OztJQUFSO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Ozs7SUFFRCxpREFBVzs7O0lBQVg7UUFDRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Ozs7O0lBRUQsaURBQVc7Ozs7SUFBWCxVQUFZLE9BQXNCO1FBQ2hDLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMzRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDdkI7SUFDSCxDQUFDOzs7OztJQUVPLG9EQUFjOzs7O0lBQXRCO1FBQ0UsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQzs7Z0JBOUNGLFNBQVMsU0FBQztvQkFDVCxRQUFRLEVBQUUseUJBQXlCO29CQUNuQyxRQUFRLEVBQUUscUNBRVQ7aUJBQ0Y7Ozs7Z0JBUFEsWUFBWTs7OzRCQVVsQixLQUFLO2dDQUVMLEtBQUs7OEJBRUwsS0FBSzt3QkFFTCxLQUFLO3lCQUVMLEtBQUs7eUJBRUwsS0FBSzsyQkFFTCxLQUFLO3VCQUVMLEtBQUs7O0lBeUJSLGtDQUFDO0NBQUEsQUEvQ0QsSUErQ0M7U0F6Q1ksMkJBQTJCOzs7SUFDdEMsK0NBQXNCOztJQUN0QixnREFDbUI7O0lBQ25CLG9EQUNzQjs7SUFDdEIsa0RBQ3FCOztJQUNyQiw0Q0FDYzs7SUFDZCw2Q0FDZ0I7O0lBQ2hCLDZDQUNnQjs7SUFDaEIsK0NBQ2lCOztJQUNqQiwyQ0FDVzs7Ozs7SUFFQywwQ0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT25DaGFuZ2VzLCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBMYXllciB9IGZyb20gJ29sL2xheWVyJztcbmltcG9ydCB7IFZpZXcgfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBPdmVydmlld01hcCB9IGZyb20gJ29sL2NvbnRyb2wnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1jb250cm9sLW92ZXJ2aWV3bWFwJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIENvbnRyb2xPdmVydmlld01hcENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3kge1xuICBpbnN0YW5jZTogT3ZlcnZpZXdNYXA7XG4gIEBJbnB1dCgpXG4gIGNvbGxhcHNlZDogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgY29sbGFwc2VMYWJlbDogc3RyaW5nO1xuICBASW5wdXQoKVxuICBjb2xsYXBzaWJsZTogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgbGFiZWw6IHN0cmluZztcbiAgQElucHV0KClcbiAgbGF5ZXJzOiBMYXllcltdO1xuICBASW5wdXQoKVxuICB0YXJnZXQ6IEVsZW1lbnQ7XG4gIEBJbnB1dCgpXG4gIHRpcExhYmVsOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHZpZXc6IFZpZXc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IE92ZXJ2aWV3TWFwKHRoaXMpO1xuICAgIHRoaXMubWFwLmluc3RhbmNlLmFkZENvbnRyb2wodGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVDb250cm9sKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmICh0aGlzLmluc3RhbmNlICE9IG51bGwgJiYgY2hhbmdlcy5oYXNPd25Qcm9wZXJ0eSgndmlldycpKSB7XG4gICAgICB0aGlzLnJlbG9hZEluc3RhbmNlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWxvYWRJbnN0YW5jZSgpIHtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVDb250cm9sKHRoaXMuaW5zdGFuY2UpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgT3ZlcnZpZXdNYXAodGhpcyk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkQ29udHJvbCh0aGlzLmluc3RhbmNlKTtcbiAgfVxufVxuIl19