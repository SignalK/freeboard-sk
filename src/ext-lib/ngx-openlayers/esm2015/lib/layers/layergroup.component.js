/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, SkipSelf, Optional } from '@angular/core';
import { Group } from 'ol/layer';
import { LayerComponent } from './layer.component';
import { MapComponent } from '../map.component';
export class LayerGroupComponent extends LayerComponent {
    /**
     * @param {?} map
     * @param {?=} group
     */
    constructor(map, group) {
        super(group || map);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log(`creating ol.layer.Group instance with:`, this);
        this.instance = new Group(this);
        super.ngOnInit();
    }
}
LayerGroupComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-layer-group',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
LayerGroupComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: LayerGroupComponent, decorators: [{ type: SkipSelf }, { type: Optional }] }
];
if (false) {
    /** @type {?} */
    LayerGroupComponent.prototype.instance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5ZXJncm91cC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9sYXllcnMvbGF5ZXJncm91cC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQXFCLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNqQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBUWhELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxjQUFjOzs7OztJQUdyRCxZQUNFLEdBQWlCLEVBR2pCLEtBQTJCO1FBRTNCLEtBQUssQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdEIsQ0FBQzs7OztJQUVELFFBQVE7UUFDTiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbkIsQ0FBQzs7O1lBdEJGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsaUJBQWlCO2dCQUMzQixRQUFRLEVBQUU7O0dBRVQ7YUFDRjs7OztZQVBRLFlBQVk7WUFlVCxtQkFBbUIsdUJBRjFCLFFBQVEsWUFDUixRQUFROzs7O0lBTFgsdUNBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBPbkRlc3Ryb3ksIE9uSW5pdCwgU2tpcFNlbGYsIE9wdGlvbmFsIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBHcm91cCB9IGZyb20gJ29sL2xheWVyJztcbmltcG9ydCB7IExheWVyQ29tcG9uZW50IH0gZnJvbSAnLi9sYXllci5jb21wb25lbnQnO1xuaW1wb3J0IHsgTWFwQ29tcG9uZW50IH0gZnJvbSAnLi4vbWFwLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1sYXllci1ncm91cCcsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBMYXllckdyb3VwQ29tcG9uZW50IGV4dGVuZHMgTGF5ZXJDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIHB1YmxpYyBpbnN0YW5jZTogR3JvdXA7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgbWFwOiBNYXBDb21wb25lbnQsXG4gICAgQFNraXBTZWxmKClcbiAgICBAT3B0aW9uYWwoKVxuICAgIGdyb3VwPzogTGF5ZXJHcm91cENvbXBvbmVudFxuICApIHtcbiAgICBzdXBlcihncm91cCB8fCBtYXApO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gY29uc29sZS5sb2coYGNyZWF0aW5nIG9sLmxheWVyLkdyb3VwIGluc3RhbmNlIHdpdGg6YCwgdGhpcyk7XG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBHcm91cCh0aGlzKTtcbiAgICBzdXBlci5uZ09uSW5pdCgpO1xuICB9XG59XG4iXX0=