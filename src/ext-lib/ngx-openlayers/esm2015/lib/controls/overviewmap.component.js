/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { View } from 'ol';
import { OverviewMap } from 'ol/control';
import { MapComponent } from '../map.component';
export class ControlOverviewMapComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeControl(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance != null && changes.hasOwnProperty('view')) {
            this.reloadInstance();
        }
    }
    /**
     * @private
     * @return {?}
     */
    reloadInstance() {
        this.map.instance.removeControl(this.instance);
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    }
}
ControlOverviewMapComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-overviewmap',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlOverviewMapComponent.ctorParameters = () => [
    { type: MapComponent }
];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdtYXAuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvY29udHJvbHMvb3ZlcnZpZXdtYXAuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBK0MsTUFBTSxlQUFlLENBQUM7QUFFOUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLElBQUksQ0FBQztBQUMxQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQVFoRCxNQUFNLE9BQU8sMkJBQTJCOzs7O0lBbUJ0QyxZQUFvQixHQUFpQjtRQUFqQixRQUFHLEdBQUgsR0FBRyxDQUFjO0lBQUcsQ0FBQzs7OztJQUV6QyxRQUFRO1FBQ04sSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Ozs7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDOzs7OztJQUVELFdBQVcsQ0FBQyxPQUFzQjtRQUNoQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQzs7Ozs7SUFFTyxjQUFjO1FBQ3BCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7OztZQTlDRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLHlCQUF5QjtnQkFDbkMsUUFBUSxFQUFFOztHQUVUO2FBQ0Y7Ozs7WUFQUSxZQUFZOzs7d0JBVWxCLEtBQUs7NEJBRUwsS0FBSzswQkFFTCxLQUFLO29CQUVMLEtBQUs7cUJBRUwsS0FBSztxQkFFTCxLQUFLO3VCQUVMLEtBQUs7bUJBRUwsS0FBSzs7OztJQWZOLCtDQUFzQjs7SUFDdEIsZ0RBQ21COztJQUNuQixvREFDc0I7O0lBQ3RCLGtEQUNxQjs7SUFDckIsNENBQ2M7O0lBQ2QsNkNBQ2dCOztJQUNoQiw2Q0FDZ0I7O0lBQ2hCLCtDQUNpQjs7SUFDakIsMkNBQ1c7Ozs7O0lBRUMsMENBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT25EZXN0cm95LCBPbkluaXQsIE9uQ2hhbmdlcywgU2ltcGxlQ2hhbmdlcyB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTGF5ZXIgfSBmcm9tICdvbC9sYXllcic7XG5pbXBvcnQgeyBWaWV3IH0gZnJvbSAnb2wnO1xuaW1wb3J0IHsgT3ZlcnZpZXdNYXAgfSBmcm9tICdvbC9jb250cm9sJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtY29udHJvbC1vdmVydmlld21hcCcsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBDb250cm9sT3ZlcnZpZXdNYXBDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgaW5zdGFuY2U6IE92ZXJ2aWV3TWFwO1xuICBASW5wdXQoKVxuICBjb2xsYXBzZWQ6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGNvbGxhcHNlTGFiZWw6IHN0cmluZztcbiAgQElucHV0KClcbiAgY29sbGFwc2libGU6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGxhYmVsOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGxheWVyczogTGF5ZXJbXTtcbiAgQElucHV0KClcbiAgdGFyZ2V0OiBFbGVtZW50O1xuICBASW5wdXQoKVxuICB0aXBMYWJlbDogc3RyaW5nO1xuICBASW5wdXQoKVxuICB2aWV3OiBWaWV3O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFwOiBNYXBDb21wb25lbnQpIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBPdmVydmlld01hcCh0aGlzKTtcbiAgICB0aGlzLm1hcC5pbnN0YW5jZS5hZGRDb250cm9sKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlQ29udHJvbCh0aGlzLmluc3RhbmNlKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAodGhpcy5pbnN0YW5jZSAhPSBudWxsICYmIGNoYW5nZXMuaGFzT3duUHJvcGVydHkoJ3ZpZXcnKSkge1xuICAgICAgdGhpcy5yZWxvYWRJbnN0YW5jZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVsb2FkSW5zdGFuY2UoKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlQ29udHJvbCh0aGlzLmluc3RhbmNlKTtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IE92ZXJ2aWV3TWFwKHRoaXMpO1xuICAgIHRoaXMubWFwLmluc3RhbmNlLmFkZENvbnRyb2wodGhpcy5pbnN0YW5jZSk7XG4gIH1cbn1cbiJdfQ==