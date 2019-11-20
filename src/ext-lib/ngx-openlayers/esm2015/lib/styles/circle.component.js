/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Host } from '@angular/core';
import { AtlasManager, Circle, Fill, Stroke } from 'ol/style';
import { StyleComponent } from './style.component';
export class StyleCircleComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
        this.host = host;
        this.componentType = 'style-circle';
    }
    /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     * @return {?}
     */
    update() {
        if (!!this.instance) {
            // console.log('setting ol.style.Circle instance\'s radius');
            this.instance.setRadius(this.radius);
        }
        this.host.update();
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        // console.log('creating ol.style.Circle instance with: ', this);
        this.instance = new Circle(this);
        this.host.instance.setImage(this.instance);
        this.host.update();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (!this.instance) {
            return;
        }
        if (changes['radius']) {
            this.instance.setRadius(changes['radius'].currentValue);
        }
        // console.log('changes detected in aol-style-circle, setting new radius: ', changes['radius'].currentValue);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-style-circle');
        this.host.instance.setImage(null);
    }
}
StyleCircleComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style-circle',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
StyleCircleComponent.ctorParameters = () => [
    { type: StyleComponent, decorators: [{ type: Host }] }
];
StyleCircleComponent.propDecorators = {
    fill: [{ type: Input }],
    radius: [{ type: Input }],
    snapToPixel: [{ type: Input }],
    stroke: [{ type: Input }],
    atlasManager: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    StyleCircleComponent.prototype.componentType;
    /** @type {?} */
    StyleCircleComponent.prototype.instance;
    /** @type {?} */
    StyleCircleComponent.prototype.fill;
    /** @type {?} */
    StyleCircleComponent.prototype.radius;
    /** @type {?} */
    StyleCircleComponent.prototype.snapToPixel;
    /** @type {?} */
    StyleCircleComponent.prototype.stroke;
    /** @type {?} */
    StyleCircleComponent.prototype.atlasManager;
    /**
     * @type {?}
     * @private
     */
    StyleCircleComponent.prototype.host;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2lyY2xlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3N0eWxlcy9jaXJjbGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQXlELE1BQU0sZUFBZSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBUW5ELE1BQU0sT0FBTyxvQkFBb0I7Ozs7SUFlL0IsWUFBNEIsSUFBb0I7UUFBcEIsU0FBSSxHQUFKLElBQUksQ0FBZ0I7UUFkekMsa0JBQWEsR0FBRyxjQUFjLENBQUM7SUFjYSxDQUFDOzs7Ozs7O0lBT3BELE1BQU07UUFDSixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ25CLDZEQUE2RDtZQUM3RCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdEM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JCLENBQUM7Ozs7SUFFRCxrQkFBa0I7UUFDaEIsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JCLENBQUM7Ozs7O0lBRUQsV0FBVyxDQUFDLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLE9BQU87U0FDUjtRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUN6RDtRQUNELDZHQUE2RztJQUMvRyxDQUFDOzs7O0lBRUQsV0FBVztRQUNULDRDQUE0QztRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQzs7O1lBeERGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsa0JBQWtCO2dCQUM1QixRQUFRLEVBQUU7O0dBRVQ7YUFDRjs7OztZQVBRLGNBQWMsdUJBdUJSLElBQUk7OzttQkFYaEIsS0FBSztxQkFFTCxLQUFLOzBCQUVMLEtBQUs7cUJBRUwsS0FBSzsyQkFFTCxLQUFLOzs7O0lBWE4sNkNBQXNDOztJQUN0Qyx3Q0FBd0I7O0lBRXhCLG9DQUNXOztJQUNYLHNDQUNlOztJQUNmLDJDQUNxQjs7SUFDckIsc0NBQ2U7O0lBQ2YsNENBQzJCOzs7OztJQUVmLG9DQUFvQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSW5wdXQsIEhvc3QsIEFmdGVyQ29udGVudEluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBBdGxhc01hbmFnZXIsIENpcmNsZSwgRmlsbCwgU3Ryb2tlIH0gZnJvbSAnb2wvc3R5bGUnO1xuaW1wb3J0IHsgU3R5bGVDb21wb25lbnQgfSBmcm9tICcuL3N0eWxlLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1zdHlsZS1jaXJjbGUnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgU3R5bGVDaXJjbGVDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlckNvbnRlbnRJbml0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG4gIHB1YmxpYyBjb21wb25lbnRUeXBlID0gJ3N0eWxlLWNpcmNsZSc7XG4gIHB1YmxpYyBpbnN0YW5jZTogQ2lyY2xlO1xuXG4gIEBJbnB1dCgpXG4gIGZpbGw6IEZpbGw7XG4gIEBJbnB1dCgpXG4gIHJhZGl1czogbnVtYmVyO1xuICBASW5wdXQoKVxuICBzbmFwVG9QaXhlbDogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgc3Ryb2tlOiBTdHJva2U7XG4gIEBJbnB1dCgpXG4gIGF0bGFzTWFuYWdlcjogQXRsYXNNYW5hZ2VyO1xuXG4gIGNvbnN0cnVjdG9yKEBIb3N0KCkgcHJpdmF0ZSBob3N0OiBTdHlsZUNvbXBvbmVudCkge31cblxuICAvKipcbiAgICogV09SSy1BUk9VTkQ6IHNpbmNlIHRoZSByZS1yZW5kZXJpbmcgaXMgbm90IHRyaWdnZXJlZCBvbiBzdHlsZSBjaGFuZ2VcbiAgICogd2UgdHJpZ2dlciBhIHJhZGl1cyBjaGFuZ2UuXG4gICAqIHNlZSBvcGVubGF5ZXJzICM2MjMzIGFuZCAjNTc3NVxuICAgKi9cbiAgdXBkYXRlKCkge1xuICAgIGlmICghIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdzZXR0aW5nIG9sLnN0eWxlLkNpcmNsZSBpbnN0YW5jZVxcJ3MgcmFkaXVzJyk7XG4gICAgICB0aGlzLmluc3RhbmNlLnNldFJhZGl1cyh0aGlzLnJhZGl1cyk7XG4gICAgfVxuICAgIHRoaXMuaG9zdC51cGRhdGUoKTtcbiAgfVxuXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnY3JlYXRpbmcgb2wuc3R5bGUuQ2lyY2xlIGluc3RhbmNlIHdpdGg6ICcsIHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgQ2lyY2xlKHRoaXMpO1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRJbWFnZSh0aGlzLmluc3RhbmNlKTtcbiAgICB0aGlzLmhvc3QudXBkYXRlKCk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjaGFuZ2VzWydyYWRpdXMnXSkge1xuICAgICAgdGhpcy5pbnN0YW5jZS5zZXRSYWRpdXMoY2hhbmdlc1sncmFkaXVzJ10uY3VycmVudFZhbHVlKTtcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coJ2NoYW5nZXMgZGV0ZWN0ZWQgaW4gYW9sLXN0eWxlLWNpcmNsZSwgc2V0dGluZyBuZXcgcmFkaXVzOiAnLCBjaGFuZ2VzWydyYWRpdXMnXS5jdXJyZW50VmFsdWUpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ3JlbW92aW5nIGFvbC1zdHlsZS1jaXJjbGUnKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0SW1hZ2UobnVsbCk7XG4gIH1cbn1cbiJdfQ==