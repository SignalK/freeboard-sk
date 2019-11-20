/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Component, Input, Optional } from '@angular/core';
import { MapComponent } from './map.component';
import { GeometryLinestringComponent } from './geom/geometrylinestring.component';
import { GeometryPolygonComponent } from './geom/geometrypolygon.component';
import { GeometryMultiPointComponent } from './geom/geometrymultipoint.component';
import { GeometryMultiLinestringComponent } from './geom/geometrymultilinestring.component';
import { GeometryMultiPolygonComponent } from './geom/geometrymultipolygon.component';
import { transform } from 'ol/proj';
var CollectionCoordinatesComponent = /** @class */ (function () {
    function CollectionCoordinatesComponent(map, geometryLinestring, geometryPolygon, geometryMultipoint, geometryMultilinestring, geometryMultipolygon) {
        this.map = map;
        this.mapSrid = 'EPSG:3857';
        this.srid = 'EPSG:3857';
        if (!!geometryLinestring) {
            this.host = geometryLinestring;
        }
        else if (!!geometryPolygon) {
            this.host = geometryPolygon;
        }
        else if (!!geometryMultipoint) {
            this.host = geometryMultipoint;
        }
        else if (!!geometryMultilinestring) {
            this.host = geometryMultilinestring;
        }
        else if (!!geometryMultipolygon) {
            this.host = geometryMultipolygon;
        }
        else {
            throw new Error('aol-collection-coordinates must be a child of a geometry component');
        }
    }
    /**
     * @return {?}
     */
    CollectionCoordinatesComponent.prototype.ngOnInit = /**
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
    CollectionCoordinatesComponent.prototype.ngOnChanges = /**
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
    CollectionCoordinatesComponent.prototype.onMapViewChanged = /**
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
    CollectionCoordinatesComponent.prototype.transformCoordinates = /**
     * @private
     * @return {?}
     */
    function () {
        var _this = this;
        /** @type {?} */
        var transformedCoordinates;
        if (this.srid === this.mapSrid) {
            transformedCoordinates = this.coordinates;
        }
        else {
            switch (this.host.componentType) {
                case 'geometry-linestring':
                case 'geometry-multipoint':
                    transformedCoordinates = ((/** @type {?} */ (this.coordinates))).map((/**
                     * @param {?} c
                     * @return {?}
                     */
                    function (c) { return transform(c, _this.srid, _this.mapSrid); }));
                    break;
                case 'geometry-polygon':
                case 'geometry-multilinestring':
                    transformedCoordinates = ((/** @type {?} */ (this.coordinates))).map((/**
                     * @param {?} cc
                     * @return {?}
                     */
                    function (cc) {
                        return cc.map((/**
                         * @param {?} c
                         * @return {?}
                         */
                        function (c) { return transform(c, _this.srid, _this.mapSrid); }));
                    }));
                    break;
                case 'geometry-multipolygon':
                    transformedCoordinates = ((/** @type {?} */ (this.coordinates))).map((/**
                     * @param {?} ccc
                     * @return {?}
                     */
                    function (ccc) {
                        return ccc.map((/**
                         * @param {?} cc
                         * @return {?}
                         */
                        function (cc) { return cc.map((/**
                         * @param {?} c
                         * @return {?}
                         */
                        function (c) { return transform(c, _this.srid, _this.mapSrid); })); }));
                    }));
                    break;
            }
        }
        this.host.instance.setCoordinates(transformedCoordinates);
    };
    CollectionCoordinatesComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-collection-coordinates',
                    template: "\n    <div class=\"aol-collection-coordinates\"></div>\n  "
                }] }
    ];
    /** @nocollapse */
    CollectionCoordinatesComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: GeometryLinestringComponent, decorators: [{ type: Optional }] },
        { type: GeometryPolygonComponent, decorators: [{ type: Optional }] },
        { type: GeometryMultiPointComponent, decorators: [{ type: Optional }] },
        { type: GeometryMultiLinestringComponent, decorators: [{ type: Optional }] },
        { type: GeometryMultiPolygonComponent, decorators: [{ type: Optional }] }
    ]; };
    CollectionCoordinatesComponent.propDecorators = {
        coordinates: [{ type: Input }],
        srid: [{ type: Input }]
    };
    return CollectionCoordinatesComponent;
}());
export { CollectionCoordinatesComponent };
if (false) {
    /**
     * @type {?}
     * @private
     */
    CollectionCoordinatesComponent.prototype.host;
    /**
     * @type {?}
     * @private
     */
    CollectionCoordinatesComponent.prototype.mapSrid;
    /** @type {?} */
    CollectionCoordinatesComponent.prototype.coordinates;
    /** @type {?} */
    CollectionCoordinatesComponent.prototype.srid;
    /**
     * @type {?}
     * @private
     */
    CollectionCoordinatesComponent.prototype.map;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbmNvb3JkaW5hdGVzLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL25neC1vcGVubGF5ZXJzLyIsInNvdXJjZXMiOlsibGliL2NvbGxlY3Rpb25jb29yZGluYXRlcy5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFxQixRQUFRLEVBQWlCLE1BQU0sZUFBZSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV0RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRXBDO0lBZUUsd0NBQ1UsR0FBaUIsRUFDYixrQkFBK0MsRUFDL0MsZUFBeUMsRUFDekMsa0JBQStDLEVBQy9DLHVCQUF5RCxFQUN6RCxvQkFBbUQ7UUFMdkQsUUFBRyxHQUFILEdBQUcsQ0FBYztRQVJuQixZQUFPLEdBQUcsV0FBVyxDQUFDO1FBSzlCLFNBQUksR0FBRyxXQUFXLENBQUM7UUFVakIsSUFBSSxDQUFDLENBQUMsa0JBQWtCLEVBQUU7WUFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQztTQUNoQzthQUFNLElBQUksQ0FBQyxDQUFDLGVBQWUsRUFBRTtZQUM1QixJQUFJLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQztTQUM3QjthQUFNLElBQUksQ0FBQyxDQUFDLGtCQUFrQixFQUFFO1lBQy9CLElBQUks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QU8sQ0FBQyxFQUFyQyxDQUFxQyxFQUFDLEVBQWxELENBQWtELEVBQUM7b0JBQWpFLENBQWlFLEVBQ2xFLENBQUM7b0JBQ0YsTUFBTTthQUNUO1NBQ0Y7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM1RCxDQUFDOztnQkFyRkYsU0FBUyxTQUFDO29CQUNULFFBQVEsRUFBRSw0QkFBNEI7b0JBQ3RDLFFBQVEsRUFBRSw0REFFVDtpQkFDRjs7OztnQkFkUSxZQUFZO2dCQUNaLDJCQUEyQix1QkF5Qi9CLFFBQVE7Z0JBeEJKLHdCQUF3Qix1QkF5QjVCLFFBQVE7Z0JBeEJKLDJCQUEyQix1QkF5Qi9CLFFBQVE7Z0JBeEJKLGdDQUFnQyx1QkF5QnBDLFFBQVE7Z0JBeEJKLDZCQUE2Qix1QkF5QmpDLFFBQVE7Ozs4QkFYVixLQUFLO3VCQUVMLEtBQUs7O0lBMEVSLHFDQUFDO0NBQUEsQUF0RkQsSUFzRkM7U0FoRlksOEJBQThCOzs7Ozs7SUFDekMsOENBQWtCOzs7OztJQUNsQixpREFBOEI7O0lBRTlCLHFEQUM4RDs7SUFDOUQsOENBQ21COzs7OztJQUdqQiw2Q0FBeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIElucHV0LCBPbkNoYW5nZXMsIE9uSW5pdCwgT3B0aW9uYWwsIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IE1hcENvbXBvbmVudCB9IGZyb20gJy4vbWFwLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHZW9tZXRyeUxpbmVzdHJpbmdDb21wb25lbnQgfSBmcm9tICcuL2dlb20vZ2VvbWV0cnlsaW5lc3RyaW5nLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHZW9tZXRyeVBvbHlnb25Db21wb25lbnQgfSBmcm9tICcuL2dlb20vZ2VvbWV0cnlwb2x5Z29uLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHZW9tZXRyeU11bHRpUG9pbnRDb21wb25lbnQgfSBmcm9tICcuL2dlb20vZ2VvbWV0cnltdWx0aXBvaW50LmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHZW9tZXRyeU11bHRpTGluZXN0cmluZ0NvbXBvbmVudCB9IGZyb20gJy4vZ2VvbS9nZW9tZXRyeW11bHRpbGluZXN0cmluZy5jb21wb25lbnQnO1xuaW1wb3J0IHsgR2VvbWV0cnlNdWx0aVBvbHlnb25Db21wb25lbnQgfSBmcm9tICcuL2dlb20vZ2VvbWV0cnltdWx0aXBvbHlnb24uY29tcG9uZW50JztcbmltcG9ydCB7IENvb3JkaW5hdGUgfSBmcm9tICdvbC9jb29yZGluYXRlJztcbmltcG9ydCB7IHRyYW5zZm9ybSB9IGZyb20gJ29sL3Byb2onO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhb2wtY29sbGVjdGlvbi1jb29yZGluYXRlcycsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGRpdiBjbGFzcz1cImFvbC1jb2xsZWN0aW9uLWNvb3JkaW5hdGVzXCI+PC9kaXY+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIENvbGxlY3Rpb25Db29yZGluYXRlc0NvbXBvbmVudCBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25Jbml0IHtcbiAgcHJpdmF0ZSBob3N0OiBhbnk7XG4gIHByaXZhdGUgbWFwU3JpZCA9ICdFUFNHOjM4NTcnO1xuXG4gIEBJbnB1dCgpXG4gIGNvb3JkaW5hdGVzOiBDb29yZGluYXRlW10gfCBDb29yZGluYXRlW11bXSB8IENvb3JkaW5hdGVbXVtdW107XG4gIEBJbnB1dCgpXG4gIHNyaWQgPSAnRVBTRzozODU3JztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIG1hcDogTWFwQ29tcG9uZW50LFxuICAgIEBPcHRpb25hbCgpIGdlb21ldHJ5TGluZXN0cmluZzogR2VvbWV0cnlMaW5lc3RyaW5nQ29tcG9uZW50LFxuICAgIEBPcHRpb25hbCgpIGdlb21ldHJ5UG9seWdvbjogR2VvbWV0cnlQb2x5Z29uQ29tcG9uZW50LFxuICAgIEBPcHRpb25hbCgpIGdlb21ldHJ5TXVsdGlwb2ludDogR2VvbWV0cnlNdWx0aVBvaW50Q29tcG9uZW50LFxuICAgIEBPcHRpb25hbCgpIGdlb21ldHJ5TXVsdGlsaW5lc3RyaW5nOiBHZW9tZXRyeU11bHRpTGluZXN0cmluZ0NvbXBvbmVudCxcbiAgICBAT3B0aW9uYWwoKSBnZW9tZXRyeU11bHRpcG9seWdvbjogR2VvbWV0cnlNdWx0aVBvbHlnb25Db21wb25lbnRcbiAgKSB7XG4gICAgaWYgKCEhZ2VvbWV0cnlMaW5lc3RyaW5nKSB7XG4gICAgICB0aGlzLmhvc3QgPSBnZW9tZXRyeUxpbmVzdHJpbmc7XG4gICAgfSBlbHNlIGlmICghIWdlb21ldHJ5UG9seWdvbikge1xuICAgICAgdGhpcy5ob3N0ID0gZ2VvbWV0cnlQb2x5Z29uO1xuICAgIH0gZWxzZSBpZiAoISFnZW9tZXRyeU11bHRpcG9pbnQpIHtcbiAgICAgIHRoaXMuaG9zdCA9IGdlb21ldHJ5TXVsdGlwb2ludDtcbiAgICB9IGVsc2UgaWYgKCEhZ2VvbWV0cnlNdWx0aWxpbmVzdHJpbmcpIHtcbiAgICAgIHRoaXMuaG9zdCA9IGdlb21ldHJ5TXVsdGlsaW5lc3RyaW5nO1xuICAgIH0gZWxzZSBpZiAoISFnZW9tZXRyeU11bHRpcG9seWdvbikge1xuICAgICAgdGhpcy5ob3N0ID0gZ2VvbWV0cnlNdWx0aXBvbHlnb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYW9sLWNvbGxlY3Rpb24tY29vcmRpbmF0ZXMgbXVzdCBiZSBhIGNoaWxkIG9mIGEgZ2VvbWV0cnkgY29tcG9uZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5tYXAuaW5zdGFuY2Uub24oJ2NoYW5nZTp2aWV3JywgZSA9PiB0aGlzLm9uTWFwVmlld0NoYW5nZWQoZSkpO1xuICAgIHRoaXMubWFwU3JpZCA9IHRoaXMubWFwLmluc3RhbmNlXG4gICAgICAuZ2V0VmlldygpXG4gICAgICAuZ2V0UHJvamVjdGlvbigpXG4gICAgICAuZ2V0Q29kZSgpO1xuICAgIHRoaXMudHJhbnNmb3JtQ29vcmRpbmF0ZXMoKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICB0aGlzLnRyYW5zZm9ybUNvb3JkaW5hdGVzKCk7XG4gIH1cblxuICBwcml2YXRlIG9uTWFwVmlld0NoYW5nZWQoZXZlbnQpIHtcbiAgICB0aGlzLm1hcFNyaWQgPSBldmVudC50YXJnZXRcbiAgICAgIC5nZXQoZXZlbnQua2V5KVxuICAgICAgLmdldFByb2plY3Rpb24oKVxuICAgICAgLmdldENvZGUoKTtcbiAgICB0aGlzLnRyYW5zZm9ybUNvb3JkaW5hdGVzKCk7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zZm9ybUNvb3JkaW5hdGVzKCkge1xuICAgIGxldCB0cmFuc2Zvcm1lZENvb3JkaW5hdGVzOiBDb29yZGluYXRlW10gfCBDb29yZGluYXRlW11bXSB8IENvb3JkaW5hdGVbXVtdW107XG5cbiAgICBpZiAodGhpcy5zcmlkID09PSB0aGlzLm1hcFNyaWQpIHtcbiAgICAgIHRyYW5zZm9ybWVkQ29vcmRpbmF0ZXMgPSB0aGlzLmNvb3JkaW5hdGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICBzd2l0Y2ggKHRoaXMuaG9zdC5jb21wb25lbnRUeXBlKSB7XG4gICAgICAgIGNhc2UgJ2dlb21ldHJ5LWxpbmVzdHJpbmcnOlxuICAgICAgICBjYXNlICdnZW9tZXRyeS1tdWx0aXBvaW50JzpcbiAgICAgICAgICB0cmFuc2Zvcm1lZENvb3JkaW5hdGVzID0gKDxDb29yZGluYXRlW10+dGhpcy5jb29yZGluYXRlcykubWFwKGMgPT4gdHJhbnNmb3JtKGMsIHRoaXMuc3JpZCwgdGhpcy5tYXBTcmlkKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2dlb21ldHJ5LXBvbHlnb24nOlxuICAgICAgICBjYXNlICdnZW9tZXRyeS1tdWx0aWxpbmVzdHJpbmcnOlxuICAgICAgICAgIHRyYW5zZm9ybWVkQ29vcmRpbmF0ZXMgPSAoPENvb3JkaW5hdGVbXVtdPnRoaXMuY29vcmRpbmF0ZXMpLm1hcChjYyA9PlxuICAgICAgICAgICAgY2MubWFwKGMgPT4gdHJhbnNmb3JtKGMsIHRoaXMuc3JpZCwgdGhpcy5tYXBTcmlkKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdnZW9tZXRyeS1tdWx0aXBvbHlnb24nOlxuICAgICAgICAgIHRyYW5zZm9ybWVkQ29vcmRpbmF0ZXMgPSAoPENvb3JkaW5hdGVbXVtdW10+dGhpcy5jb29yZGluYXRlcykubWFwKGNjYyA9PlxuICAgICAgICAgICAgY2NjLm1hcChjYyA9PiBjYy5tYXAoYyA9PiB0cmFuc2Zvcm0oYywgdGhpcy5zcmlkLCB0aGlzLm1hcFNyaWQpKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaG9zdC5pbnN0YW5jZS5zZXRDb29yZGluYXRlcyh0cmFuc2Zvcm1lZENvb3JkaW5hdGVzKTtcbiAgfVxufVxuIl19