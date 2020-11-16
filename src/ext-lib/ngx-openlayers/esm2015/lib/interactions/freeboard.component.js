/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component } from '@angular/core';
import { DragPan, DragZoom, PinchZoom, MouseWheelZoom, KeyboardPan, KeyboardZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
export class FreeboardInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.interactions = [];
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.interactions.push(new DragPan(this));
        this.interactions.push(new DragZoom(this));
        this.interactions.push(new PinchZoom(this));
        this.interactions.push(new MouseWheelZoom(this));
        this.interactions.push(new KeyboardPan(this));
        this.interactions.push(new KeyboardZoom(this));
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        i => this.map.instance.addInteraction(i)));
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        i => this.map.instance.removeInteraction(i)));
    }
}
FreeboardInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-freeboard',
                template: ''
            }] }
];
/** @nocollapse */
FreeboardInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
if (false) {
    /** @type {?} */
    FreeboardInteractionComponent.prototype.interactions;
    /**
     * @type {?}
     * @private
     */
    FreeboardInteractionComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJlZWJvYXJkLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2ludGVyYWN0aW9ucy9mcmVlYm9hcmQuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFxQixNQUFNLGVBQWUsQ0FBQztBQUM3RCxPQUFPLEVBQXlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUN4RCxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXRFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQU1oRCxNQUFNLE9BQU8sNkJBQTZCOzs7O0lBR3RDLFlBQW9CLEdBQWlCO1FBQWpCLFFBQUcsR0FBSCxHQUFHLENBQWM7UUFGckMsaUJBQVksR0FBc0IsRUFBRSxDQUFDO0lBRUcsQ0FBQzs7OztJQUV6QyxRQUFRO1FBQ0osSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPOzs7O1FBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQztJQUN4RSxDQUFDOzs7O0lBRUQsV0FBVztRQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTzs7OztRQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQztJQUMzRSxDQUFDOzs7WUFyQkosU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSwyQkFBMkI7Z0JBQ3JDLFFBQVEsRUFBRSxFQUFFO2FBQ2I7Ozs7WUFMUSxZQUFZOzs7O0lBT2pCLHFEQUFxQzs7Ozs7SUFFekIsNENBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBPbkRlc3Ryb3ksIE9uSW5pdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgZGVmYXVsdHMsIEludGVyYWN0aW9uLCBEcmFnUGFuLCBEcmFnWm9vbSwgUGluY2hab29tLFxuICAgIE1vdXNlV2hlZWxab29tLCBLZXlib2FyZFBhbiwgS2V5Ym9hcmRab29tIH0gZnJvbSAnb2wvaW50ZXJhY3Rpb24nO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiB9IGZyb20gJ29sJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtaW50ZXJhY3Rpb24tZnJlZWJvYXJkJyxcbiAgdGVtcGxhdGU6ICcnLFxufSlcbmV4cG9ydCBjbGFzcyBGcmVlYm9hcmRJbnRlcmFjdGlvbkNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25EZXN0cm95IHtcbiAgICBpbnRlcmFjdGlvbnM6IEFycmF5PEludGVyYWN0aW9uPj0gW107XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwQ29tcG9uZW50KSB7fVxuXG4gICAgbmdPbkluaXQoKSB7XG4gICAgICAgIHRoaXMuaW50ZXJhY3Rpb25zLnB1c2gobmV3IERyYWdQYW4odGhpcykpO1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5wdXNoKG5ldyBEcmFnWm9vbSh0aGlzKSk7XG4gICAgICAgIHRoaXMuaW50ZXJhY3Rpb25zLnB1c2gobmV3IFBpbmNoWm9vbSh0aGlzKSk7XG4gICAgICAgIHRoaXMuaW50ZXJhY3Rpb25zLnB1c2gobmV3IE1vdXNlV2hlZWxab29tKHRoaXMpKTtcbiAgICAgICAgdGhpcy5pbnRlcmFjdGlvbnMucHVzaChuZXcgS2V5Ym9hcmRQYW4odGhpcykpO1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5wdXNoKG5ldyBLZXlib2FyZFpvb20odGhpcykpO1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5mb3JFYWNoKGkgPT4gdGhpcy5tYXAuaW5zdGFuY2UuYWRkSW50ZXJhY3Rpb24oaSkpO1xuICAgIH1cblxuICAgIG5nT25EZXN0cm95KCkge1xuICAgICAgICB0aGlzLmludGVyYWN0aW9ucy5mb3JFYWNoKGkgPT4gdGhpcy5tYXAuaW5zdGFuY2UucmVtb3ZlSW50ZXJhY3Rpb24oaSkpO1xuICAgIH1cbn1cbiJdfQ==