/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { Zoom } from 'ol/control';
import { MapComponent } from '../map.component';
var ControlZoomComponent = /** @class */ (function () {
    function ControlZoomComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-zoom');
    }
    /**
     * @return {?}
     */
    ControlZoomComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Zoom(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlZoomComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-zoom');
        this.map.instance.removeControl(this.instance);
    };
    ControlZoomComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-zoom',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlZoomComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlZoomComponent.propDecorators = {
        duration: [{ type: Input }],
        zoomInLabel: [{ type: Input }],
        zoomOutLabel: [{ type: Input }],
        zoomInTipLabel: [{ type: Input }],
        zoomOutTipLabel: [{ type: Input }],
        delta: [{ type: Input }]
    };
    return ControlZoomComponent;
}());
export { ControlZoomComponent };
if (false) {
    /** @type {?} */
    ControlZoomComponent.prototype.instance;
    /** @type {?} */
    ControlZoomComponent.prototype.duration;
    /** @type {?} */
    ControlZoomComponent.prototype.zoomInLabel;
    /** @type {?} */
    ControlZoomComponent.prototype.zoomOutLabel;
    /** @type {?} */
    ControlZoomComponent.prototype.zoomInTipLabel;
    /** @type {?} */
    ControlZoomComponent.prototype.zoomOutTipLabel;
    /** @type {?} */
    ControlZoomComponent.prototype.delta;
    /**
     * @type {?}
     * @private
     */
    ControlZoomComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9vbS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9jb250cm9scy96b29tLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQXFCLE1BQU0sZUFBZSxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRWhEO0lBc0JFLDhCQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO1FBQ25DLDhDQUE4QztJQUNoRCxDQUFDOzs7O0lBRUQsdUNBQVE7OztJQUFSO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Ozs7SUFFRCwwQ0FBVzs7O0lBQVg7UUFDRSw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDOztnQkFsQ0YsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSxrQkFBa0I7b0JBQzVCLFFBQVEsRUFBRSxxQ0FFVDtpQkFDRjs7OztnQkFQUSxZQUFZOzs7MkJBV2xCLEtBQUs7OEJBRUwsS0FBSzsrQkFFTCxLQUFLO2lDQUVMLEtBQUs7a0NBRUwsS0FBSzt3QkFFTCxLQUFLOztJQWdCUiwyQkFBQztDQUFBLEFBbkNELElBbUNDO1NBN0JZLG9CQUFvQjs7O0lBQy9CLHdDQUFlOztJQUVmLHdDQUNpQjs7SUFDakIsMkNBQzJCOztJQUMzQiw0Q0FDNEI7O0lBQzVCLDhDQUN1Qjs7SUFDdkIsK0NBQ3dCOztJQUN4QixxQ0FDYzs7Ozs7SUFFRixtQ0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgWm9vbSB9IGZyb20gJ29sL2NvbnRyb2wnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1jb250cm9sLXpvb20nLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgQ29udHJvbFpvb21Db21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIGluc3RhbmNlOiBab29tO1xuXG4gIEBJbnB1dCgpXG4gIGR1cmF0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHpvb21JbkxhYmVsOiBzdHJpbmcgfCBOb2RlO1xuICBASW5wdXQoKVxuICB6b29tT3V0TGFiZWw6IHN0cmluZyB8IE5vZGU7XG4gIEBJbnB1dCgpXG4gIHpvb21JblRpcExhYmVsOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHpvb21PdXRUaXBMYWJlbDogc3RyaW5nO1xuICBASW5wdXQoKVxuICBkZWx0YTogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnaW5zdGFuY2luZyBhb2wtY29udHJvbC16b29tJyk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IFpvb20odGhpcyk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkQ29udHJvbCh0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdyZW1vdmluZyBhb2wtY29udHJvbC16b29tJyk7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlQ29udHJvbCh0aGlzLmluc3RhbmNlKTtcbiAgfVxufVxuIl19