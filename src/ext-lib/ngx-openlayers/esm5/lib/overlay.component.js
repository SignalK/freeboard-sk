/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, ContentChild, Input } from '@angular/core';
import { MapComponent } from './map.component';
import { Overlay, PanOptions } from 'ol';
import { ContentComponent } from './content.component';
var OverlayComponent = /** @class */ (function () {
    function OverlayComponent(map) {
        this.map = map;
        this.componentType = 'overlay';
    }
    /**
     * @return {?}
     */
    OverlayComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        if (this.content) {
            this.element = this.content.elementRef.nativeElement;
            this.instance = new Overlay(this);
            this.map.instance.addOverlay(this.instance);
        }
    };
    /**
     * @return {?}
     */
    OverlayComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        if (this.instance) {
            this.map.instance.removeOverlay(this.instance);
        }
    };
    OverlayComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-overlay',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    OverlayComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    OverlayComponent.propDecorators = {
        content: [{ type: ContentChild, args: [ContentComponent,] }],
        id: [{ type: Input }],
        offset: [{ type: Input }],
        positioning: [{ type: Input }],
        stopEvent: [{ type: Input }],
        insertFirst: [{ type: Input }],
        autoPan: [{ type: Input }],
        autoPanAnimation: [{ type: Input }],
        autoPanMargin: [{ type: Input }]
    };
    return OverlayComponent;
}());
export { OverlayComponent };
if (false) {
    /** @type {?} */
    OverlayComponent.prototype.componentType;
    /** @type {?} */
    OverlayComponent.prototype.instance;
    /** @type {?} */
    OverlayComponent.prototype.element;
    /** @type {?} */
    OverlayComponent.prototype.content;
    /** @type {?} */
    OverlayComponent.prototype.id;
    /** @type {?} */
    OverlayComponent.prototype.offset;
    /** @type {?} */
    OverlayComponent.prototype.positioning;
    /** @type {?} */
    OverlayComponent.prototype.stopEvent;
    /** @type {?} */
    OverlayComponent.prototype.insertFirst;
    /** @type {?} */
    OverlayComponent.prototype.autoPan;
    /** @type {?} */
    OverlayComponent.prototype.autoPanAnimation;
    /** @type {?} */
    OverlayComponent.prototype.autoPanMargin;
    /**
     * @type {?}
     * @private
     */
    OverlayComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9vdmVybGF5LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFxQixNQUFNLGVBQWUsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHdkQ7SUE0QkUsMEJBQW9CLEdBQWlCO1FBQWpCLFFBQUcsR0FBSCxHQUFHLENBQWM7UUF2QnJDLGtCQUFhLEdBQUcsU0FBUyxDQUFDO0lBdUJjLENBQUM7Ozs7SUFFekMsbUNBQVE7OztJQUFSO1FBQ0UsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ3JELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM3QztJQUNILENBQUM7Ozs7SUFFRCxzQ0FBVzs7O0lBQVg7UUFDRSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUM7O2dCQTFDRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLGFBQWE7b0JBQ3ZCLFFBQVEsRUFBRSwyQkFBMkI7aUJBQ3RDOzs7O2dCQVJRLFlBQVk7OzswQkFhbEIsWUFBWSxTQUFDLGdCQUFnQjtxQkFHN0IsS0FBSzt5QkFFTCxLQUFLOzhCQUVMLEtBQUs7NEJBRUwsS0FBSzs4QkFFTCxLQUFLOzBCQUVMLEtBQUs7bUNBRUwsS0FBSztnQ0FFTCxLQUFLOztJQWtCUix1QkFBQztDQUFBLEFBM0NELElBMkNDO1NBdkNZLGdCQUFnQjs7O0lBQzNCLHlDQUEwQjs7SUFDMUIsb0NBQWtCOztJQUNsQixtQ0FBaUI7O0lBQ2pCLG1DQUMwQjs7SUFFMUIsOEJBQ29COztJQUNwQixrQ0FDaUI7O0lBQ2pCLHVDQUN5Qzs7SUFDekMscUNBQ21COztJQUNuQix1Q0FDcUI7O0lBQ3JCLG1DQUNpQjs7SUFDakIsNENBQzZCOztJQUM3Qix5Q0FDc0I7Ozs7O0lBRVYsK0JBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBDb250ZW50Q2hpbGQsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi9tYXAuY29tcG9uZW50JztcbmltcG9ydCB7IE92ZXJsYXksIFBhbk9wdGlvbnMgfSBmcm9tICdvbCc7XG5pbXBvcnQgeyBDb250ZW50Q29tcG9uZW50IH0gZnJvbSAnLi9jb250ZW50LmNvbXBvbmVudCc7XG5pbXBvcnQgT3ZlcmxheVBvc2l0aW9uaW5nIGZyb20gJ29sL092ZXJsYXlQb3NpdGlvbmluZyc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1vdmVybGF5JyxcbiAgdGVtcGxhdGU6ICc8bmctY29udGVudD48L25nLWNvbnRlbnQ+Jyxcbn0pXG5leHBvcnQgY2xhc3MgT3ZlcmxheUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25EZXN0cm95IHtcbiAgY29tcG9uZW50VHlwZSA9ICdvdmVybGF5JztcbiAgaW5zdGFuY2U6IE92ZXJsYXk7XG4gIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gIEBDb250ZW50Q2hpbGQoQ29udGVudENvbXBvbmVudClcbiAgY29udGVudDogQ29udGVudENvbXBvbmVudDtcblxuICBASW5wdXQoKVxuICBpZDogbnVtYmVyIHwgc3RyaW5nO1xuICBASW5wdXQoKVxuICBvZmZzZXQ6IG51bWJlcltdO1xuICBASW5wdXQoKVxuICBwb3NpdGlvbmluZzogT3ZlcmxheVBvc2l0aW9uaW5nIHwgc3RyaW5nO1xuICBASW5wdXQoKVxuICBzdG9wRXZlbnQ6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGluc2VydEZpcnN0OiBib29sZWFuO1xuICBASW5wdXQoKVxuICBhdXRvUGFuOiBib29sZWFuO1xuICBASW5wdXQoKVxuICBhdXRvUGFuQW5pbWF0aW9uOiBQYW5PcHRpb25zO1xuICBASW5wdXQoKVxuICBhdXRvUGFuTWFyZ2luOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICBpZiAodGhpcy5jb250ZW50KSB7XG4gICAgICB0aGlzLmVsZW1lbnQgPSB0aGlzLmNvbnRlbnQuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xuICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBPdmVybGF5KHRoaXMpO1xuICAgICAgdGhpcy5tYXAuaW5zdGFuY2UuYWRkT3ZlcmxheSh0aGlzLmluc3RhbmNlKTtcbiAgICB9XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5pbnN0YW5jZSkge1xuICAgICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlT3ZlcmxheSh0aGlzLmluc3RhbmNlKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==