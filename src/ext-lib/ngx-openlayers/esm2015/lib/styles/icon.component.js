/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Host } from '@angular/core';
import { Icon } from 'ol/style';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';
import IconOrigin from 'ol/style/IconOrigin';
import { StyleComponent } from './style.component';
export class StyleIconComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
        this.host = host;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log('creating ol.style.Icon instance with: ', this);
        this.instance = new Icon(this);
        this.host.instance.setImage(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (!this.instance) {
            return;
        }
        if (changes['opacity']) {
            this.instance.setOpacity(changes['opacity'].currentValue);
        }
        if (changes['rotation']) {
            this.instance.setRotation(changes['rotation'].currentValue);
        }
        if (changes['scale']) {
            this.instance.setScale(changes['scale'].currentValue);
        }
        if (changes['src']) {
            this.instance = new Icon(this);
            this.host.instance.setImage(this.instance);
        }
        this.host.update();
        // console.log('changes detected in aol-style-icon: ', changes);
    }
}
StyleIconComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style-icon',
                template: `
    <div class="aol-style-icon"></div>
  `
            }] }
];
/** @nocollapse */
StyleIconComponent.ctorParameters = () => [
    { type: StyleComponent, decorators: [{ type: Host }] }
];
StyleIconComponent.propDecorators = {
    anchor: [{ type: Input }],
    anchorXUnits: [{ type: Input }],
    anchorYUnits: [{ type: Input }],
    anchorOrigin: [{ type: Input }],
    color: [{ type: Input }],
    crossOrigin: [{ type: Input }],
    img: [{ type: Input }],
    offset: [{ type: Input }],
    offsetOrigin: [{ type: Input }],
    opacity: [{ type: Input }],
    scale: [{ type: Input }],
    snapToPixel: [{ type: Input }],
    rotateWithView: [{ type: Input }],
    rotation: [{ type: Input }],
    size: [{ type: Input }],
    imgSize: [{ type: Input }],
    src: [{ type: Input }]
};
if (false) {
    /** @type {?} */
    StyleIconComponent.prototype.instance;
    /** @type {?} */
    StyleIconComponent.prototype.anchor;
    /** @type {?} */
    StyleIconComponent.prototype.anchorXUnits;
    /** @type {?} */
    StyleIconComponent.prototype.anchorYUnits;
    /** @type {?} */
    StyleIconComponent.prototype.anchorOrigin;
    /** @type {?} */
    StyleIconComponent.prototype.color;
    /** @type {?} */
    StyleIconComponent.prototype.crossOrigin;
    /** @type {?} */
    StyleIconComponent.prototype.img;
    /** @type {?} */
    StyleIconComponent.prototype.offset;
    /** @type {?} */
    StyleIconComponent.prototype.offsetOrigin;
    /** @type {?} */
    StyleIconComponent.prototype.opacity;
    /** @type {?} */
    StyleIconComponent.prototype.scale;
    /** @type {?} */
    StyleIconComponent.prototype.snapToPixel;
    /** @type {?} */
    StyleIconComponent.prototype.rotateWithView;
    /** @type {?} */
    StyleIconComponent.prototype.rotation;
    /** @type {?} */
    StyleIconComponent.prototype.size;
    /** @type {?} */
    StyleIconComponent.prototype.imgSize;
    /** @type {?} */
    StyleIconComponent.prototype.src;
    /**
     * @type {?}
     * @private
     */
    StyleIconComponent.prototype.host;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbi5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zdHlsZXMvaWNvbi5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBb0MsTUFBTSxlQUFlLENBQUM7QUFDekYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLGVBQWUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLFVBQVUsTUFBTSxxQkFBcUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFRbkQsTUFBTSxPQUFPLGtCQUFrQjs7OztJQXNDN0IsWUFBNEIsSUFBb0I7UUFBcEIsU0FBSSxHQUFKLElBQUksQ0FBZ0I7SUFBRyxDQUFDOzs7O0lBRXBELFFBQVE7UUFDTiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzdDLENBQUM7Ozs7O0lBRUQsV0FBVyxDQUFDLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLE9BQU87U0FDUjtRQUNELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMzRDtRQUNELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM3RDtRQUNELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUN2RDtRQUNELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM1QztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkIsZ0VBQWdFO0lBQ2xFLENBQUM7OztZQXZFRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLGdCQUFnQjtnQkFDMUIsUUFBUSxFQUFFOztHQUVUO2FBQ0Y7Ozs7WUFQUSxjQUFjLHVCQThDUixJQUFJOzs7cUJBbkNoQixLQUFLOzJCQUVMLEtBQUs7MkJBRUwsS0FBSzsyQkFFTCxLQUFLO29CQUVMLEtBQUs7MEJBRUwsS0FBSztrQkFFTCxLQUFLO3FCQUVMLEtBQUs7MkJBRUwsS0FBSztzQkFFTCxLQUFLO29CQUVMLEtBQUs7MEJBRUwsS0FBSzs2QkFFTCxLQUFLO3VCQUVMLEtBQUs7bUJBRUwsS0FBSztzQkFFTCxLQUFLO2tCQUVMLEtBQUs7Ozs7SUFsQ04sc0NBQXNCOztJQUV0QixvQ0FDeUI7O0lBQ3pCLDBDQUM4Qjs7SUFDOUIsMENBQzhCOztJQUM5QiwwQ0FDeUI7O0lBQ3pCLG1DQUN3Qzs7SUFDeEMseUNBQ3dCOztJQUN4QixpQ0FDWTs7SUFDWixvQ0FDeUI7O0lBQ3pCLDBDQUN5Qjs7SUFDekIscUNBQ2dCOztJQUNoQixtQ0FDYzs7SUFDZCx5Q0FDcUI7O0lBQ3JCLDRDQUN3Qjs7SUFDeEIsc0NBQ2lCOztJQUNqQixrQ0FDdUI7O0lBQ3ZCLHFDQUMwQjs7SUFDMUIsaUNBQ1k7Ozs7O0lBRUEsa0NBQW9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgSG9zdCwgT25Jbml0LCBPbkNoYW5nZXMsIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEljb24gfSBmcm9tICdvbC9zdHlsZSc7XG5pbXBvcnQgSWNvbkFuY2hvclVuaXRzIGZyb20gJ29sL3N0eWxlL0ljb25BbmNob3JVbml0cyc7XG5pbXBvcnQgSWNvbk9yaWdpbiBmcm9tICdvbC9zdHlsZS9JY29uT3JpZ2luJztcbmltcG9ydCB7IFN0eWxlQ29tcG9uZW50IH0gZnJvbSAnLi9zdHlsZS5jb21wb25lbnQnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtc3R5bGUtaWNvbicsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGRpdiBjbGFzcz1cImFvbC1zdHlsZS1pY29uXCI+PC9kaXY+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIFN0eWxlSWNvbkNvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25DaGFuZ2VzIHtcbiAgcHVibGljIGluc3RhbmNlOiBJY29uO1xuXG4gIEBJbnB1dCgpXG4gIGFuY2hvcjogW251bWJlciwgbnVtYmVyXTtcbiAgQElucHV0KClcbiAgYW5jaG9yWFVuaXRzOiBJY29uQW5jaG9yVW5pdHM7XG4gIEBJbnB1dCgpXG4gIGFuY2hvcllVbml0czogSWNvbkFuY2hvclVuaXRzO1xuICBASW5wdXQoKVxuICBhbmNob3JPcmlnaW46IEljb25PcmlnaW47XG4gIEBJbnB1dCgpXG4gIGNvbG9yOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgQElucHV0KClcbiAgY3Jvc3NPcmlnaW46IEljb25PcmlnaW47XG4gIEBJbnB1dCgpXG4gIGltZzogc3RyaW5nO1xuICBASW5wdXQoKVxuICBvZmZzZXQ6IFtudW1iZXIsIG51bWJlcl07XG4gIEBJbnB1dCgpXG4gIG9mZnNldE9yaWdpbjogSWNvbk9yaWdpbjtcbiAgQElucHV0KClcbiAgb3BhY2l0eTogbnVtYmVyO1xuICBASW5wdXQoKVxuICBzY2FsZTogbnVtYmVyO1xuICBASW5wdXQoKVxuICBzbmFwVG9QaXhlbDogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgcm90YXRlV2l0aFZpZXc6IGJvb2xlYW47XG4gIEBJbnB1dCgpXG4gIHJvdGF0aW9uOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHNpemU6IFtudW1iZXIsIG51bWJlcl07XG4gIEBJbnB1dCgpXG4gIGltZ1NpemU6IFtudW1iZXIsIG51bWJlcl07XG4gIEBJbnB1dCgpXG4gIHNyYzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKEBIb3N0KCkgcHJpdmF0ZSBob3N0OiBTdHlsZUNvbXBvbmVudCkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnY3JlYXRpbmcgb2wuc3R5bGUuSWNvbiBpbnN0YW5jZSB3aXRoOiAnLCB0aGlzKTtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IEljb24odGhpcyk7XG4gICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldEltYWdlKHRoaXMuaW5zdGFuY2UpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY2hhbmdlc1snb3BhY2l0eSddKSB7XG4gICAgICB0aGlzLmluc3RhbmNlLnNldE9wYWNpdHkoY2hhbmdlc1snb3BhY2l0eSddLmN1cnJlbnRWYWx1ZSk7XG4gICAgfVxuICAgIGlmIChjaGFuZ2VzWydyb3RhdGlvbiddKSB7XG4gICAgICB0aGlzLmluc3RhbmNlLnNldFJvdGF0aW9uKGNoYW5nZXNbJ3JvdGF0aW9uJ10uY3VycmVudFZhbHVlKTtcbiAgICB9XG4gICAgaWYgKGNoYW5nZXNbJ3NjYWxlJ10pIHtcbiAgICAgIHRoaXMuaW5zdGFuY2Uuc2V0U2NhbGUoY2hhbmdlc1snc2NhbGUnXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgICBpZiAoY2hhbmdlc1snc3JjJ10pIHtcbiAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgSWNvbih0aGlzKTtcbiAgICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRJbWFnZSh0aGlzLmluc3RhbmNlKTtcbiAgICB9XG4gICAgdGhpcy5ob3N0LnVwZGF0ZSgpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdjaGFuZ2VzIGRldGVjdGVkIGluIGFvbC1zdHlsZS1pY29uOiAnLCBjaGFuZ2VzKTtcbiAgfVxufVxuIl19