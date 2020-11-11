/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, ContentChildren, Host, QueryList } from '@angular/core';
import { SourceComponent } from './sources/source.component';
import { AttributionComponent } from './attribution.component';
export class AttributionsComponent {
    /**
     * @param {?} source
     */
    constructor(source) {
        this.source = source;
    }
    /* we can do this at the very end */
    /**
     * @return {?}
     */
    ngAfterViewInit() {
        if (this.attributions.length) {
            this.instance = this.attributions.map((/**
             * @param {?} cmp
             * @return {?}
             */
            cmp => cmp.instance));
            // console.log('setting attributions:', this.instance);
            this.source.instance.setAttributions(this.instance);
        }
    }
}
AttributionsComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-attributions',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
AttributionsComponent.ctorParameters = () => [
    { type: SourceComponent, decorators: [{ type: Host }] }
];
AttributionsComponent.propDecorators = {
    attributions: [{ type: ContentChildren, args: [AttributionComponent,] }]
};
if (false) {
    /** @type {?} */
    AttributionsComponent.prototype.instance;
    /** @type {?} */
    AttributionsComponent.prototype.attributions;
    /**
     * @type {?}
     * @private
     */
    AttributionsComponent.prototype.source;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0cmlidXRpb25zLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2F0dHJpYnV0aW9ucy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBaUIsU0FBUyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQU0vRCxNQUFNLE9BQU8scUJBQXFCOzs7O0lBTWhDLFlBQTRCLE1BQXVCO1FBQXZCLFdBQU0sR0FBTixNQUFNLENBQWlCO0lBQUcsQ0FBQzs7Ozs7SUFHdkQsZUFBZTtRQUNiLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUc7Ozs7WUFBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUMsQ0FBQztZQUMzRCx1REFBdUQ7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNyRDtJQUNILENBQUM7OztZQW5CRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLGtCQUFrQjtnQkFDNUIsUUFBUSxFQUFFLDJCQUEyQjthQUN0Qzs7OztZQU5RLGVBQWUsdUJBYVQsSUFBSTs7OzJCQUhoQixlQUFlLFNBQUMsb0JBQW9COzs7O0lBRnJDLHlDQUE2Qjs7SUFFN0IsNkNBQzhDOzs7OztJQUVsQyx1Q0FBdUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBZnRlclZpZXdJbml0LCBDb21wb25lbnQsIENvbnRlbnRDaGlsZHJlbiwgSG9zdCwgUXVlcnlMaXN0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBBdHRyaWJ1dGlvbiB9IGZyb20gJ29sL2NvbnRyb2wnO1xuaW1wb3J0IHsgU291cmNlQ29tcG9uZW50IH0gZnJvbSAnLi9zb3VyY2VzL3NvdXJjZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgQXR0cmlidXRpb25Db21wb25lbnQgfSBmcm9tICcuL2F0dHJpYnV0aW9uLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1hdHRyaWJ1dGlvbnMnLFxuICB0ZW1wbGF0ZTogJzxuZy1jb250ZW50PjwvbmctY29udGVudD4nLFxufSlcbmV4cG9ydCBjbGFzcyBBdHRyaWJ1dGlvbnNDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0IHtcbiAgaW5zdGFuY2U6IEFycmF5PEF0dHJpYnV0aW9uPjtcblxuICBAQ29udGVudENoaWxkcmVuKEF0dHJpYnV0aW9uQ29tcG9uZW50KVxuICBhdHRyaWJ1dGlvbnM6IFF1ZXJ5TGlzdDxBdHRyaWJ1dGlvbkNvbXBvbmVudD47XG5cbiAgY29uc3RydWN0b3IoQEhvc3QoKSBwcml2YXRlIHNvdXJjZTogU291cmNlQ29tcG9uZW50KSB7fVxuXG4gIC8qIHdlIGNhbiBkbyB0aGlzIGF0IHRoZSB2ZXJ5IGVuZCAqL1xuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgaWYgKHRoaXMuYXR0cmlidXRpb25zLmxlbmd0aCkge1xuICAgICAgdGhpcy5pbnN0YW5jZSA9IHRoaXMuYXR0cmlidXRpb25zLm1hcChjbXAgPT4gY21wLmluc3RhbmNlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdzZXR0aW5nIGF0dHJpYnV0aW9uczonLCB0aGlzLmluc3RhbmNlKTtcbiAgICAgIHRoaXMuc291cmNlLmluc3RhbmNlLnNldEF0dHJpYnV0aW9ucyh0aGlzLmluc3RhbmNlKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==