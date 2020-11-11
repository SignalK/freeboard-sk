/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Optional } from '@angular/core';
import { Fill } from 'ol/style';
import { StyleComponent } from './style.component';
import { StyleCircleComponent } from './circle.component';
import { StyleTextComponent } from './text.component';
export class StyleFillComponent {
    /**
     * @param {?} styleHost
     * @param {?} styleCircleHost
     * @param {?} styleTextHost
     */
    constructor(styleHost, styleCircleHost, styleTextHost) {
        if (!styleHost) {
            throw new Error('aol-style-stroke must be a descendant of aol-style');
        }
        if (!!styleTextHost) {
            this.host = styleTextHost;
        }
        else if (!!styleCircleHost) {
            this.host = styleCircleHost;
        }
        else {
            this.host = styleHost;
        }
        // console.log('creating aol-style-fill with: ', this);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log('creating ol.style.Fill instance with: ', this);
        this.instance = new Fill(this);
        switch (this.host.componentType) {
            case 'style':
                this.host.instance.setFill(this.instance);
                // console.log('setting ol.style instance\'s fill:', this.host);
                break;
            case 'style-text':
                this.host.instance.setFill(this.instance);
                break;
            case 'style-circle':
                this.host.fill = this.instance;
                // console.log('setting ol.style.circle instance\'s fill:', this.host);
                break;
            default:
                throw new Error('unknown host type: ' + this.host);
            // break;
        }
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (!this.instance) {
            return;
        }
        if (changes['color']) {
            this.instance.setColor(changes['color'].currentValue);
        }
        this.host.update();
        // console.log('changes detected in aol-style-fill, setting new color: ', changes);
    }
}
StyleFillComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style-fill',
                template: `
    <div class="aol-style-fill"></div>
  `
            }] }
];
/** @nocollapse */
StyleFillComponent.ctorParameters = () => [
    { type: StyleComponent, decorators: [{ type: Optional }] },
    { type: StyleCircleComponent, decorators: [{ type: Optional }] },
    { type: StyleTextComponent, decorators: [{ type: Optional }] }
];
StyleFillComponent.propDecorators = {
    color: [{ type: Input }]
};
if (false) {
    /**
     * @type {?}
     * @private
     */
    StyleFillComponent.prototype.host;
    /** @type {?} */
    StyleFillComponent.prototype.instance;
    /** @type {?} */
    StyleFillComponent.prototype.color;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsbC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9zdHlsZXMvZmlsbC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBb0MsTUFBTSxlQUFlLENBQUM7QUFDN0YsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFVdEQsTUFBTSxPQUFPLGtCQUFrQjs7Ozs7O0lBUTdCLFlBQ2MsU0FBeUIsRUFDekIsZUFBcUMsRUFDckMsYUFBaUM7UUFFN0MsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztTQUN2RTtRQUNELElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRTtZQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQztTQUMzQjthQUFNLElBQUksQ0FBQyxDQUFDLGVBQWUsRUFBRTtZQUM1QixJQUFJLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQztTQUM3QjthQUFNO1lBQ0wsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7U0FDdkI7UUFDRCx1REFBdUQ7SUFDekQsQ0FBQzs7OztJQUVELFFBQVE7UUFDTiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQy9CLEtBQUssT0FBTztnQkFDVixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMxQyxnRUFBZ0U7Z0JBQ2hFLE1BQU07WUFDUixLQUFLLFlBQVk7Z0JBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUMsTUFBTTtZQUNSLEtBQUssY0FBYztnQkFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztnQkFDL0IsdUVBQXVFO2dCQUN2RSxNQUFNO1lBQ1I7Z0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckQsU0FBUztTQUNWO0lBQ0gsQ0FBQzs7Ozs7SUFFRCxXQUFXLENBQUMsT0FBc0I7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbEIsT0FBTztTQUNSO1FBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuQixtRkFBbUY7SUFDckYsQ0FBQzs7O1lBOURGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsZ0JBQWdCO2dCQUMxQixRQUFRLEVBQUU7O0dBRVQ7YUFDRjs7OztZQVhRLGNBQWMsdUJBcUJsQixRQUFRO1lBcEJKLG9CQUFvQix1QkFxQnhCLFFBQVE7WUFwQkosa0JBQWtCLHVCQXFCdEIsUUFBUTs7O29CQU5WLEtBQUs7Ozs7Ozs7SUFITixrQ0FBNkU7O0lBQzdFLHNDQUFzQjs7SUFFdEIsbUNBQ3lCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCwgT3B0aW9uYWwsIE9uSW5pdCwgT25DaGFuZ2VzLCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBGaWxsIH0gZnJvbSAnb2wvc3R5bGUnO1xuaW1wb3J0IHsgU3R5bGVDb21wb25lbnQgfSBmcm9tICcuL3N0eWxlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTdHlsZUNpcmNsZUNvbXBvbmVudCB9IGZyb20gJy4vY2lyY2xlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTdHlsZVRleHRDb21wb25lbnQgfSBmcm9tICcuL3RleHQuY29tcG9uZW50JztcbmltcG9ydCB7IENvbG9yIH0gZnJvbSAnb2wvY29sb3InO1xuaW1wb3J0IHsgQ29sb3JMaWtlIH0gZnJvbSAnb2wvY29sb3JsaWtlJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYW9sLXN0eWxlLWZpbGwnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxkaXYgY2xhc3M9XCJhb2wtc3R5bGUtZmlsbFwiPjwvZGl2PlxuICBgLFxufSlcbmV4cG9ydCBjbGFzcyBTdHlsZUZpbGxDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcyB7XG4gIC8qIHRoZSB0eXBpbmdzIGRvIG5vdCBoYXZlIHRoZSBzZXR0ZXJzICovXG4gIHByaXZhdGUgaG9zdDogLypTdHlsZUNvbXBvbmVudHxTdHlsZUNpcmNsZUNvbXBvbmVudHxTdHlsZVRleHRDb21wb25lbnQqLyBhbnk7XG4gIHB1YmxpYyBpbnN0YW5jZTogRmlsbDtcblxuICBASW5wdXQoKVxuICBjb2xvcjogQ29sb3IgfCBDb2xvckxpa2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgQE9wdGlvbmFsKCkgc3R5bGVIb3N0OiBTdHlsZUNvbXBvbmVudCxcbiAgICBAT3B0aW9uYWwoKSBzdHlsZUNpcmNsZUhvc3Q6IFN0eWxlQ2lyY2xlQ29tcG9uZW50LFxuICAgIEBPcHRpb25hbCgpIHN0eWxlVGV4dEhvc3Q6IFN0eWxlVGV4dENvbXBvbmVudFxuICApIHtcbiAgICBpZiAoIXN0eWxlSG9zdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhb2wtc3R5bGUtc3Ryb2tlIG11c3QgYmUgYSBkZXNjZW5kYW50IG9mIGFvbC1zdHlsZScpO1xuICAgIH1cbiAgICBpZiAoISFzdHlsZVRleHRIb3N0KSB7XG4gICAgICB0aGlzLmhvc3QgPSBzdHlsZVRleHRIb3N0O1xuICAgIH0gZWxzZSBpZiAoISFzdHlsZUNpcmNsZUhvc3QpIHtcbiAgICAgIHRoaXMuaG9zdCA9IHN0eWxlQ2lyY2xlSG9zdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ob3N0ID0gc3R5bGVIb3N0O1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZygnY3JlYXRpbmcgYW9sLXN0eWxlLWZpbGwgd2l0aDogJywgdGhpcyk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnY3JlYXRpbmcgb2wuc3R5bGUuRmlsbCBpbnN0YW5jZSB3aXRoOiAnLCB0aGlzKTtcbiAgICB0aGlzLmluc3RhbmNlID0gbmV3IEZpbGwodGhpcyk7XG4gICAgc3dpdGNoICh0aGlzLmhvc3QuY29tcG9uZW50VHlwZSkge1xuICAgICAgY2FzZSAnc3R5bGUnOlxuICAgICAgICB0aGlzLmhvc3QuaW5zdGFuY2Uuc2V0RmlsbCh0aGlzLmluc3RhbmNlKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3NldHRpbmcgb2wuc3R5bGUgaW5zdGFuY2VcXCdzIGZpbGw6JywgdGhpcy5ob3N0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdHlsZS10ZXh0JzpcbiAgICAgICAgdGhpcy5ob3N0Lmluc3RhbmNlLnNldEZpbGwodGhpcy5pbnN0YW5jZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3R5bGUtY2lyY2xlJzpcbiAgICAgICAgdGhpcy5ob3N0LmZpbGwgPSB0aGlzLmluc3RhbmNlO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnc2V0dGluZyBvbC5zdHlsZS5jaXJjbGUgaW5zdGFuY2VcXCdzIGZpbGw6JywgdGhpcy5ob3N0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gaG9zdCB0eXBlOiAnICsgdGhpcy5ob3N0KTtcbiAgICAgIC8vIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNoYW5nZXNbJ2NvbG9yJ10pIHtcbiAgICAgIHRoaXMuaW5zdGFuY2Uuc2V0Q29sb3IoY2hhbmdlc1snY29sb3InXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgICB0aGlzLmhvc3QudXBkYXRlKCk7XG4gICAgLy8gY29uc29sZS5sb2coJ2NoYW5nZXMgZGV0ZWN0ZWQgaW4gYW9sLXN0eWxlLWZpbGwsIHNldHRpbmcgbmV3IGNvbG9yOiAnLCBjaGFuZ2VzKTtcbiAgfVxufVxuIl19