/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input } from '@angular/core';
import { createXYZ } from 'ol/tilegrid';
import TileGrid from 'ol/tilegrid/TileGrid';
import { Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
export class TileGridComponent {
    /**
     * @return {?}
     */
    ngOnInit() {
        if (!this.resolutions) {
            this.instance = createXYZ(this);
        }
        else {
            this.instance = new TileGrid(this);
        }
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (!this.resolutions) {
            this.instance = createXYZ(this);
        }
        else {
            this.instance = new TileGrid(this);
        }
    }
}
TileGridComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-tilegrid',
                template: ''
            }] }
];
TileGridComponent.propDecorators = {
    extent: [{ type: Input }],
    maxZoom: [{ type: Input }],
    minZoom: [{ type: Input }],
    tileSize: [{ type: Input }],
    origin: [{ type: Input }],
    resolutions: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    TileGridComponent.prototype.instance;
    /** @type {?} */
    TileGridComponent.prototype.extent;
    /** @type {?} */
    TileGridComponent.prototype.maxZoom;
    /** @type {?} */
    TileGridComponent.prototype.minZoom;
    /** @type {?} */
    TileGridComponent.prototype.tileSize;
    /** @type {?} */
    TileGridComponent.prototype.origin;
    /** @type {?} */
    TileGridComponent.prototype.resolutions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZWdyaWQuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmd4LW9wZW5sYXllcnMvIiwic291cmNlcyI6WyJsaWIvdGlsZWdyaWQuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBb0MsTUFBTSxlQUFlLENBQUM7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN4QyxPQUFPLFFBQVEsTUFBTSxzQkFBc0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFPM0MsTUFBTSxPQUFPLGlCQUFpQjs7OztJQWdCNUIsUUFBUTtRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pDO2FBQU07WUFDTCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQzs7Ozs7SUFFRCxXQUFXLENBQUMsT0FBc0I7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7YUFBTTtZQUNMLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEM7SUFDSCxDQUFDOzs7WUFsQ0YsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxjQUFjO2dCQUN4QixRQUFRLEVBQUUsRUFBRTthQUNiOzs7cUJBSUUsS0FBSztzQkFFTCxLQUFLO3NCQUVMLEtBQUs7dUJBRUwsS0FBSztxQkFFTCxLQUFLOzBCQUVMLEtBQUs7Ozs7SUFaTixxQ0FBbUI7O0lBRW5CLG1DQUNlOztJQUNmLG9DQUNnQjs7SUFDaEIsb0NBQ2dCOztJQUNoQixxQ0FDd0I7O0lBQ3hCLG1DQUNvQjs7SUFDcEIsd0NBQ3NCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT25DaGFuZ2VzLCBPbkluaXQsIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IGNyZWF0ZVhZWiB9IGZyb20gJ29sL3RpbGVncmlkJztcbmltcG9ydCBUaWxlR3JpZCBmcm9tICdvbC90aWxlZ3JpZC9UaWxlR3JpZCc7XG5pbXBvcnQgeyBFeHRlbnQgfSBmcm9tICdvbC9leHRlbnQnO1xuaW1wb3J0IHsgQ29vcmRpbmF0ZSB9IGZyb20gJ29sL2Nvb3JkaW5hdGUnO1xuaW1wb3J0IHsgU2l6ZSB9IGZyb20gJ29sL3NpemUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtdGlsZWdyaWQnLFxuICB0ZW1wbGF0ZTogJycsXG59KVxuZXhwb3J0IGNsYXNzIFRpbGVHcmlkQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMge1xuICBpbnN0YW5jZTogVGlsZUdyaWQ7XG5cbiAgQElucHV0KClcbiAgZXh0ZW50OiBFeHRlbnQ7XG4gIEBJbnB1dCgpXG4gIG1heFpvb206IG51bWJlcjtcbiAgQElucHV0KClcbiAgbWluWm9vbTogbnVtYmVyO1xuICBASW5wdXQoKVxuICB0aWxlU2l6ZTogbnVtYmVyIHwgU2l6ZTtcbiAgQElucHV0KClcbiAgb3JpZ2luPzogQ29vcmRpbmF0ZTtcbiAgQElucHV0KClcbiAgcmVzb2x1dGlvbnM6IG51bWJlcltdO1xuXG4gIG5nT25Jbml0KCkge1xuICAgIGlmICghdGhpcy5yZXNvbHV0aW9ucykge1xuICAgICAgdGhpcy5pbnN0YW5jZSA9IGNyZWF0ZVhZWih0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBUaWxlR3JpZCh0aGlzKTtcbiAgICB9XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKCF0aGlzLnJlc29sdXRpb25zKSB7XG4gICAgICB0aGlzLmluc3RhbmNlID0gY3JlYXRlWFlaKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluc3RhbmNlID0gbmV3IFRpbGVHcmlkKHRoaXMpO1xuICAgIH1cbiAgfVxufVxuIl19