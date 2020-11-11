/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Optional, Input } from '@angular/core';
import { transform } from 'ol/proj';
import { MapComponent } from './map.component';
import { GeometryPointComponent } from './geom/geometrypoint.component';
import { GeometryCircleComponent } from './geom/geometrycircle.component';
import { ViewComponent } from './view.component';
import { OverlayComponent } from './overlay.component';
var CoordinateComponent = /** @class */ (function () {
    function CoordinateComponent(map, viewHost, geometryPointHost, geometryCircleHost, overlayHost) {
        this.map = map;
        this.mapSrid = 'EPSG:3857';
        this.srid = 'EPSG:3857';
        // console.log('instancing aol-coordinate');
        if (geometryPointHost !== null) {
            this.host = geometryPointHost;
        }
        else if (geometryCircleHost !== null) {
            this.host = geometryCircleHost;
        }
        else if (viewHost !== null) {
            this.host = viewHost;
        }
        else if (overlayHost !== null) {
            this.host = overlayHost;
        }
    }
    /**
     * @return {?}
     */
    CoordinateComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.map.instance.on('change:view', (/**
         * @param {?} e
         * @return {?}
         */
        function (e) { return _this.onMapViewChanged(e); }));
        this.mapSrid = this.map.instance
            .getView()
            .getProjection()
            .getCode();
        this.transformCoordinates();
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    CoordinateComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        this.transformCoordinates();
    };
    /**
     * @private
     * @param {?} event
     * @return {?}
     */
    CoordinateComponent.prototype.onMapViewChanged = /**
     * @private
     * @param {?} event
     * @return {?}
     */
    function (event) {
        this.mapSrid = event.target
            .get(event.key)
            .getProjection()
            .getCode();
        this.transformCoordinates();
    };
    /**
     * @private
     * @return {?}
     */
    CoordinateComponent.prototype.transformCoordinates = /**
     * @private
     * @return {?}
     */
    function () {
        /** @type {?} */
        var transformedCoordinates;
        if (this.srid === this.mapSrid) {
            transformedCoordinates = [this.x, this.y];
        }
        else {
            transformedCoordinates = transform([this.x, this.y], this.srid, this.mapSrid);
        }
        switch (this.host.componentType) {
            case 'geometry-point':
                this.host.instance.setCoordinates(transformedCoordinates);
                break;
            case 'geometry-circle':
            case 'view':
                this.host.instance.setCenter(transformedCoordinates);
                break;
            case 'overlay':
                this.host.instance.setPosition(transformedCoordinates);
                break;
        }
    };
    CoordinateComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-coordinate',
                    template: "\n    <div class=\"aol-coordinate\"></div>\n  "
                }] }
    ];
    /** @nocollapse */
    CoordinateComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: ViewComponent, decorators: [{ type: Optional }] },
        { type: GeometryPointComponent, decorators: [{ type: Optional }] },
        { type: GeometryCircleComponent, decorators: [{ type: Optional }] },
        { type: OverlayComponent, decorators: [{ type: Optional }] }
    ]; };
    CoordinateComponent.propDecorators = {
        x: [{ type: Input }],
        y: [{ type: Input }],
        srid: [{ type: Input }]
    };
    return CoordinateComponent;
}());
export { CoordinateComponent };
if (false) {
    /**
     * @type {?}
     * @private
     */
    CoordinateComponent.prototype.host;
    /**
     * @type {?}
     * @private
     */
    CoordinateComponent.prototype.mapSrid;
    /** @type {?} */
    CoordinateComponent.prototype.x;
    /** @type {?} */
    CoordinateComponent.prototype.y;
    /** @type {?} */
    CoordinateComponent.prototype.srid;
    /**
     * @type {?}
     * @private
     */
    CoordinateComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29vcmRpbmF0ZS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtb3BlbmxheWVycy8iLCJzb3VyY2VzIjpbImxpYi9jb29yZGluYXRlLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQWEsS0FBSyxFQUF5QixNQUFNLGVBQWUsQ0FBQztBQUM3RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdkQ7SUFpQkUsNkJBQ1UsR0FBaUIsRUFDYixRQUF1QixFQUN2QixpQkFBeUMsRUFDekMsa0JBQTJDLEVBQzNDLFdBQTZCO1FBSmpDLFFBQUcsR0FBSCxHQUFHLENBQWM7UUFWbkIsWUFBTyxHQUFHLFdBQVcsQ0FBQztRQU85QixTQUFJLEdBQUcsV0FBVyxDQUFDO1FBU2pCLDRDQUE0QztRQUM1QyxJQUFJLGlCQUFpQixLQUFLLElBQUksRUFBRTtZQUM5QixJQUFJLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDO1NBQy9CO2FBQU0sSUFBSSxrQkFBa0IsS0FBSyxJQUFJLEVBQUU7WUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQztTQUNoQzthQUFNLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtZQUM1QixJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztTQUN0QjthQUFNLElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtZQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztTQUN6QjtJQUNILENBQUM7Ozs7SUFFRCxzQ0FBUTs7O0lBQVI7UUFBQSxpQkFPQztRQU5DLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxhQUFhOzs7O1FBQUUsVUFBQSxDQUFDLElBQUksT0FBQSxLQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQXhCLENBQXdCLEVBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUTthQUM3QixPQUFPLEVBQUU7YUFDVCxhQUFhLEVBQUU7YUFDZixPQUFPLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7Ozs7O0lBRUQseUNBQVc7Ozs7SUFBWCxVQUFZLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7Ozs7OztJQUVPLDhDQUFnQjs7Ozs7SUFBeEIsVUFBeUIsS0FBSztRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNO2FBQ3hCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2FBQ2QsYUFBYSxFQUFFO2FBQ2YsT0FBTyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDOzs7OztJQUVPLGtEQUFvQjs7OztJQUE1Qjs7WUFDTSxzQkFBZ0M7UUFFcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDOUIsc0JBQXNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzQzthQUFNO1lBQ0wsc0JBQXNCLEdBQUcsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDL0U7UUFFRCxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQy9CLEtBQUssZ0JBQWdCO2dCQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDMUQsTUFBTTtZQUNSLEtBQUssaUJBQWlCLENBQUM7WUFDdkIsS0FBSyxNQUFNO2dCQUNULElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNO1lBQ1IsS0FBSyxTQUFTO2dCQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNO1NBQ1Q7SUFDSCxDQUFDOztnQkE5RUYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSxnQkFBZ0I7b0JBQzFCLFFBQVEsRUFBRSxnREFFVDtpQkFDRjs7OztnQkFYUSxZQUFZO2dCQUdaLGFBQWEsdUJBc0JqQixRQUFRO2dCQXhCSixzQkFBc0IsdUJBeUIxQixRQUFRO2dCQXhCSix1QkFBdUIsdUJBeUIzQixRQUFRO2dCQXZCSixnQkFBZ0IsdUJBd0JwQixRQUFROzs7b0JBWlYsS0FBSztvQkFFTCxLQUFLO3VCQUVMLEtBQUs7O0lBaUVSLDBCQUFDO0NBQUEsQUEvRUQsSUErRUM7U0F6RVksbUJBQW1COzs7Ozs7SUFDOUIsbUNBQWtCOzs7OztJQUNsQixzQ0FBOEI7O0lBRTlCLGdDQUNVOztJQUNWLGdDQUNVOztJQUNWLG1DQUNtQjs7Ozs7SUFHakIsa0NBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBPcHRpb25hbCwgT25DaGFuZ2VzLCBJbnB1dCwgU2ltcGxlQ2hhbmdlcywgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICdvbC9wcm9qJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHZW9tZXRyeVBvaW50Q29tcG9uZW50IH0gZnJvbSAnLi9nZW9tL2dlb21ldHJ5cG9pbnQuY29tcG9uZW50JztcbmltcG9ydCB7IEdlb21ldHJ5Q2lyY2xlQ29tcG9uZW50IH0gZnJvbSAnLi9nZW9tL2dlb21ldHJ5Y2lyY2xlLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi92aWV3LmNvbXBvbmVudCc7XG5pbXBvcnQgeyBPdmVybGF5Q29tcG9uZW50IH0gZnJvbSAnLi9vdmVybGF5LmNvbXBvbmVudCc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FvbC1jb29yZGluYXRlJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8ZGl2IGNsYXNzPVwiYW9sLWNvb3JkaW5hdGVcIj48L2Rpdj5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgQ29vcmRpbmF0ZUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25Jbml0IHtcbiAgcHJpdmF0ZSBob3N0OiBhbnk7XG4gIHByaXZhdGUgbWFwU3JpZCA9ICdFUFNHOjM4NTcnO1xuXG4gIEBJbnB1dCgpXG4gIHg6IG51bWJlcjtcbiAgQElucHV0KClcbiAgeTogbnVtYmVyO1xuICBASW5wdXQoKVxuICBzcmlkID0gJ0VQU0c6Mzg1Nyc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBtYXA6IE1hcENvbXBvbmVudCxcbiAgICBAT3B0aW9uYWwoKSB2aWV3SG9zdDogVmlld0NvbXBvbmVudCxcbiAgICBAT3B0aW9uYWwoKSBnZW9tZXRyeVBvaW50SG9zdDogR2VvbWV0cnlQb2ludENvbXBvbmVudCxcbiAgICBAT3B0aW9uYWwoKSBnZW9tZXRyeUNpcmNsZUhvc3Q6IEdlb21ldHJ5Q2lyY2xlQ29tcG9uZW50LFxuICAgIEBPcHRpb25hbCgpIG92ZXJsYXlIb3N0OiBPdmVybGF5Q29tcG9uZW50XG4gICkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdpbnN0YW5jaW5nIGFvbC1jb29yZGluYXRlJyk7XG4gICAgaWYgKGdlb21ldHJ5UG9pbnRIb3N0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmhvc3QgPSBnZW9tZXRyeVBvaW50SG9zdDtcbiAgICB9IGVsc2UgaWYgKGdlb21ldHJ5Q2lyY2xlSG9zdCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5ob3N0ID0gZ2VvbWV0cnlDaXJjbGVIb3N0O1xuICAgIH0gZWxzZSBpZiAodmlld0hvc3QgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuaG9zdCA9IHZpZXdIb3N0O1xuICAgIH0gZWxzZSBpZiAob3ZlcmxheUhvc3QgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuaG9zdCA9IG92ZXJsYXlIb3N0O1xuICAgIH1cbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIHRoaXMubWFwLmluc3RhbmNlLm9uKCdjaGFuZ2U6dmlldycsIGUgPT4gdGhpcy5vbk1hcFZpZXdDaGFuZ2VkKGUpKTtcbiAgICB0aGlzLm1hcFNyaWQgPSB0aGlzLm1hcC5pbnN0YW5jZVxuICAgICAgLmdldFZpZXcoKVxuICAgICAgLmdldFByb2plY3Rpb24oKVxuICAgICAgLmdldENvZGUoKTtcbiAgICB0aGlzLnRyYW5zZm9ybUNvb3JkaW5hdGVzKCk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgdGhpcy50cmFuc2Zvcm1Db29yZGluYXRlcygpO1xuICB9XG5cbiAgcHJpdmF0ZSBvbk1hcFZpZXdDaGFuZ2VkKGV2ZW50KSB7XG4gICAgdGhpcy5tYXBTcmlkID0gZXZlbnQudGFyZ2V0XG4gICAgICAuZ2V0KGV2ZW50LmtleSlcbiAgICAgIC5nZXRQcm9qZWN0aW9uKClcbiAgICAgIC5nZXRDb2RlKCk7XG4gICAgdGhpcy50cmFuc2Zvcm1Db29yZGluYXRlcygpO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2Zvcm1Db29yZGluYXRlcygpIHtcbiAgICBsZXQgdHJhbnNmb3JtZWRDb29yZGluYXRlczogbnVtYmVyW107XG5cbiAgICBpZiAodGhpcy5zcmlkID09PSB0aGlzLm1hcFNyaWQpIHtcbiAgICAgIHRyYW5zZm9ybWVkQ29vcmRpbmF0ZXMgPSBbdGhpcy54LCB0aGlzLnldO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cmFuc2Zvcm1lZENvb3JkaW5hdGVzID0gdHJhbnNmb3JtKFt0aGlzLngsIHRoaXMueV0sIHRoaXMuc3JpZCwgdGhpcy5tYXBTcmlkKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHRoaXMuaG9zdC5jb21wb25lbnRUeXBlKSB7XG4gICAgICBjYXNlICdnZW9tZXRyeS1wb2ludCc6XG4gICAgICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRDb29yZGluYXRlcyh0cmFuc2Zvcm1lZENvb3JkaW5hdGVzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdnZW9tZXRyeS1jaXJjbGUnOlxuICAgICAgY2FzZSAndmlldyc6XG4gICAgICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRDZW50ZXIodHJhbnNmb3JtZWRDb29yZGluYXRlcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb3ZlcmxheSc6XG4gICAgICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRQb3NpdGlvbih0cmFuc2Zvcm1lZENvb3JkaW5hdGVzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG4iXX0=