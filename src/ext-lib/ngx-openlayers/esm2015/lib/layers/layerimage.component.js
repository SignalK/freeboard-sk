/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Optional } from '@angular/core';
import { Image } from 'ol/layer';
import { MapComponent } from '../map.component';
import { LayerComponent } from './layer.component';
import { LayerGroupComponent } from './layergroup.component';
import { Extent } from 'ol/extent';
export class LayerImageComponent extends LayerComponent {
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
        this.instance = new Image(this);
        super.ngOnInit();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        super.ngOnChanges(changes);
    }
}
LayerImageComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-layer-image',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
LayerImageComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: LayerGroupComponent, decorators: [{ type: Optional }] }
];
LayerImageComponent.propDecorators = {
    opacity: [{ type: Input }],
    visible: [{ type: Input }],
    extent: [{ type: Input }],
    minResolution: [{ type: Input }],
    maxResolution: [{ type: Input }],
    zIndex: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    LayerImageComponent.prototype.source;
    /** @type {?} */
    LayerImageComponent.prototype.opacity;
    /** @type {?} */
    LayerImageComponent.prototype.visible;
    /** @type {?} */
    LayerImageComponent.prototype.extent;
    /** @type {?} */
    LayerImageComponent.prototype.minResolution;
    /** @type {?} */
    LayerImageComponent.prototype.maxResolution;
    /** @type {?} */
    LayerImageComponent.prototype.zIndex;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5ZXJpbWFnZS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9sYXllcnMvbGF5ZXJpbWFnZS5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFxQixRQUFRLEVBQWlCLE1BQU0sZUFBZSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDakMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBUW5DLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxjQUFjOzs7OztJQWdCckQsWUFBWSxHQUFpQixFQUFjLEtBQTJCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdEIsQ0FBQzs7OztJQUVELFFBQVE7UUFDTixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNuQixDQUFDOzs7OztJQUVELFdBQVcsQ0FBQyxPQUFzQjtRQUNoQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLENBQUM7OztZQWpDRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLGlCQUFpQjtnQkFDM0IsUUFBUSxFQUFFOztHQUVUO2FBQ0Y7Ozs7WUFWUSxZQUFZO1lBRVosbUJBQW1CLHVCQXlCTSxRQUFROzs7c0JBYnZDLEtBQUs7c0JBRUwsS0FBSztxQkFFTCxLQUFLOzRCQUVMLEtBQUs7NEJBRUwsS0FBSztxQkFFTCxLQUFLOzs7O0lBWk4scUNBQXFCOztJQUVyQixzQ0FDZ0I7O0lBQ2hCLHNDQUNpQjs7SUFDakIscUNBQ2U7O0lBQ2YsNENBQ3NCOztJQUN0Qiw0Q0FDc0I7O0lBQ3RCLHFDQUNlIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT25DaGFuZ2VzLCBPbkluaXQsIE9wdGlvbmFsLCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBJbWFnZSB9IGZyb20gJ29sL2xheWVyJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4uL21hcC5jb21wb25lbnQnO1xuaW1wb3J0IHsgTGF5ZXJDb21wb25lbnQgfSBmcm9tICcuL2xheWVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMYXllckdyb3VwQ29tcG9uZW50IH0gZnJvbSAnLi9sYXllcmdyb3VwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBFeHRlbnQgfSBmcm9tICdvbC9leHRlbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtbGF5ZXItaW1hZ2UnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgTGF5ZXJJbWFnZUNvbXBvbmVudCBleHRlbmRzIExheWVyQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMge1xuICBwdWJsaWMgc291cmNlOiBJbWFnZTtcblxuICBASW5wdXQoKVxuICBvcGFjaXR5OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHZpc2libGU6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIGV4dGVudDogRXh0ZW50O1xuICBASW5wdXQoKVxuICBtaW5SZXNvbHV0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIG1heFJlc29sdXRpb246IG51bWJlcjtcbiAgQElucHV0KClcbiAgekluZGV4OiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IobWFwOiBNYXBDb21wb25lbnQsIEBPcHRpb25hbCgpIGdyb3VwPzogTGF5ZXJHcm91cENvbXBvbmVudCkge1xuICAgIHN1cGVyKGdyb3VwIHx8IG1hcCk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IEltYWdlKHRoaXMpO1xuICAgIHN1cGVyLm5nT25Jbml0KCk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgc3VwZXIubmdPbkNoYW5nZXMoY2hhbmdlcyk7XG4gIH1cbn1cbiJdfQ==