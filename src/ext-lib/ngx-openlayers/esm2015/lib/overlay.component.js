/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, ContentChild, Input } from '@angular/core';
import { MapComponent } from './map.component';
import { Overlay, PanOptions } from 'ol';
import { ContentComponent } from './content.component';
export class OverlayComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.componentType = 'overlay';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        if (this.content) {
            this.element = this.content.elementRef.nativeElement;
            this.instance = new Overlay(this);
            this.map.instance.addOverlay(this.instance);
        }
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this.instance) {
            this.map.instance.removeOverlay(this.instance);
        }
    }
}
OverlayComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-overlay',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
OverlayComponent.ctorParameters = () => [
    { type: MapComponent }
];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9vdmVybGF5LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFxQixNQUFNLGVBQWUsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFPdkQsTUFBTSxPQUFPLGdCQUFnQjs7OztJQXdCM0IsWUFBb0IsR0FBaUI7UUFBakIsUUFBRyxHQUFILEdBQUcsQ0FBYztRQXZCckMsa0JBQWEsR0FBRyxTQUFTLENBQUM7SUF1QmMsQ0FBQzs7OztJQUV6QyxRQUFRO1FBQ04sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ3JELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM3QztJQUNILENBQUM7Ozs7SUFFRCxXQUFXO1FBQ1QsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDaEQ7SUFDSCxDQUFDOzs7WUExQ0YsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxhQUFhO2dCQUN2QixRQUFRLEVBQUUsMkJBQTJCO2FBQ3RDOzs7O1lBUlEsWUFBWTs7O3NCQWFsQixZQUFZLFNBQUMsZ0JBQWdCO2lCQUc3QixLQUFLO3FCQUVMLEtBQUs7MEJBRUwsS0FBSzt3QkFFTCxLQUFLOzBCQUVMLEtBQUs7c0JBRUwsS0FBSzsrQkFFTCxLQUFLOzRCQUVMLEtBQUs7Ozs7SUFwQk4seUNBQTBCOztJQUMxQixvQ0FBa0I7O0lBQ2xCLG1DQUFpQjs7SUFDakIsbUNBQzBCOztJQUUxQiw4QkFDb0I7O0lBQ3BCLGtDQUNpQjs7SUFDakIsdUNBQ3lDOztJQUN6QyxxQ0FDbUI7O0lBQ25CLHVDQUNxQjs7SUFDckIsbUNBQ2lCOztJQUNqQiw0Q0FDNkI7O0lBQzdCLHlDQUNzQjs7Ozs7SUFFViwrQkFBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIENvbnRlbnRDaGlsZCwgSW5wdXQsIE9uRGVzdHJveSwgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBNYXBDb21wb25lbnQgfSBmcm9tICcuL21hcC5jb21wb25lbnQnO1xuaW1wb3J0IHsgT3ZlcmxheSwgUGFuT3B0aW9ucyB9IGZyb20gJ29sJztcbmltcG9ydCB7IENvbnRlbnRDb21wb25lbnQgfSBmcm9tICcuL2NvbnRlbnQuY29tcG9uZW50JztcbmltcG9ydCBPdmVybGF5UG9zaXRpb25pbmcgZnJvbSAnb2wvT3ZlcmxheVBvc2l0aW9uaW5nJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLW92ZXJsYXknLFxuICB0ZW1wbGF0ZTogJzxuZy1jb250ZW50PjwvbmctY29udGVudD4nLFxufSlcbmV4cG9ydCBjbGFzcyBPdmVybGF5Q29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuICBjb21wb25lbnRUeXBlID0gJ292ZXJsYXknO1xuICBpbnN0YW5jZTogT3ZlcmxheTtcbiAgZWxlbWVudDogRWxlbWVudDtcbiAgQENvbnRlbnRDaGlsZChDb250ZW50Q29tcG9uZW50KVxuICBjb250ZW50OiBDb250ZW50Q29tcG9uZW50O1xuXG4gIEBJbnB1dCgpXG4gIGlkOiBudW1iZXIgfCBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIG9mZnNldDogbnVtYmVyW107XG4gIEBJbnB1dCgpXG4gIHBvc2l0aW9uaW5nOiBPdmVybGF5UG9zaXRpb25pbmcgfCBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIHN0b3BFdmVudDogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgaW5zZXJ0Rmlyc3Q6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGF1dG9QYW46IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGF1dG9QYW5BbmltYXRpb246IFBhbk9wdGlvbnM7XG4gIEBJbnB1dCgpXG4gIGF1dG9QYW5NYXJnaW46IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwQ29tcG9uZW50KSB7fVxuXG4gIG5nT25Jbml0KCkge1xuICAgIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICAgIHRoaXMuZWxlbWVudCA9IHRoaXMuY29udGVudC5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICB0aGlzLmluc3RhbmNlID0gbmV3IE92ZXJsYXkodGhpcyk7XG4gICAgICB0aGlzLm1hcC5pbnN0YW5jZS5hZGRPdmVybGF5KHRoaXMuaW5zdGFuY2UpO1xuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLmluc3RhbmNlKSB7XG4gICAgICB0aGlzLm1hcC5pbnN0YW5jZS5yZW1vdmVPdmVybGF5KHRoaXMuaW5zdGFuY2UpO1xuICAgIH1cbiAgfVxufVxuIl19