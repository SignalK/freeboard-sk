/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Host } from '@angular/core';
import { AtlasManager, Circle, Fill, Stroke } from 'ol/style';
import { StyleComponent } from './style.component';
var StyleCircleComponent = /** @class */ (function () {
    function StyleCircleComponent(host) {
        this.host = host;
        this.componentType = 'style-circle';
    }
    /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     */
    /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     * @return {?}
     */
    StyleCircleComponent.prototype.update = /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     * @return {?}
     */
    function () {
        if (!!this.instance) {
            // console.log('setting ol.style.Circle instance\'s radius');
            this.instance.setRadius(this.radius);
        }
        this.host.update();
    };
    /**
     * @return {?}
     */
    StyleCircleComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.style.Circle instance with: ', this);
        this.instance = new Circle(this);
        this.host.instance.setImage(this.instance);
        this.host.update();
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    StyleCircleComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (!this.instance) {
            return;
        }
        if (changes['radius']) {
            this.instance.setRadius(changes['radius'].currentValue);
        }
        // console.log('changes detected in aol-style-circle, setting new radius: ', changes['radius'].currentValue);
    };
    /**
     * @return {?}
     */
    StyleCircleComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-style-circle');
        this.host.instance.setImage(null);
    };
    StyleCircleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style-circle',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleCircleComponent.ctorParameters = function () { return [
        { type: StyleComponent, decorators: [{ type: Host }] }
    ]; };
    StyleCircleComponent.propDecorators = {
        fill: [{ type: Input }],
        radius: [{ type: Input }],
        snapToPixel: [{ type: Input }],
        stroke: [{ type: Input }],
        atlasManager: [{ type: Input }]
    };
    return StyleCircleComponent;
}());
export { StyleCircleComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2lyY2xlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL3N0eWxlcy9jaXJjbGUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQXlELE1BQU0sZUFBZSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRW5EO0lBcUJFLDhCQUE0QixJQUFvQjtRQUFwQixTQUFJLEdBQUosSUFBSSxDQUFnQjtRQWR6QyxrQkFBYSxHQUFHLGNBQWMsQ0FBQztJQWNhLENBQUM7SUFFcEQ7Ozs7T0FJRzs7Ozs7OztJQUNILHFDQUFNOzs7Ozs7SUFBTjtRQUNFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbkIsNkRBQTZEO1lBQzdELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN0QztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckIsQ0FBQzs7OztJQUVELGlEQUFrQjs7O0lBQWxCO1FBQ0UsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JCLENBQUM7Ozs7O0lBRUQsMENBQVc7Ozs7SUFBWCxVQUFZLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLE9BQU87U0FDUjtRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUN6RDtRQUNELDZHQUE2RztJQUMvRyxDQUFDOzs7O0lBRUQsMENBQVc7OztJQUFYO1FBQ0UsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDOztnQkF4REYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSxrQkFBa0I7b0JBQzVCLFFBQVEsRUFBRSxxQ0FFVDtpQkFDRjs7OztnQkFQUSxjQUFjLHVCQXVCUixJQUFJOzs7dUJBWGhCLEtBQUs7eUJBRUwsS0FBSzs4QkFFTCxLQUFLO3lCQUVMLEtBQUs7K0JBRUwsS0FBSzs7SUF1Q1IsMkJBQUM7Q0FBQSxBQXpERCxJQXlEQztTQW5EWSxvQkFBb0I7OztJQUMvQiw2Q0FBc0M7O0lBQ3RDLHdDQUF3Qjs7SUFFeEIsb0NBQ1c7O0lBQ1gsc0NBQ2U7O0lBQ2YsMkNBQ3FCOztJQUNyQixzQ0FDZTs7SUFDZiw0Q0FDMkI7Ozs7O0lBRWYsb0NBQW9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgSG9zdCwgQWZ0ZXJDb250ZW50SW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEF0bGFzTWFuYWdlciwgQ2lyY2xlLCBGaWxsLCBTdHJva2UgfSBmcm9tICdvbC9zdHlsZSc7XG5pbXBvcnQgeyBTdHlsZUNvbXBvbmVudCB9IGZyb20gJy4vc3R5bGUuY29tcG9uZW50JztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLXN0eWxlLWNpcmNsZScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBTdHlsZUNpcmNsZUNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyQ29udGVudEluaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgcHVibGljIGNvbXBvbmVudFR5cGUgPSAnc3R5bGUtY2lyY2xlJztcbiAgcHVibGljIGluc3RhbmNlOiBDaXJjbGU7XG5cbiAgQElucHV0KClcbiAgZmlsbDogRmlsbDtcbiAgQElucHV0KClcbiAgcmFkaXVzOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHNuYXBUb1BpeGVsOiBib29sZWFuO1xuICBASW5wdXQoKVxuICBzdHJva2U6IFN0cm9rZTtcbiAgQElucHV0KClcbiAgYXRsYXNNYW5hZ2VyOiBBdGxhc01hbmFnZXI7XG5cbiAgY29uc3RydWN0b3IoQEhvc3QoKSBwcml2YXRlIGhvc3Q6IFN0eWxlQ29tcG9uZW50KSB7fVxuXG4gIC8qKlxuICAgKiBXT1JLLUFST1VORDogc2luY2UgdGhlIHJlLXJlbmRlcmluZyBpcyBub3QgdHJpZ2dlcmVkIG9uIHN0eWxlIGNoYW5nZVxuICAgKiB3ZSB0cmlnZ2VyIGEgcmFkaXVzIGNoYW5nZS5cbiAgICogc2VlIG9wZW5sYXllcnMgIzYyMzMgYW5kICM1Nzc1XG4gICAqL1xuICB1cGRhdGUoKSB7XG4gICAgaWYgKCEhdGhpcy5pbnN0YW5jZSkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ3NldHRpbmcgb2wuc3R5bGUuQ2lyY2xlIGluc3RhbmNlXFwncyByYWRpdXMnKTtcbiAgICAgIHRoaXMuaW5zdGFuY2Uuc2V0UmFkaXVzKHRoaXMucmFkaXVzKTtcbiAgICB9XG4gICAgdGhpcy5ob3N0LnVwZGF0ZSgpO1xuICB9XG5cbiAgbmdBZnRlckNvbnRlbnRJbml0KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBvbC5zdHlsZS5DaXJjbGUgaW5zdGFuY2Ugd2l0aDogJywgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBDaXJjbGUodGhpcyk7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldEltYWdlKHRoaXMuaW5zdGFuY2UpO1xuICAgIHRoaXMuaG9zdC51cGRhdGUoKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNoYW5nZXNbJ3JhZGl1cyddKSB7XG4gICAgICB0aGlzLmluc3RhbmNlLnNldFJhZGl1cyhjaGFuZ2VzWydyYWRpdXMnXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZygnY2hhbmdlcyBkZXRlY3RlZCBpbiBhb2wtc3R5bGUtY2lyY2xlLCBzZXR0aW5nIG5ldyByYWRpdXM6ICcsIGNoYW5nZXNbJ3JhZGl1cyddLmN1cnJlbnRWYWx1ZSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygncmVtb3ZpbmcgYW9sLXN0eWxlLWNpcmNsZScpO1xuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRJbWFnZShudWxsKTtcbiAgfVxufVxuIl19