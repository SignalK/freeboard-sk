/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, forwardRef, Input } from '@angular/core';
import { FormatComponent } from './format.component';
import { MVT } from 'ol/format';
export class FormatMVTComponent extends FormatComponent {
    constructor() {
        super();
        this.instance = new MVT(this);
    }
}
FormatMVTComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-format-mvt',
                template: '',
                providers: [{ provide: FormatComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => FormatMVTComponent)) }]
            }] }
];
/** @nocollapse */
FormatMVTComponent.ctorParameters = () => [];
FormatMVTComponent.propDecorators = {
    featureClass: [{ type: Input }],
    geometryName: [{ type: Input }],
    layerName: [{ type: Input }],
    layers: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    FormatMVTComponent.prototype.instance;
    /** @type {?} */
    FormatMVTComponent.prototype.featureClass;
    /** @type {?} */
    FormatMVTComponent.prototype.geometryName;
    /** @type {?} */
    FormatMVTComponent.prototype.layerName;
    /** @type {?} */
    FormatMVTComponent.prototype.layers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXZ0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2Zvcm1hdHMvbXZ0LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBU2hDLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxlQUFlO0lBY3JEO1FBQ0UsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7OztZQXRCRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLGdCQUFnQjtnQkFDMUIsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osU0FBUyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxVQUFVOzs7d0JBQUMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLEVBQUMsRUFBRSxDQUFDO2FBQzdGOzs7OzsyQkFJRSxLQUFLOzJCQUlMLEtBQUs7d0JBRUwsS0FBSztxQkFFTCxLQUFLOzs7O0lBVk4sc0NBQWM7O0lBRWQsMENBRzJHOztJQUMzRywwQ0FDcUI7O0lBQ3JCLHVDQUNrQjs7SUFDbEIsb0NBQ2lCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBmb3J3YXJkUmVmLCBJbnB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgRm9ybWF0Q29tcG9uZW50IH0gZnJvbSAnLi9mb3JtYXQuY29tcG9uZW50JztcbmltcG9ydCB7IE1WVCB9IGZyb20gJ29sL2Zvcm1hdCc7XG5pbXBvcnQgeyBHZW9tZXRyeSB9IGZyb20gJ29sL2dlb20nO1xuaW1wb3J0IEdlb21ldHJ5VHlwZSBmcm9tICdvbC9nZW9tL0dlb21ldHJ5VHlwZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1mb3JtYXQtbXZ0JyxcbiAgdGVtcGxhdGU6ICcnLFxuICBwcm92aWRlcnM6IFt7IHByb3ZpZGU6IEZvcm1hdENvbXBvbmVudCwgdXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gRm9ybWF0TVZUQ29tcG9uZW50KSB9XSxcbn0pXG5leHBvcnQgY2xhc3MgRm9ybWF0TVZUQ29tcG9uZW50IGV4dGVuZHMgRm9ybWF0Q29tcG9uZW50IHtcbiAgaW5zdGFuY2U6IE1WVDtcblxuICBASW5wdXQoKVxuICBmZWF0dXJlQ2xhc3M6XG4gICAgfCAoKGdlb206IEdlb21ldHJ5IHwgeyBbazogc3RyaW5nXTogYW55IH0pID0+IGFueSlcbiAgICB8ICgoZ2VvbTogR2VvbWV0cnlUeXBlLCBhcmcyOiBudW1iZXJbXSwgYXJnMzogbnVtYmVyW10gfCBudW1iZXJbXVtdLCBhcmc0OiB7IFtrOiBzdHJpbmddOiBhbnkgfSkgPT4gYW55KTtcbiAgQElucHV0KClcbiAgZ2VvbWV0cnlOYW1lOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIGxheWVyTmFtZTogc3RyaW5nO1xuICBASW5wdXQoKVxuICBsYXllcnM6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBNVlQodGhpcyk7XG4gIH1cbn1cbiJdfQ==