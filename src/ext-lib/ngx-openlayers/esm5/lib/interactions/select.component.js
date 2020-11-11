/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MapComponent } from '../map.component';
import { Select } from 'ol/interaction';
import { Collection } from 'ol';
import { FilterFunction } from 'ol/interaction/Select';
import { Condition } from 'ol/events/condition';
var SelectInteractionComponent = /** @class */ (function () {
    function SelectInteractionComponent(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onSelect = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
    }
    /**
     * @return {?}
     */
    SelectInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Select(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChange.emit(event); }));
        this.instance.on('select', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onSelect.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    SelectInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    SelectInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-select',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    SelectInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    SelectInteractionComponent.propDecorators = {
        addCondition: [{ type: Input }],
        condition: [{ type: Input }],
        layers: [{ type: Input }],
        style: [{ type: Input }],
        removeCondition: [{ type: Input }],
        toggleCondition: [{ type: Input }],
        multi: [{ type: Input }],
        features: [{ type: Input }],
        filter: [{ type: Input }],
        wrapX: [{ type: Input }],
        onChange: [{ type: Output }],
        onSelect: [{ type: Output }],
        onPropertyChange: [{ type: Output }]
    };
    return SelectInteractionComponent;
}());
export { SelectInteractionComponent };
if (false) {
    /** @type {?} */
    SelectInteractionComponent.prototype.instance;
    /** @type {?} */
    SelectInteractionComponent.prototype.addCondition;
    /** @type {?} */
    SelectInteractionComponent.prototype.condition;
    /** @type {?} */
    SelectInteractionComponent.prototype.layers;
    /** @type {?} */
    SelectInteractionComponent.prototype.style;
    /** @type {?} */
    SelectInteractionComponent.prototype.removeCondition;
    /** @type {?} */
    SelectInteractionComponent.prototype.toggleCondition;
    /** @type {?} */
    SelectInteractionComponent.prototype.multi;
    /** @type {?} */
    SelectInteractionComponent.prototype.features;
    /** @type {?} */
    SelectInteractionComponent.prototype.filter;
    /** @type {?} */
    SelectInteractionComponent.prototype.wrapX;
    /** @type {?} */
    SelectInteractionComponent.prototype.onChange;
    /** @type {?} */
    SelectInteractionComponent.prototype.onSelect;
    /** @type {?} */
    SelectInteractionComponent.prototype.onPropertyChange;
    /**
     * @type {?}
     * @private
     */
    SelectInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2ludGVyYWN0aW9ucy9zZWxlY3QuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFxQixLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDaEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR3hDLE9BQU8sRUFBRSxVQUFVLEVBQVcsTUFBTSxJQUFJLENBQUM7QUFDekMsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXBFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVoRDtJQW1DRSxvQ0FBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztRQU5yQyxhQUFRLEdBQUcsSUFBSSxZQUFZLEVBQWUsQ0FBQztRQUUzQyxhQUFRLEdBQUcsSUFBSSxZQUFZLEVBQWUsQ0FBQztRQUUzQyxxQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBZSxDQUFDO0lBRVgsQ0FBQzs7OztJQUV6Qyw2Q0FBUTs7O0lBQVI7UUFBQSxpQkFRQztRQVBDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUTs7OztRQUFFLFVBQUMsS0FBa0IsSUFBSyxPQUFBLEtBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUF6QixDQUF5QixFQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUTs7OztRQUFFLFVBQUMsS0FBa0IsSUFBSyxPQUFBLEtBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUF6QixDQUF5QixFQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCOzs7O1FBQUUsVUFBQyxLQUFrQixJQUFLLE9BQUEsS0FBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBakMsQ0FBaUMsRUFBQyxDQUFDO1FBRTlGLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQzs7OztJQUVELGdEQUFXOzs7SUFBWDtRQUNFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDOztnQkFqREYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSx3QkFBd0I7b0JBQ2xDLFFBQVEsRUFBRSxFQUFFO2lCQUNiOzs7O2dCQVpRLFlBQVk7OzsrQkFnQmxCLEtBQUs7NEJBRUwsS0FBSzt5QkFFTCxLQUFLO3dCQUVMLEtBQUs7a0NBRUwsS0FBSztrQ0FFTCxLQUFLO3dCQUVMLEtBQUs7MkJBRUwsS0FBSzt5QkFFTCxLQUFLO3dCQUVMLEtBQUs7MkJBR0wsTUFBTTsyQkFFTixNQUFNO21DQUVOLE1BQU07O0lBa0JULGlDQUFDO0NBQUEsQUFsREQsSUFrREM7U0E5Q1ksMEJBQTBCOzs7SUFDckMsOENBQWlCOztJQUVqQixrREFDeUI7O0lBQ3pCLCtDQUNzQjs7SUFDdEIsNENBQytDOztJQUMvQywyQ0FDd0M7O0lBQ3hDLHFEQUM0Qjs7SUFDNUIscURBQzRCOztJQUM1QiwyQ0FDZ0I7O0lBQ2hCLDhDQUMrQjs7SUFDL0IsNENBQ3dCOztJQUN4QiwyQ0FDZ0I7O0lBRWhCLDhDQUMyQzs7SUFDM0MsOENBQzJDOztJQUMzQyxzREFDbUQ7Ozs7O0lBRXZDLHlDQUF5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgT25EZXN0cm95LCBPbkluaXQsIElucHV0LCBPdXRwdXQsIEV2ZW50RW1pdHRlciB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTZWxlY3QgfSBmcm9tICdvbC9pbnRlcmFjdGlvbic7XG5pbXBvcnQgeyBMYXllciB9IGZyb20gJ29sL2xheWVyJztcbmltcG9ydCB7IFN0eWxlIH0gZnJvbSAnb2wvc3R5bGUnO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiwgRmVhdHVyZSB9IGZyb20gJ29sJztcbmltcG9ydCB7IFNlbGVjdEV2ZW50LCBGaWx0ZXJGdW5jdGlvbiB9IGZyb20gJ29sL2ludGVyYWN0aW9uL1NlbGVjdCc7XG5pbXBvcnQgeyBTdHlsZUZ1bmN0aW9uIH0gZnJvbSAnb2wvc3R5bGUvU3R5bGUnO1xuaW1wb3J0IHsgQ29uZGl0aW9uIH0gZnJvbSAnb2wvZXZlbnRzL2NvbmRpdGlvbic7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1pbnRlcmFjdGlvbi1zZWxlY3QnLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIFNlbGVjdEludGVyYWN0aW9uQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBpbnN0YW5jZTogU2VsZWN0O1xuXG4gIEBJbnB1dCgpXG4gIGFkZENvbmRpdGlvbj86IENvbmRpdGlvbjtcbiAgQElucHV0KClcbiAgY29uZGl0aW9uPzogQ29uZGl0aW9uO1xuICBASW5wdXQoKVxuICBsYXllcnM/OiBMYXllcltdIHwgKChsYXllcjogTGF5ZXIpID0+IGJvb2xlYW4pO1xuICBASW5wdXQoKVxuICBzdHlsZT86IFN0eWxlIHwgU3R5bGVbXSB8IFN0eWxlRnVuY3Rpb247XG4gIEBJbnB1dCgpXG4gIHJlbW92ZUNvbmRpdGlvbj86IENvbmRpdGlvbjtcbiAgQElucHV0KClcbiAgdG9nZ2xlQ29uZGl0aW9uPzogQ29uZGl0aW9uO1xuICBASW5wdXQoKVxuICBtdWx0aT86IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGZlYXR1cmVzPzogQ29sbGVjdGlvbjxGZWF0dXJlPjtcbiAgQElucHV0KClcbiAgZmlsdGVyPzogRmlsdGVyRnVuY3Rpb247XG4gIEBJbnB1dCgpXG4gIHdyYXBYPzogYm9vbGVhbjtcblxuICBAT3V0cHV0KClcbiAgb25DaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFNlbGVjdEV2ZW50PigpO1xuICBAT3V0cHV0KClcbiAgb25TZWxlY3QgPSBuZXcgRXZlbnRFbWl0dGVyPFNlbGVjdEV2ZW50PigpO1xuICBAT3V0cHV0KClcbiAgb25Qcm9wZXJ0eUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8U2VsZWN0RXZlbnQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IFNlbGVjdCh0aGlzKTtcblxuICAgIHRoaXMuaW5zdGFuY2Uub24oJ2NoYW5nZScsIChldmVudDogU2VsZWN0RXZlbnQpID0+IHRoaXMub25DaGFuZ2UuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ3NlbGVjdCcsIChldmVudDogU2VsZWN0RXZlbnQpID0+IHRoaXMub25TZWxlY3QuZW1pdChldmVudCkpO1xuICAgIHRoaXMuaW5zdGFuY2Uub24oJ3Byb3BlcnR5Y2hhbmdlJywgKGV2ZW50OiBTZWxlY3RFdmVudCkgPT4gdGhpcy5vblByb3BlcnR5Q2hhbmdlLmVtaXQoZXZlbnQpKTtcblxuICAgIHRoaXMubWFwLmluc3RhbmNlLmFkZEludGVyYWN0aW9uKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==