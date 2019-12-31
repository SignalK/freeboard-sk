/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Host } from '@angular/core';
import { Icon } from 'ol/style';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';
import IconOrigin from 'ol/style/IconOrigin';
import { StyleComponent } from './style.component';
var StyleIconComponent = /** @class */ (function () {
    function StyleIconComponent(host) {
        this.host = host;
    }
    /**
     * @return {?}
     */
    StyleIconComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.style.Icon instance with: ', this);
        this.instance = new Icon(this);
        this.host.instance.setImage(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    StyleIconComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
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
    };
    StyleIconComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style-icon',
                    template: "\n    <div class=\"aol-style-icon\"></div>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleIconComponent.ctorParameters = function () { return [
        { type: StyleComponent, decorators: [{ type: Host }] }
    ]; };
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
    return StyleIconComponent;
}());
export { StyleIconComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbi5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zdHlsZXMvaWNvbi5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBb0MsTUFBTSxlQUFlLENBQUM7QUFDekYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLGVBQWUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLFVBQVUsTUFBTSxxQkFBcUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFbkQ7SUE0Q0UsNEJBQTRCLElBQW9CO1FBQXBCLFNBQUksR0FBSixJQUFJLENBQWdCO0lBQUcsQ0FBQzs7OztJQUVwRCxxQ0FBUTs7O0lBQVI7UUFDRSwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzdDLENBQUM7Ozs7O0lBRUQsd0NBQVc7Ozs7SUFBWCxVQUFZLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLE9BQU87U0FDUjtRQUNELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMzRDtRQUNELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM3RDtRQUNELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUN2RDtRQUNELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM1QztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkIsZ0VBQWdFO0lBQ2xFLENBQUM7O2dCQXZFRixTQUFTLFNBQUM7b0JBQ1QsUUFBUSxFQUFFLGdCQUFnQjtvQkFDMUIsUUFBUSxFQUFFLGdEQUVUO2lCQUNGOzs7O2dCQVBRLGNBQWMsdUJBOENSLElBQUk7Ozt5QkFuQ2hCLEtBQUs7K0JBRUwsS0FBSzsrQkFFTCxLQUFLOytCQUVMLEtBQUs7d0JBRUwsS0FBSzs4QkFFTCxLQUFLO3NCQUVMLEtBQUs7eUJBRUwsS0FBSzsrQkFFTCxLQUFLOzBCQUVMLEtBQUs7d0JBRUwsS0FBSzs4QkFFTCxLQUFLO2lDQUVMLEtBQUs7MkJBRUwsS0FBSzt1QkFFTCxLQUFLOzBCQUVMLEtBQUs7c0JBRUwsS0FBSzs7SUErQlIseUJBQUM7Q0FBQSxBQXhFRCxJQXdFQztTQWxFWSxrQkFBa0I7OztJQUM3QixzQ0FBc0I7O0lBRXRCLG9DQUN5Qjs7SUFDekIsMENBQzhCOztJQUM5QiwwQ0FDOEI7O0lBQzlCLDBDQUN5Qjs7SUFDekIsbUNBQ3dDOztJQUN4Qyx5Q0FDd0I7O0lBQ3hCLGlDQUNZOztJQUNaLG9DQUN5Qjs7SUFDekIsMENBQ3lCOztJQUN6QixxQ0FDZ0I7O0lBQ2hCLG1DQUNjOztJQUNkLHlDQUNxQjs7SUFDckIsNENBQ3dCOztJQUN4QixzQ0FDaUI7O0lBQ2pCLGtDQUN1Qjs7SUFDdkIscUNBQzBCOztJQUMxQixpQ0FDWTs7Ozs7SUFFQSxrQ0FBb0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBIb3N0LCBPbkluaXQsIE9uQ2hhbmdlcywgU2ltcGxlQ2hhbmdlcyB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgSWNvbiB9IGZyb20gJ29sL3N0eWxlJztcbmltcG9ydCBJY29uQW5jaG9yVW5pdHMgZnJvbSAnb2wvc3R5bGUvSWNvbkFuY2hvclVuaXRzJztcbmltcG9ydCBJY29uT3JpZ2luIGZyb20gJ29sL3N0eWxlL0ljb25PcmlnaW4nO1xuaW1wb3J0IHsgU3R5bGVDb21wb25lbnQgfSBmcm9tICcuL3N0eWxlLmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1zdHlsZS1pY29uJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8ZGl2IGNsYXNzPVwiYW9sLXN0eWxlLWljb25cIj48L2Rpdj5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgU3R5bGVJY29uQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMge1xuICBwdWJsaWMgaW5zdGFuY2U6IEljb247XG5cbiAgQElucHV0KClcbiAgYW5jaG9yOiBbbnVtYmVyLCBudW1iZXJdO1xuICBASW5wdXQoKVxuICBhbmNob3JYVW5pdHM6IEljb25BbmNob3JVbml0cztcbiAgQElucHV0KClcbiAgYW5jaG9yWVVuaXRzOiBJY29uQW5jaG9yVW5pdHM7XG4gIEBJbnB1dCgpXG4gIGFuY2hvck9yaWdpbjogSWNvbk9yaWdpbjtcbiAgQElucHV0KClcbiAgY29sb3I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICBASW5wdXQoKVxuICBjcm9zc09yaWdpbjogSWNvbk9yaWdpbjtcbiAgQElucHV0KClcbiAgaW1nOiBzdHJpbmc7XG4gIEBJbnB1dCgpXG4gIG9mZnNldDogW251bWJlciwgbnVtYmVyXTtcbiAgQElucHV0KClcbiAgb2Zmc2V0T3JpZ2luOiBJY29uT3JpZ2luO1xuICBASW5wdXQoKVxuICBvcGFjaXR5OiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHNjYWxlOiBudW1iZXI7XG4gIEBJbnB1dCgpXG4gIHNuYXBUb1BpeGVsOiBib29sZWFuO1xuICBASW5wdXQoKVxuICByb3RhdGVXaXRoVmlldzogYm9vbGVhbjtcbiAgQElucHV0KClcbiAgcm90YXRpb246IG51bWJlcjtcbiAgQElucHV0KClcbiAgc2l6ZTogW251bWJlciwgbnVtYmVyXTtcbiAgQElucHV0KClcbiAgaW1nU2l6ZTogW251bWJlciwgbnVtYmVyXTtcbiAgQElucHV0KClcbiAgc3JjOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoQEhvc3QoKSBwcml2YXRlIGhvc3Q6IFN0eWxlQ29tcG9uZW50KSB7fVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjcmVhdGluZyBvbC5zdHlsZS5JY29uIGluc3RhbmNlIHdpdGg6ICcsIHRoaXMpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgSWNvbih0aGlzKTtcbiAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0SW1hZ2UodGhpcy5pbnN0YW5jZSk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjaGFuZ2VzWydvcGFjaXR5J10pIHtcbiAgICAgIHRoaXMuaW5zdGFuY2Uuc2V0T3BhY2l0eShjaGFuZ2VzWydvcGFjaXR5J10uY3VycmVudFZhbHVlKTtcbiAgICB9XG4gICAgaWYgKGNoYW5nZXNbJ3JvdGF0aW9uJ10pIHtcbiAgICAgIHRoaXMuaW5zdGFuY2Uuc2V0Um90YXRpb24oY2hhbmdlc1sncm90YXRpb24nXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgICBpZiAoY2hhbmdlc1snc2NhbGUnXSkge1xuICAgICAgdGhpcy5pbnN0YW5jZS5zZXRTY2FsZShjaGFuZ2VzWydzY2FsZSddLmN1cnJlbnRWYWx1ZSk7XG4gICAgfVxuICAgIGlmIChjaGFuZ2VzWydzcmMnXSkge1xuICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBJY29uKHRoaXMpO1xuICAgICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldEltYWdlKHRoaXMuaW5zdGFuY2UpO1xuICAgIH1cbiAgICB0aGlzLmhvc3QudXBkYXRlKCk7XG4gICAgLy8gY29uc29sZS5sb2coJ2NoYW5nZXMgZGV0ZWN0ZWQgaW4gYW9sLXN0eWxlLWljb246ICcsIGNoYW5nZXMpO1xuICB9XG59XG4iXX0=