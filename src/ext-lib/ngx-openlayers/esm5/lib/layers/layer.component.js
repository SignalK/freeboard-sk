/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Input } from '@angular/core';
import { Extent } from 'ol/extent';
/**
 * @abstract
 */
var LayerComponent = /** @class */ (function () {
    function LayerComponent(host) {
        this.host = host;
        this.componentType = 'layer';
    }
    /**
     * @return {?}
     */
    LayerComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        if (this.precompose !== null && this.precompose !== undefined) {
            this.instance.on('precompose', this.precompose);
        }
        if (this.postcompose !== null && this.postcompose !== undefined) {
            this.instance.on('postcompose', this.postcompose);
        }
        this.host.instance.getLayers().push(this.instance);
    };
    /**
     * @return {?}
     */
    LayerComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.host.instance.getLayers().remove(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerComponent.prototype.ngOnChanges = /**
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
                if (key === 'precompose') {
                    this.instance.un('precompose', changes[key].previousValue);
                    this.instance.on('precompose', changes[key].currentValue);
                }
                if (key === 'postcompose') {
                    this.instance.un('postcompose', changes[key].previousValue);
                    this.instance.on('postcompose', changes[key].currentValue);
                }
            }
        }
        // console.log('changes detected in aol-layer, setting new properties: ', properties);
        this.instance.setProperties(properties, false);
    };
    LayerComponent.propDecorators = {
        opacity: [{ type: Input }],
        visible: [{ type: Input }],
        extent: [{ type: Input }],
        zIndex: [{ type: Input }],
        minResolution: [{ type: Input }],
        maxResolution: [{ type: Input }],
        precompose: [{ type: Input }],
        postcompose: [{ type: Input }]
    };
    return LayerComponent;
}());
export { LayerComponent };
if (false) {
    /** @type {?} */
    LayerComponent.prototype.instance;
    /** @type {?} */
    LayerComponent.prototype.componentType;
    /** @type {?} */
    LayerComponent.prototype.opacity;
    /** @type {?} */
    LayerComponent.prototype.visible;
    /** @type {?} */
    LayerComponent.prototype.extent;
    /** @type {?} */
    LayerComponent.prototype.zIndex;
    /** @type {?} */
    LayerComponent.prototype.minResolution;
    /** @type {?} */
    LayerComponent.prototype.maxResolution;
    /** @type {?} */
    LayerComponent.prototype.precompose;
    /** @type {?} */
    LayerComponent.prototype.postcompose;
    /**
     * @type {?}
     * @protected
     */
    LayerComponent.prototype.host;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5ZXIuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvbGF5ZXJzL2xheWVyLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFnQyxLQUFLLEVBQWlCLE1BQU0sZUFBZSxDQUFDO0FBSW5GLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxXQUFXLENBQUM7Ozs7QUFFbkM7SUFzQkUsd0JBQXNCLElBQXdDO1FBQXhDLFNBQUksR0FBSixJQUFJLENBQW9DO1FBcEJ2RCxrQkFBYSxHQUFHLE9BQU8sQ0FBQztJQW9Ca0MsQ0FBQzs7OztJQUVsRSxpQ0FBUTs7O0lBQVI7UUFDRSxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQzdELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDakQ7UUFDRCxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFO1lBQy9ELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDbkQ7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELENBQUM7Ozs7SUFFRCxvQ0FBVzs7O0lBQVg7UUFDRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7Ozs7O0lBRUQsb0NBQVc7Ozs7SUFBWCxVQUFZLE9BQXNCOztZQUMxQixVQUFVLEdBQTZCLEVBQUU7UUFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbEIsT0FBTztTQUNSO1FBQ0QsS0FBSyxJQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7WUFDekIsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQztnQkFDNUMsSUFBSSxHQUFHLEtBQUssWUFBWSxFQUFFO29CQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUMzRCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUMzRDtnQkFDRCxJQUFJLEdBQUcsS0FBSyxhQUFhLEVBQUU7b0JBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQzVELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7aUJBQzVEO2FBQ0Y7U0FDRjtRQUNELHNGQUFzRjtRQUN0RixJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQzs7MEJBdERBLEtBQUs7MEJBRUwsS0FBSzt5QkFFTCxLQUFLO3lCQUVMLEtBQUs7Z0NBRUwsS0FBSztnQ0FFTCxLQUFLOzZCQUdMLEtBQUs7OEJBRUwsS0FBSzs7SUF3Q1IscUJBQUM7Q0FBQSxBQTNERCxJQTJEQztTQTNEcUIsY0FBYzs7O0lBQ2xDLGtDQUFxQjs7SUFDckIsdUNBQStCOztJQUUvQixpQ0FDZ0I7O0lBQ2hCLGlDQUNpQjs7SUFDakIsZ0NBQ2U7O0lBQ2YsZ0NBQ2U7O0lBQ2YsdUNBQ3NCOztJQUN0Qix1Q0FDc0I7O0lBRXRCLG9DQUNpQzs7SUFDakMscUNBQ2tDOzs7OztJQUV0Qiw4QkFBa0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPbkRlc3Ryb3ksIE9uSW5pdCwgT25DaGFuZ2VzLCBJbnB1dCwgU2ltcGxlQ2hhbmdlcyB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgRXZlbnQgfSBmcm9tICdvbC9ldmVudHMnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMYXllckdyb3VwQ29tcG9uZW50IH0gZnJvbSAnLi9sYXllcmdyb3VwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBFeHRlbnQgfSBmcm9tICdvbC9leHRlbnQnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGF5ZXJDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgcHVibGljIGluc3RhbmNlOiBhbnk7XG4gIHB1YmxpYyBjb21wb25lbnRUeXBlID0gJ2xheWVyJztcblxuICBASW5wdXQoKVxuICBvcGFjaXR5OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHZpc2libGU6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGV4dGVudDogRXh0ZW50O1xuICBASW5wdXQoKVxuICB6SW5kZXg6IG51bWJlcjtcbiAgQElucHV0KClcbiAgbWluUmVzb2x1dGlvbjogbnVtYmVyO1xuICBASW5wdXQoKVxuICBtYXhSZXNvbHV0aW9uOiBudW1iZXI7XG5cbiAgQElucHV0KClcbiAgcHJlY29tcG9zZTogKGV2dDogRXZlbnQpID0+IHZvaWQ7XG4gIEBJbnB1dCgpXG4gIHBvc3Rjb21wb3NlOiAoZXZ0OiBFdmVudCkgPT4gdm9pZDtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgaG9zdDogTWFwQ29tcG9uZW50IHwgTGF5ZXJHcm91cENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICBpZiAodGhpcy5wcmVjb21wb3NlICE9PSBudWxsICYmIHRoaXMucHJlY29tcG9zZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmluc3RhbmNlLm9uKCdwcmVjb21wb3NlJywgdGhpcy5wcmVjb21wb3NlKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucG9zdGNvbXBvc2UgIT09IG51bGwgJiYgdGhpcy5wb3N0Y29tcG9zZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmluc3RhbmNlLm9uKCdwb3N0Y29tcG9zZScsIHRoaXMucG9zdGNvbXBvc2UpO1xuICAgIH1cbiAgICB0aGlzLmhvc3QuaW5zdGFuY2UuZ2V0TGF5ZXJzKCkucHVzaCh0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5nZXRMYXllcnMoKS5yZW1vdmUodGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgY29uc3QgcHJvcGVydGllczogeyBbaW5kZXg6IHN0cmluZ106IGFueSB9ID0ge307XG4gICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IGluIGNoYW5nZXMpIHtcbiAgICAgIGlmIChjaGFuZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcHJvcGVydGllc1trZXldID0gY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZTtcbiAgICAgICAgaWYgKGtleSA9PT0gJ3ByZWNvbXBvc2UnKSB7XG4gICAgICAgICAgdGhpcy5pbnN0YW5jZS51bigncHJlY29tcG9zZScsIGNoYW5nZXNba2V5XS5wcmV2aW91c1ZhbHVlKTtcbiAgICAgICAgICB0aGlzLmluc3RhbmNlLm9uKCdwcmVjb21wb3NlJywgY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGtleSA9PT0gJ3Bvc3Rjb21wb3NlJykge1xuICAgICAgICAgIHRoaXMuaW5zdGFuY2UudW4oJ3Bvc3Rjb21wb3NlJywgY2hhbmdlc1trZXldLnByZXZpb3VzVmFsdWUpO1xuICAgICAgICAgIHRoaXMuaW5zdGFuY2Uub24oJ3Bvc3Rjb21wb3NlJywgY2hhbmdlc1trZXldLmN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coJ2NoYW5nZXMgZGV0ZWN0ZWQgaW4gYW9sLWxheWVyLCBzZXR0aW5nIG5ldyBwcm9wZXJ0aWVzOiAnLCBwcm9wZXJ0aWVzKTtcbiAgICB0aGlzLmluc3RhbmNlLnNldFByb3BlcnRpZXMocHJvcGVydGllcywgZmFsc2UpO1xuICB9XG59XG4iXX0=