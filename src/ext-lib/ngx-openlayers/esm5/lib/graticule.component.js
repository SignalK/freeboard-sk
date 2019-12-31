/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { Graticule } from 'ol';
import { Stroke } from 'ol/style';
import { MapComponent } from './map.component';
var GraticuleComponent = /** @class */ (function () {
    function GraticuleComponent(map) {
        this.map = map;
        this.componentType = 'graticule';
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    GraticuleComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        if (properties) {
            this.instance = new Graticule(properties);
        }
        this.instance.setMap(this.map.instance);
    };
    /**
     * @return {?}
     */
    GraticuleComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Graticule({
            strokeStyle: this.strokeStyle,
            showLabels: this.showLabels,
            lonLabelPosition: this.lonLabelPosition,
            latLabelPosition: this.latLabelPosition,
        });
        this.instance.setMap(this.map.instance);
    };
    /**
     * @return {?}
     */
    GraticuleComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.instance.setMap(null);
    };
    GraticuleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-graticule',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    GraticuleComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    GraticuleComponent.propDecorators = {
        strokeStyle: [{ type: Input }],
        showLabels: [{ type: Input }],
        lonLabelPosition: [{ type: Input }],
        latLabelPosition: [{ type: Input }]
    };
    return GraticuleComponent;
}());
export { GraticuleComponent };
if (false) {
    /** @type {?} */
    GraticuleComponent.prototype.instance;
    /** @type {?} */
    GraticuleComponent.prototype.componentType;
    /** @type {?} */
    GraticuleComponent.prototype.strokeStyle;
    /** @type {?} */
    GraticuleComponent.prototype.showLabels;
    /** @type {?} */
    GraticuleComponent.prototype.lonLabelPosition;
    /** @type {?} */
    GraticuleComponent.prototype.latLabelPosition;
    /**
     * @type {?}
     * @private
     */
    GraticuleComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhdGljdWxlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2dyYXRpY3VsZS5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUF5RCxNQUFNLGVBQWUsQ0FBQztBQUN4RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQy9CLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRS9DO0lBaUJFLDRCQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO1FBWDlCLGtCQUFhLEdBQUcsV0FBVyxDQUFDO0lBV0ssQ0FBQzs7Ozs7SUFFekMsd0NBQVc7Ozs7SUFBWCxVQUFZLE9BQXNCOztZQUMxQixVQUFVLEdBQTZCLEVBQUU7UUFFL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbEIsT0FBTztTQUNSO1FBRUQsS0FBSyxJQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7WUFDekIsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQzthQUM3QztTQUNGO1FBRUQsSUFBSSxVQUFVLEVBQUU7WUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDOzs7O0lBRUQsK0NBQWtCOzs7SUFBbEI7UUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksU0FBUyxDQUFDO1lBQzVCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUN2QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1NBQ3hDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQzs7OztJQUVELHdDQUFXOzs7SUFBWDtRQUNFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7O2dCQWxERixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLGVBQWU7b0JBQ3pCLFFBQVEsRUFBRSwyQkFBMkI7aUJBQ3RDOzs7O2dCQUxRLFlBQVk7Ozs4QkFVbEIsS0FBSzs2QkFFTCxLQUFLO21DQUVMLEtBQUs7bUNBRUwsS0FBSzs7SUFxQ1IseUJBQUM7Q0FBQSxBQW5ERCxJQW1EQztTQS9DWSxrQkFBa0I7OztJQUM3QixzQ0FBYzs7SUFDZCwyQ0FBbUM7O0lBRW5DLHlDQUNvQjs7SUFDcEIsd0NBQ29COztJQUNwQiw4Q0FDeUI7O0lBQ3pCLDhDQUN5Qjs7Ozs7SUFFYixpQ0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBBZnRlckNvbnRlbnRJbml0LCBPbkNoYW5nZXMsIFNpbXBsZUNoYW5nZXMsIE9uRGVzdHJveSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgR3JhdGljdWxlIH0gZnJvbSAnb2wnO1xuaW1wb3J0IHsgU3Ryb2tlIH0gZnJvbSAnb2wvc3R5bGUnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi9tYXAuY29tcG9uZW50JztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLWdyYXRpY3VsZScsXG4gIHRlbXBsYXRlOiAnPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PicsXG59KVxuZXhwb3J0IGNsYXNzIEdyYXRpY3VsZUNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyQ29udGVudEluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgaW5zdGFuY2U6IGFueTtcbiAgcHVibGljIGNvbXBvbmVudFR5cGUgPSAnZ3JhdGljdWxlJztcblxuICBASW5wdXQoKVxuICBzdHJva2VTdHlsZTogU3Ryb2tlO1xuICBASW5wdXQoKVxuICBzaG93TGFiZWxzOiBib29sZWFuO1xuICBASW5wdXQoKVxuICBsb25MYWJlbFBvc2l0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIGxhdExhYmVsUG9zaXRpb246IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwQ29tcG9uZW50KSB7fVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzOiB7IFtpbmRleDogc3RyaW5nXTogYW55IH0gPSB7fTtcblxuICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qga2V5IGluIGNoYW5nZXMpIHtcbiAgICAgIGlmIChjaGFuZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcHJvcGVydGllc1trZXldID0gY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocHJvcGVydGllcykge1xuICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBHcmF0aWN1bGUocHJvcGVydGllcyk7XG4gICAgfVxuICAgIHRoaXMuaW5zdGFuY2Uuc2V0TWFwKHRoaXMubWFwLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IEdyYXRpY3VsZSh7XG4gICAgICBzdHJva2VTdHlsZTogdGhpcy5zdHJva2VTdHlsZSxcbiAgICAgIHNob3dMYWJlbHM6IHRoaXMuc2hvd0xhYmVscyxcbiAgICAgIGxvbkxhYmVsUG9zaXRpb246IHRoaXMubG9uTGFiZWxQb3NpdGlvbixcbiAgICAgIGxhdExhYmVsUG9zaXRpb246IHRoaXMubGF0TGFiZWxQb3NpdGlvbixcbiAgICB9KTtcbiAgICB0aGlzLmluc3RhbmNlLnNldE1hcCh0aGlzLm1hcC5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmluc3RhbmNlLnNldE1hcChudWxsKTtcbiAgfVxufVxuIl19