import { CommonModule } from '@angular/common';
import View from 'ol/View';
import Map from 'ol/Map';
import { Group, Image, Tile, Vector, VectorTile } from 'ol/layer';
import 'ol/source/Raster';
import TileGrid from 'ol/tilegrid/TileGrid';
import 'ol/format/Feature';
import 'ol/source/Vector';
import WMTS from 'ol/tilegrid/WMTS';
import { createXYZ } from 'ol/tilegrid';
import 'ol/Tile';
import 'ol/size';
import 'ol/source/Source';
import 'ol/Image';
import { Circle, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import 'ol/color';
import 'ol/style/IconAnchorUnits';
import 'ol/style/IconOrigin';
import { Stroke, Fill, Style, Text, Circle as Circle$1, Icon } from 'ol/style';
import 'ol/control/Attribution';
import 'ol/control/Rotate';
import 'ol/control/Zoom';
import MousePosition from 'ol/control/MousePosition';
import 'ol/coordinate';
import 'ol/extent';
import { GeoJSON, MVT } from 'ol/format';
import { transform } from 'ol/proj';
import 'ol/interaction/DragBox';
import 'ol/Kinetic';
import 'ol/geom/GeometryType';
import 'ol/interaction/Draw';
import 'ol/interaction/Select';
import 'ol/events/condition';
import { defaults as defaults$1, DragPan, DragZoom, PinchZoom, MouseWheelZoom, KeyboardPan, KeyboardZoom, DoubleClickZoom, DragAndDrop, DragBox, DragRotate, DragRotateAndZoom, Draw, Select, Modify, Translate } from 'ol/interaction';
import { Graticule, VectorTile as VectorTile$1, Feature, Overlay } from 'ol';
import { defaults, Control, Attribution, FullScreen, OverviewMap, Rotate, ScaleLine, Zoom, ZoomSlider, ZoomToExtent } from 'ol/control';
import { __extends } from 'tslib';
import { Component, ElementRef, Input, Output, EventEmitter, SkipSelf, Optional, forwardRef, Host, ContentChild, ContentChildren, NgModule } from '@angular/core';
import { Raster, XYZ, OSM, BingMaps, Vector as Vector$1, Cluster, WMTS as WMTS$1, TileWMS, TileJSON, ImageStatic, ImageWMS, ImageArcGISRest, UTFGrid } from 'ol/source';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var MapComponent = /** @class */ (function () {
    function MapComponent(host) {
        this.host = host;
        this.componentType = 'map';
        this.width = '100%';
        this.height = '100%';
        // we pass empty arrays to not get default controls/interactions because we have our own directives
        this.controls = [];
        this.interactions = [];
        this.onClick = new EventEmitter();
        this.onDblClick = new EventEmitter();
        this.onMoveEnd = new EventEmitter();
        this.onPointerDrag = new EventEmitter();
        this.onPointerMove = new EventEmitter();
        this.onPostCompose = new EventEmitter();
        this.onPostRender = new EventEmitter();
        this.onPreCompose = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
        this.onSingleClick = new EventEmitter();
    }
    /**
     * @return {?}
     */
    MapComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('creating ol.Map instance with:', this);
        this.instance = new Map(this);
        this.instance.setTarget(this.host.nativeElement.firstElementChild);
        this.instance.on('click', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onClick.emit(event); }));
        this.instance.on('dblclick', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onDblClick.emit(event); }));
        this.instance.on('moveend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onMoveEnd.emit(event); }));
        this.instance.on('pointerdrag', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPointerDrag.emit(event); }));
        this.instance.on('pointermove', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPointerMove.emit(event); }));
        this.instance.on('postcompose', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPostCompose.emit(event); }));
        this.instance.on('postrender', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPostRender.emit(event); }));
        this.instance.on('precompose', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPreCompose.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.instance.on('singleclick', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onSingleClick.emit(event); }));
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    MapComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        // console.log('changes detected in aol-map, setting new properties: ', properties);
        this.instance.setProperties(properties, false);
    };
    /**
     * @return {?}
     */
    MapComponent.prototype.ngAfterViewInit = /**
     * @return {?}
     */
    function () {
        this.instance.updateSize();
    };
    MapComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-map',
                    template: "\n    <div [style.width]=\"width\" [style.height]=\"height\" tabindex=\"-1\"></div>\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    MapComponent.ctorParameters = function () { return [
        { type: ElementRef }
    ]; };
    MapComponent.propDecorators = {
        width: [{ type: Input }],
        height: [{ type: Input }],
        pixelRatio: [{ type: Input }],
        keyboardEventTarget: [{ type: Input }],
        loadTilesWhileAnimating: [{ type: Input }],
        loadTilesWhileInteracting: [{ type: Input }],
        logo: [{ type: Input }],
        renderer: [{ type: Input }],
        onClick: [{ type: Output }],
        onDblClick: [{ type: Output }],
        onMoveEnd: [{ type: Output }],
        onPointerDrag: [{ type: Output }],
        onPointerMove: [{ type: Output }],
        onPostCompose: [{ type: Output }],
        onPostRender: [{ type: Output }],
        onPreCompose: [{ type: Output }],
        onPropertyChange: [{ type: Output }],
        onSingleClick: [{ type: Output }]
    };
    return MapComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ViewComponent = /** @class */ (function () {
    function ViewComponent(host) {
        this.host = host;
        this.componentType = 'view';
        this.zoomAnimation = false;
        this.onChangeZoom = new EventEmitter();
        this.onChangeResolution = new EventEmitter();
        this.onChangeCenter = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ViewComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('creating ol.View instance with: ', this);
        this.instance = new View(this);
        this.host.instance.setView(this.instance);
        this.instance.on('change:zoom', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeZoom.emit(event); }));
        this.instance.on('change:resolution', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeResolution.emit(event); }));
        this.instance.on('change:center', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeCenter.emit(event); }));
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    ViewComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        /** @type {?} */
        var args = {};
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                switch (key) {
                    case 'rotation':
                        if (this.zoomAnimation) {
                            args[key] = changes[key].currentValue;
                        }
                        else {
                            properties[key] = changes[key].currentValue;
                        }
                        break;
                    case 'zoom':
                        /** Work-around: setting the zoom via setProperties does not work. */
                        if (this.zoomAnimation) {
                            args[key] = changes[key].currentValue;
                        }
                        else {
                            this.instance.setZoom(changes[key].currentValue);
                        }
                        break;
                    case 'projection':
                        this.instance = new View(this);
                        this.host.instance.setView(this.instance);
                        break;
                    default:
                        properties[key] = changes[key].currentValue;
                        break;
                }
                if (this.zoomAnimation && (typeof args['zoom'] !== 'undefined' ||
                    typeof args['rotation'] !== 'undefined')) {
                    this.instance.animate(args);
                }
            }
        }
        //console.log('changes detected in aol-view, setting new properties: ', properties);
        this.instance.setProperties(properties, false);
    };
    /**
     * @return {?}
     */
    ViewComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-view');
    };
    ViewComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-view',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ViewComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ViewComponent.propDecorators = {
        constrainRotation: [{ type: Input }],
        enableRotation: [{ type: Input }],
        extent: [{ type: Input }],
        maxResolution: [{ type: Input }],
        minResolution: [{ type: Input }],
        maxZoom: [{ type: Input }],
        minZoom: [{ type: Input }],
        resolution: [{ type: Input }],
        resolutions: [{ type: Input }],
        rotation: [{ type: Input }],
        zoom: [{ type: Input }],
        zoomFactor: [{ type: Input }],
        center: [{ type: Input }],
        projection: [{ type: Input }],
        zoomAnimation: [{ type: Input }],
        onChangeZoom: [{ type: Output }],
        onChangeResolution: [{ type: Output }],
        onChangeCenter: [{ type: Output }]
    };
    return ViewComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GraticuleComponent = /** @class */ (function () {
    function GraticuleComponent(map) {
        this.map = map;
        this.componentType = 'graticule';
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    GraticuleComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        if (properties) {
            this.instance = new Graticule(properties);
        }
        this.instance.setMap(this.map.instance);
    };
    /**
     * @return {?}
     */
    GraticuleComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Graticule({
            strokeStyle: this.strokeStyle,
            showLabels: this.showLabels,
            lonLabelPosition: this.lonLabelPosition,
            latLabelPosition: this.latLabelPosition,
        });
        this.instance.setMap(this.map.instance);
    };
    /**
     * @return {?}
     */
    GraticuleComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.instance.setMap(null);
    };
    GraticuleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-graticule',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    GraticuleComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    GraticuleComponent.propDecorators = {
        strokeStyle: [{ type: Input }],
        showLabels: [{ type: Input }],
        lonLabelPosition: [{ type: Input }],
        latLabelPosition: [{ type: Input }]
    };
    return GraticuleComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @abstract
 */
var LayerComponent = /** @class */ (function () {
    function LayerComponent(host) {
        this.host = host;
        this.componentType = 'layer';
    }
    /**
     * @return {?}
     */
    LayerComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        if (this.precompose !== null && this.precompose !== undefined) {
            this.instance.on('precompose', this.precompose);
        }
        if (this.postcompose !== null && this.postcompose !== undefined) {
            this.instance.on('postcompose', this.postcompose);
        }
        this.host.instance.getLayers().push(this.instance);
    };
    /**
     * @return {?}
     */
    LayerComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.host.instance.getLayers().remove(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
                if (key === 'precompose') {
                    this.instance.un('precompose', changes[key].previousValue);
                    this.instance.on('precompose', changes[key].currentValue);
                }
                if (key === 'postcompose') {
                    this.instance.un('postcompose', changes[key].previousValue);
                    this.instance.on('postcompose', changes[key].currentValue);
                }
            }
        }
        // console.log('changes detected in aol-layer, setting new properties: ', properties);
        this.instance.setProperties(properties, false);
    };
    LayerComponent.propDecorators = {
        opacity: [{ type: Input }],
        visible: [{ type: Input }],
        extent: [{ type: Input }],
        zIndex: [{ type: Input }],
        minResolution: [{ type: Input }],
        maxResolution: [{ type: Input }],
        precompose: [{ type: Input }],
        postcompose: [{ type: Input }]
    };
    return LayerComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var LayerGroupComponent = /** @class */ (function (_super) {
    __extends(LayerGroupComponent, _super);
    function LayerGroupComponent(map, group) {
        return _super.call(this, group || map) || this;
    }
    /**
     * @return {?}
     */
    LayerGroupComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log(`creating ol.layer.Group instance with:`, this);
        this.instance = new Group(this);
        _super.prototype.ngOnInit.call(this);
    };
    LayerGroupComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-layer-group',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    LayerGroupComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: LayerGroupComponent, decorators: [{ type: SkipSelf }, { type: Optional }] }
    ]; };
    return LayerGroupComponent;
}(LayerComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var LayerImageComponent = /** @class */ (function (_super) {
    __extends(LayerImageComponent, _super);
    function LayerImageComponent(map, group) {
        return _super.call(this, group || map) || this;
    }
    /**
     * @return {?}
     */
    LayerImageComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Image(this);
        _super.prototype.ngOnInit.call(this);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerImageComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        _super.prototype.ngOnChanges.call(this, changes);
    };
    LayerImageComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-layer-image',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    LayerImageComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: LayerGroupComponent, decorators: [{ type: Optional }] }
    ]; };
    LayerImageComponent.propDecorators = {
        opacity: [{ type: Input }],
        visible: [{ type: Input }],
        extent: [{ type: Input }],
        minResolution: [{ type: Input }],
        maxResolution: [{ type: Input }],
        zIndex: [{ type: Input }]
    };
    return LayerImageComponent;
}(LayerComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var LayerTileComponent = /** @class */ (function (_super) {
    __extends(LayerTileComponent, _super);
    function LayerTileComponent(map, group) {
        return _super.call(this, group || map) || this;
    }
    /**
     * @return {?}
     */
    LayerTileComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.layer.Tile instance with:', this);
        this.instance = new Tile(this);
        _super.prototype.ngOnInit.call(this);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerTileComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        _super.prototype.ngOnChanges.call(this, changes);
    };
    LayerTileComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-layer-tile',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    LayerTileComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: LayerGroupComponent, decorators: [{ type: Optional }] }
    ]; };
    LayerTileComponent.propDecorators = {
        preload: [{ type: Input }],
        useInterimTilesOnError: [{ type: Input }]
    };
    return LayerTileComponent;
}(LayerComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var LayerVectorComponent = /** @class */ (function (_super) {
    __extends(LayerVectorComponent, _super);
    function LayerVectorComponent(map, group) {
        return _super.call(this, group || map) || this;
    }
    /**
     * @return {?}
     */
    LayerVectorComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.layer.Vector instance with:', this);
        this.instance = new Vector(this);
        _super.prototype.ngOnInit.call(this);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerVectorComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        _super.prototype.ngOnChanges.call(this, changes);
    };
    LayerVectorComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-layer-vector',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    LayerVectorComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: LayerGroupComponent, decorators: [{ type: Optional }] }
    ]; };
    LayerVectorComponent.propDecorators = {
        renderBuffer: [{ type: Input }],
        style: [{ type: Input }],
        updateWhileAnimating: [{ type: Input }],
        updateWhileInteracting: [{ type: Input }]
    };
    return LayerVectorComponent;
}(LayerComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var LayerVectorTileComponent = /** @class */ (function (_super) {
    __extends(LayerVectorTileComponent, _super);
    function LayerVectorTileComponent(map, group) {
        return _super.call(this, group || map) || this;
    }
    /**
     * @return {?}
     */
    LayerVectorTileComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.layer.VectorTile instance with:', this);
        this.instance = new VectorTile(this);
        _super.prototype.ngOnInit.call(this);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    LayerVectorTileComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        _super.prototype.ngOnChanges.call(this, changes);
    };
    LayerVectorTileComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-layer-vectortile',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    LayerVectorTileComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: LayerGroupComponent, decorators: [{ type: Optional }] }
    ]; };
    LayerVectorTileComponent.propDecorators = {
        renderBuffer: [{ type: Input }],
        renderMode: [{ type: Input }],
        renderOrder: [{ type: Input }],
        style: [{ type: Input }],
        updateWhileAnimating: [{ type: Input }],
        updateWhileInteracting: [{ type: Input }],
        visible: [{ type: Input }]
    };
    return LayerVectorTileComponent;
}(LayerComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceComponent = /** @class */ (function () {
    function SourceComponent(host, raster) {
        this.host = host;
        this.raster = raster;
        this.componentType = 'source';
    }
    /**
     * @return {?}
     */
    SourceComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        if (this.host && this.host.instance) {
            this.host.instance.setSource(null);
        }
        if (this.raster) {
            this.raster.sources = [];
        }
    };
    /**
     * @protected
     * @param {?} s
     * @return {?}
     */
    SourceComponent.prototype._register = /**
     * @protected
     * @param {?} s
     * @return {?}
     */
    function (s) {
        if (this.host) {
            this.host.instance.setSource(s);
        }
        if (this.raster) {
            this.raster.sources = [s];
            this.raster.init();
        }
    };
    SourceComponent.propDecorators = {
        attributions: [{ type: Input }]
    };
    return SourceComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var TileGridComponent = /** @class */ (function () {
    function TileGridComponent() {
    }
    /**
     * @return {?}
     */
    TileGridComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        if (!this.resolutions) {
            this.instance = createXYZ(this);
        }
        else {
            this.instance = new TileGrid(this);
        }
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    TileGridComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (!this.resolutions) {
            this.instance = createXYZ(this);
        }
        else {
            this.instance = new TileGrid(this);
        }
    };
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
    return TileGridComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceRasterComponent = /** @class */ (function (_super) {
    __extends(SourceRasterComponent, _super);
    function SourceRasterComponent(layer) {
        var _this = _super.call(this, layer) || this;
        _this.beforeOperations = new EventEmitter();
        _this.afterOperations = new EventEmitter();
        _this.sources = [];
        return _this;
    }
    /**
     * @return {?}
     */
    SourceRasterComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        this.init();
    };
    /**
     * @return {?}
     */
    SourceRasterComponent.prototype.init = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Raster(this);
        this.instance.on('beforeoperations', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.beforeOperations.emit(event); }));
        this.instance.on('afteroperations', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.afterOperations.emit(event); }));
        this._register(this.instance);
    };
    SourceRasterComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-raster',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [
                        {
                            provide: SourceComponent,
                            useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceRasterComponent; })),
                        },
                    ]
                }] }
    ];
    /** @nocollapse */
    SourceRasterComponent.ctorParameters = function () { return [
        { type: LayerImageComponent, decorators: [{ type: Host }] }
    ]; };
    SourceRasterComponent.propDecorators = {
        operation: [{ type: Input }],
        threads: [{ type: Input }],
        lib: [{ type: Input }],
        operationType: [{ type: Input }],
        beforeOperations: [{ type: Output }],
        afterOperations: [{ type: Output }]
    };
    return SourceRasterComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceXYZComponent = /** @class */ (function (_super) {
    __extends(SourceXYZComponent, _super);
    function SourceXYZComponent(layer, raster) {
        var _this = _super.call(this, layer, raster) || this;
        _this.tileLoadStart = new EventEmitter();
        _this.tileLoadEnd = new EventEmitter();
        _this.tileLoadError = new EventEmitter();
        return _this;
    }
    /**
     * @return {?}
     */
    SourceXYZComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        if (this.tileGridXYZ) {
            this.tileGrid = this.tileGridXYZ.instance;
        }
        this.init();
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceXYZComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        this.instance.setProperties(properties, false);
        if (changes.hasOwnProperty('url')) {
            this.init();
        }
    };
    /**
     * @return {?}
     */
    SourceXYZComponent.prototype.init = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new XYZ(this);
        this.instance.on('tileloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.tileLoadStart.emit(event); }));
        this.instance.on('tileloadend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.tileLoadEnd.emit(event); }));
        this.instance.on('tileloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.tileLoadError.emit(event); }));
        this._register(this.instance);
    };
    SourceXYZComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-xyz',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceXYZComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceXYZComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Optional }, { type: Host }] },
        { type: SourceRasterComponent, decorators: [{ type: Optional }, { type: Host }] }
    ]; };
    SourceXYZComponent.propDecorators = {
        cacheSize: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        opaque: [{ type: Input }],
        projection: [{ type: Input }],
        reprojectionErrorThreshold: [{ type: Input }],
        minZoom: [{ type: Input }],
        maxZoom: [{ type: Input }],
        tileGrid: [{ type: Input }],
        tileLoadFunction: [{ type: Input }],
        tilePixelRatio: [{ type: Input }],
        tileSize: [{ type: Input }],
        tileUrlFunction: [{ type: Input }],
        url: [{ type: Input }],
        urls: [{ type: Input }],
        wrapX: [{ type: Input }],
        tileGridXYZ: [{ type: ContentChild, args: [TileGridComponent,] }],
        tileLoadStart: [{ type: Output }],
        tileLoadEnd: [{ type: Output }],
        tileLoadError: [{ type: Output }]
    };
    return SourceXYZComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceOsmComponent = /** @class */ (function (_super) {
    __extends(SourceOsmComponent, _super);
    function SourceOsmComponent(layer, raster) {
        var _this = _super.call(this, layer, raster) || this;
        _this.tileLoadStart = new EventEmitter();
        _this.tileLoadEnd = new EventEmitter();
        _this.tileLoadError = new EventEmitter();
        return _this;
    }
    /**
     * @return {?}
     */
    SourceOsmComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        if (this.tileGridXYZ) {
            this.tileGrid = this.tileGridXYZ.instance;
        }
        this.instance = new OSM(this);
        this.instance.on('tileloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.tileLoadStart.emit(event); }));
        this.instance.on('tileloadend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.tileLoadEnd.emit(event); }));
        this.instance.on('tileloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.tileLoadError.emit(event); }));
        this._register(this.instance);
    };
    SourceOsmComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-osm',
                    template: "\n    <div class=\"aol-source-osm\"></div>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceOsmComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceOsmComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }, { type: Optional }] },
        { type: SourceRasterComponent, decorators: [{ type: Host }, { type: Optional }] }
    ]; };
    SourceOsmComponent.propDecorators = {
        attributions: [{ type: Input }],
        cacheSize: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        maxZoom: [{ type: Input }],
        opaque: [{ type: Input }],
        reprojectionErrorThreshold: [{ type: Input }],
        tileLoadFunction: [{ type: Input }],
        url: [{ type: Input }],
        wrapX: [{ type: Input }],
        tileLoadStart: [{ type: Output }],
        tileLoadEnd: [{ type: Output }],
        tileLoadError: [{ type: Output }]
    };
    return SourceOsmComponent;
}(SourceXYZComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceBingmapsComponent = /** @class */ (function (_super) {
    __extends(SourceBingmapsComponent, _super);
    function SourceBingmapsComponent(layer) {
        var _this = _super.call(this, layer) || this;
        _this.imagerySet = 'Aerial';
        return _this;
    }
    /**
     * @return {?}
     */
    SourceBingmapsComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new BingMaps(this);
        this.host.instance.setSource(this.instance);
    };
    SourceBingmapsComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-bingmaps',
                    template: "\n    <div class=\"aol-source-bingmaps\"></div>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceBingmapsComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceBingmapsComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceBingmapsComponent.propDecorators = {
        cacheSize: [{ type: Input }],
        hidpi: [{ type: Input }],
        culture: [{ type: Input }],
        key: [{ type: Input }],
        imagerySet: [{ type: Input }],
        maxZoom: [{ type: Input }],
        reprojectionErrorThreshold: [{ type: Input }],
        tileLoadFunction: [{ type: Input }],
        wrapX: [{ type: Input }]
    };
    return SourceBingmapsComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceVectorComponent = /** @class */ (function (_super) {
    __extends(SourceVectorComponent, _super);
    function SourceVectorComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceVectorComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Vector$1(this);
        this.host.instance.setSource(this.instance);
    };
    SourceVectorComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-vector',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceVectorComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceVectorComponent.ctorParameters = function () { return [
        { type: LayerVectorComponent, decorators: [{ type: Host }] }
    ]; };
    SourceVectorComponent.propDecorators = {
        overlaps: [{ type: Input }],
        useSpatialIndex: [{ type: Input }],
        wrapX: [{ type: Input }],
        url: [{ type: Input }],
        format: [{ type: Input }],
        strategy: [{ type: Input }]
    };
    return SourceVectorComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceClusterComponent = /** @class */ (function (_super) {
    __extends(SourceClusterComponent, _super);
    function SourceClusterComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceClusterComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        this.source = this.sourceVectorComponent.instance;
        this.instance = new Cluster(this);
        this.host.instance.setSource(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceClusterComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance && changes.hasOwnProperty('distance')) {
            this.instance.setDistance(this.distance);
        }
    };
    SourceClusterComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-cluster',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceClusterComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceClusterComponent.ctorParameters = function () { return [
        { type: LayerVectorComponent, decorators: [{ type: Host }] }
    ]; };
    SourceClusterComponent.propDecorators = {
        distance: [{ type: Input }],
        geometryFunction: [{ type: Input }],
        wrapX: [{ type: Input }],
        sourceVectorComponent: [{ type: ContentChild, args: [SourceVectorComponent,] }]
    };
    return SourceClusterComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var TileGridWMTSComponent = /** @class */ (function (_super) {
    __extends(TileGridWMTSComponent, _super);
    function TileGridWMTSComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * @return {?}
     */
    TileGridWMTSComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new WMTS(this);
    };
    TileGridWMTSComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-tilegrid-wmts',
                    template: ''
                }] }
    ];
    TileGridWMTSComponent.propDecorators = {
        origin: [{ type: Input }],
        origins: [{ type: Input }],
        resolutions: [{ type: Input }],
        matrixIds: [{ type: Input }],
        sizes: [{ type: Input }],
        tileSizes: [{ type: Input }],
        widths: [{ type: Input }]
    };
    return TileGridWMTSComponent;
}(TileGridComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceTileWMTSComponent = /** @class */ (function (_super) {
    __extends(SourceTileWMTSComponent, _super);
    function SourceTileWMTSComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceTileWMTSComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                switch (key) {
                    case 'url':
                        this.url = changes[key].currentValue;
                        this.setLayerSource();
                        break;
                    default:
                        break;
                }
                properties[key] = changes[key].currentValue;
            }
        }
        this.instance.setProperties(properties, false);
    };
    /**
     * @return {?}
     */
    SourceTileWMTSComponent.prototype.setLayerSource = /**
     * @return {?}
     */
    function () {
        this.instance = new WMTS$1(this);
        this.host.instance.setSource(this.instance);
    };
    /**
     * @return {?}
     */
    SourceTileWMTSComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        if (this.tileGridWMTS) {
            this.tileGrid = this.tileGridWMTS.instance;
            this.setLayerSource();
        }
    };
    SourceTileWMTSComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-tilewmts',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceTileWMTSComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceTileWMTSComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceTileWMTSComponent.propDecorators = {
        cacheSize: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        tileGrid: [{ type: Input }],
        projection: [{ type: Input }],
        reprojectionErrorThreshold: [{ type: Input }],
        requestEncoding: [{ type: Input }],
        layer: [{ type: Input }],
        style: [{ type: Input }],
        tileClass: [{ type: Input }],
        tilePixelRatio: [{ type: Input }],
        version: [{ type: Input }],
        format: [{ type: Input }],
        matrixSet: [{ type: Input }],
        dimensions: [{ type: Input }],
        url: [{ type: Input }],
        tileLoadFunction: [{ type: Input }],
        urls: [{ type: Input }],
        wrapX: [{ type: Input }],
        tileGridWMTS: [{ type: ContentChild, args: [TileGridWMTSComponent,] }]
    };
    return SourceTileWMTSComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var FormatComponent = /** @class */ (function () {
    function FormatComponent() {
        this.componentType = 'format';
    }
    return FormatComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceVectorTileComponent = /** @class */ (function (_super) {
    __extends(SourceVectorTileComponent, _super);
    function SourceVectorTileComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /* need the children to construct the OL3 object */
    /* need the children to construct the OL3 object */
    /**
     * @return {?}
     */
    SourceVectorTileComponent.prototype.ngAfterContentInit = /* need the children to construct the OL3 object */
    /**
     * @return {?}
     */
    function () {
        this.format = this.formatComponent.instance;
        this.tileGrid = this.tileGridComponent.instance;
        // console.log('creating ol.source.VectorTile instance with:', this);
        this.instance = new VectorTile$1(this);
        this.host.instance.setSource(this.instance);
    };
    SourceVectorTileComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-vectortile',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceVectorTileComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceVectorTileComponent.ctorParameters = function () { return [
        { type: LayerVectorTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceVectorTileComponent.propDecorators = {
        cacheSize: [{ type: Input }],
        overlaps: [{ type: Input }],
        projection: [{ type: Input }],
        tilePixelRatio: [{ type: Input }],
        tileUrlFunction: [{ type: Input }],
        url: [{ type: Input }],
        urls: [{ type: Input }],
        wrapX: [{ type: Input }],
        formatComponent: [{ type: ContentChild, args: [FormatComponent,] }],
        tileGridComponent: [{ type: ContentChild, args: [TileGridComponent,] }]
    };
    return SourceVectorTileComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceTileWMSComponent = /** @class */ (function (_super) {
    __extends(SourceTileWMSComponent, _super);
    function SourceTileWMSComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceTileWMSComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new TileWMS(this);
        this.host.instance.setSource(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceTileWMSComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    };
    SourceTileWMSComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-tilewms',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceTileWMSComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceTileWMSComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceTileWMSComponent.propDecorators = {
        cacheSize: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        gutter: [{ type: Input }],
        hidpi: [{ type: Input }],
        params: [{ type: Input }],
        projection: [{ type: Input }],
        reprojectionErrorThreshold: [{ type: Input }],
        serverType: [{ type: Input }],
        tileGrid: [{ type: Input }],
        tileLoadFunction: [{ type: Input }],
        url: [{ type: Input }],
        urls: [{ type: Input }],
        wrapX: [{ type: Input }]
    };
    return SourceTileWMSComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceTileJSONComponent = /** @class */ (function (_super) {
    __extends(SourceTileJSONComponent, _super);
    function SourceTileJSONComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceTileJSONComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new TileJSON(this);
        this.host.instance.setSource(this.instance);
    };
    SourceTileJSONComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-tilejson',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceTileJSONComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceTileJSONComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceTileJSONComponent.propDecorators = {
        url: [{ type: Input }]
    };
    return SourceTileJSONComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceGeoJSONComponent = /** @class */ (function (_super) {
    __extends(SourceGeoJSONComponent, _super);
    function SourceGeoJSONComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceGeoJSONComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.format = new GeoJSON(this);
        this.instance = new Vector$1(this);
        this.host.instance.setSource(this.instance);
    };
    SourceGeoJSONComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-geojson',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceGeoJSONComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceGeoJSONComponent.ctorParameters = function () { return [
        { type: LayerVectorComponent, decorators: [{ type: Host }] }
    ]; };
    SourceGeoJSONComponent.propDecorators = {
        defaultDataProjection: [{ type: Input }],
        featureProjection: [{ type: Input }],
        geometryName: [{ type: Input }],
        url: [{ type: Input }]
    };
    return SourceGeoJSONComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceImageStaticComponent = /** @class */ (function (_super) {
    __extends(SourceImageStaticComponent, _super);
    function SourceImageStaticComponent(layer) {
        var _this = _super.call(this, layer) || this;
        _this.onImageLoadStart = new EventEmitter();
        _this.onImageLoadEnd = new EventEmitter();
        _this.onImageLoadError = new EventEmitter();
        return _this;
    }
    /**
     * @return {?}
     */
    SourceImageStaticComponent.prototype.setLayerSource = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new ImageStatic(this);
        this.host.instance.setSource(this.instance);
        this.instance.on('imageloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadStart.emit(event); }));
        this.instance.on('imageloadend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadEnd.emit(event); }));
        this.instance.on('imageloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadError.emit(event); }));
    };
    /**
     * @return {?}
     */
    SourceImageStaticComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.setLayerSource();
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceImageStaticComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        /** @type {?} */
        var properties = {};
        if (!this.instance) {
            return;
        }
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                switch (key) {
                    case 'url':
                        this.url = changes[key].currentValue;
                        this.setLayerSource();
                        break;
                    default:
                        break;
                }
                properties[key] = changes[key].currentValue;
            }
        }
        this.instance.setProperties(properties, false);
    };
    SourceImageStaticComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-imagestatic',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceImageStaticComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceImageStaticComponent.ctorParameters = function () { return [
        { type: LayerImageComponent, decorators: [{ type: Host }] }
    ]; };
    SourceImageStaticComponent.propDecorators = {
        projection: [{ type: Input }],
        imageExtent: [{ type: Input }],
        url: [{ type: Input }],
        attributions: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        imageLoadFunction: [{ type: Input }],
        imageSize: [{ type: Input }],
        onImageLoadStart: [{ type: Output }],
        onImageLoadEnd: [{ type: Output }],
        onImageLoadError: [{ type: Output }]
    };
    return SourceImageStaticComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceImageWMSComponent = /** @class */ (function (_super) {
    __extends(SourceImageWMSComponent, _super);
    function SourceImageWMSComponent(layer) {
        var _this = _super.call(this, layer) || this;
        _this.onImageLoadStart = new EventEmitter();
        _this.onImageLoadEnd = new EventEmitter();
        _this.onImageLoadError = new EventEmitter();
        return _this;
    }
    /**
     * @return {?}
     */
    SourceImageWMSComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new ImageWMS(this);
        this.host.instance.setSource(this.instance);
        this.instance.on('imageloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadStart.emit(event); }));
        this.instance.on('imageloadend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadEnd.emit(event); }));
        this.instance.on('imageloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadError.emit(event); }));
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceImageWMSComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    };
    SourceImageWMSComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-imagewms',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceImageWMSComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceImageWMSComponent.ctorParameters = function () { return [
        { type: LayerImageComponent, decorators: [{ type: Host }] }
    ]; };
    SourceImageWMSComponent.propDecorators = {
        attributions: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        hidpi: [{ type: Input }],
        serverType: [{ type: Input }],
        imageLoadFunction: [{ type: Input }],
        params: [{ type: Input }],
        projection: [{ type: Input }],
        ratio: [{ type: Input }],
        resolutions: [{ type: Input }],
        url: [{ type: Input }],
        onImageLoadStart: [{ type: Output }],
        onImageLoadEnd: [{ type: Output }],
        onImageLoadError: [{ type: Output }]
    };
    return SourceImageWMSComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceImageArcGISRestComponent = /** @class */ (function (_super) {
    __extends(SourceImageArcGISRestComponent, _super);
    function SourceImageArcGISRestComponent(layer) {
        var _this = _super.call(this, layer) || this;
        _this.ratio = 1.5;
        _this.onImageLoadStart = new EventEmitter();
        _this.onImageLoadEnd = new EventEmitter();
        _this.onImageLoadError = new EventEmitter();
        return _this;
    }
    /**
     * @return {?}
     */
    SourceImageArcGISRestComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new ImageArcGISRest(this);
        this.host.instance.setSource(this.instance);
        this.instance.on('imageloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadStart.emit(event); }));
        this.instance.on('imageloadend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadEnd.emit(event); }));
        this.instance.on('imageloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onImageLoadError.emit(event); }));
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    SourceImageArcGISRestComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    };
    SourceImageArcGISRestComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-imagearcgisrest',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceImageArcGISRestComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceImageArcGISRestComponent.ctorParameters = function () { return [
        { type: LayerImageComponent, decorators: [{ type: Host }] }
    ]; };
    SourceImageArcGISRestComponent.propDecorators = {
        projection: [{ type: Input }],
        url: [{ type: Input }],
        attributions: [{ type: Input }],
        crossOrigin: [{ type: Input }],
        imageLoadFunction: [{ type: Input }],
        params: [{ type: Input }],
        ratio: [{ type: Input }],
        resolutions: [{ type: Input }],
        wrapX: [{ type: Input }],
        onImageLoadStart: [{ type: Output }],
        onImageLoadEnd: [{ type: Output }],
        onImageLoadError: [{ type: Output }]
    };
    return SourceImageArcGISRestComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var FeatureComponent = /** @class */ (function () {
    function FeatureComponent(host) {
        this.host = host;
        this.componentType = 'feature';
    }
    /**
     * @return {?}
     */
    FeatureComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Feature();
        if (this.id !== undefined) {
            this.instance.setId(this.id);
        }
        this.host.instance.addFeature(this.instance);
    };
    /**
     * @return {?}
     */
    FeatureComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.host.instance.removeFeature(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    FeatureComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance) {
            this.instance.setId(this.id);
        }
    };
    FeatureComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-feature',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    FeatureComponent.ctorParameters = function () { return [
        { type: SourceVectorComponent }
    ]; };
    FeatureComponent.propDecorators = {
        id: [{ type: Input }]
    };
    return FeatureComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @abstract
 */
var SimpleGeometryComponent = /** @class */ (function () {
    function SimpleGeometryComponent(map, host) {
        this.map = map;
        this.host = host;
        this.componentType = 'simple-geometry';
    }
    /**
     * @return {?}
     */
    SimpleGeometryComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.host.instance.setGeometry(this.instance);
    };
    SimpleGeometryComponent.propDecorators = {
        srid: [{ type: Input }]
    };
    return SimpleGeometryComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryCircleComponent = /** @class */ (function (_super) {
    __extends(GeometryCircleComponent, _super);
    function GeometryCircleComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-circle';
        // defaulting coordinates to [0,0]. To be overridden in child component.
        _this.instance = new Circle([0, 0]);
        return _this;
    }
    Object.defineProperty(GeometryCircleComponent.prototype, "radius", {
        get: /**
         * @return {?}
         */
        function () {
            return this.instance.getRadius();
        },
        set: /**
         * @param {?} radius
         * @return {?}
         */
        function (radius) {
            this.instance.setRadius(radius);
        },
        enumerable: true,
        configurable: true
    });
    GeometryCircleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-circle',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryCircleComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    GeometryCircleComponent.propDecorators = {
        radius: [{ type: Input }]
    };
    return GeometryCircleComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryLinestringComponent = /** @class */ (function (_super) {
    __extends(GeometryLinestringComponent, _super);
    function GeometryLinestringComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-linestring';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryLinestringComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new LineString([[0, 0], [1, 1]]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryLinestringComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-linestring',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryLinestringComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryLinestringComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryMultiLinestringComponent = /** @class */ (function (_super) {
    __extends(GeometryMultiLinestringComponent, _super);
    function GeometryMultiLinestringComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-multilinestring';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryMultiLinestringComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new MultiLineString([[[0, 0], [1, 1]]]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryMultiLinestringComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-multilinestring',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryMultiLinestringComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryMultiLinestringComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryMultiPointComponent = /** @class */ (function (_super) {
    __extends(GeometryMultiPointComponent, _super);
    function GeometryMultiPointComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-multipoint';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryMultiPointComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new MultiPoint([[0, 0], [1, 1]]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryMultiPointComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-multipoint',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryMultiPointComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryMultiPointComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryMultiPolygonComponent = /** @class */ (function (_super) {
    __extends(GeometryMultiPolygonComponent, _super);
    function GeometryMultiPolygonComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-multipolygon';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryMultiPolygonComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new MultiPolygon([[[[0, 0], [1, 1], [0, 1]]]]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryMultiPolygonComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-multipolygon',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryMultiPolygonComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryMultiPolygonComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryPointComponent = /** @class */ (function (_super) {
    __extends(GeometryPointComponent, _super);
    function GeometryPointComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-point';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryPointComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Point([0, 0]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryPointComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-point',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryPointComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryPointComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var GeometryPolygonComponent = /** @class */ (function (_super) {
    __extends(GeometryPolygonComponent, _super);
    function GeometryPolygonComponent(map, host) {
        var _this = _super.call(this, map, host) || this;
        _this.componentType = 'geometry-polygon';
        return _this;
    }
    /**
     * @return {?}
     */
    GeometryPolygonComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Polygon([[[0, 0], [1, 1], [0, 1]]]);
        _super.prototype.ngOnInit.call(this);
    };
    GeometryPolygonComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-geometry-polygon',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    GeometryPolygonComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: FeatureComponent }
    ]; };
    return GeometryPolygonComponent;
}(SimpleGeometryComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ContentComponent = /** @class */ (function () {
    function ContentComponent(elementRef) {
        this.elementRef = elementRef;
    }
    ContentComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-content',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    ContentComponent.ctorParameters = function () { return [
        { type: ElementRef }
    ]; };
    return ContentComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var OverlayComponent = /** @class */ (function () {
    function OverlayComponent(map) {
        this.map = map;
        this.componentType = 'overlay';
    }
    /**
     * @return {?}
     */
    OverlayComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        if (this.content) {
            this.element = this.content.elementRef.nativeElement;
            this.instance = new Overlay(this);
            this.map.instance.addOverlay(this.instance);
        }
    };
    /**
     * @return {?}
     */
    OverlayComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        if (this.instance) {
            this.map.instance.removeOverlay(this.instance);
        }
    };
    OverlayComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-overlay',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    OverlayComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    OverlayComponent.propDecorators = {
        content: [{ type: ContentChild, args: [ContentComponent,] }],
        id: [{ type: Input }],
        offset: [{ type: Input }],
        positioning: [{ type: Input }],
        stopEvent: [{ type: Input }],
        insertFirst: [{ type: Input }],
        autoPan: [{ type: Input }],
        autoPanAnimation: [{ type: Input }],
        autoPanMargin: [{ type: Input }]
    };
    return OverlayComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var StyleComponent = /** @class */ (function () {
    function StyleComponent(featureHost, layerHost) {
        this.componentType = 'style';
        // console.log('creating aol-style');
        this.host = !!featureHost ? featureHost : layerHost;
        if (!this.host) {
            throw new Error('aol-style must be applied to a feature or a layer');
        }
    }
    /**
     * @return {?}
     */
    StyleComponent.prototype.update = /**
     * @return {?}
     */
    function () {
        // console.log('updating style\'s host: ', this.host);
        this.host.instance.changed();
    };
    /**
     * @return {?}
     */
    StyleComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating aol-style instance with: ', this);
        this.instance = new Style(this);
        this.host.instance.setStyle(this.instance);
    };
    StyleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleComponent.ctorParameters = function () { return [
        { type: FeatureComponent, decorators: [{ type: Optional }] },
        { type: LayerVectorComponent, decorators: [{ type: Optional }] }
    ]; };
    StyleComponent.propDecorators = {
        geometry: [{ type: Input }],
        fill: [{ type: Input }],
        image: [{ type: Input }],
        stroke: [{ type: Input }],
        text: [{ type: Input }],
        zIndex: [{ type: Input }]
    };
    return StyleComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var StyleCircleComponent = /** @class */ (function () {
    function StyleCircleComponent(host) {
        this.host = host;
        this.componentType = 'style-circle';
    }
    /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     */
    /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     * @return {?}
     */
    StyleCircleComponent.prototype.update = /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     * @return {?}
     */
    function () {
        if (!!this.instance) {
            // console.log('setting ol.style.Circle instance\'s radius');
            this.instance.setRadius(this.radius);
        }
        this.host.update();
    };
    /**
     * @return {?}
     */
    StyleCircleComponent.prototype.ngAfterContentInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.style.Circle instance with: ', this);
        this.instance = new Circle$1(this);
        this.host.instance.setImage(this.instance);
        this.host.update();
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    StyleCircleComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (!this.instance) {
            return;
        }
        if (changes['radius']) {
            this.instance.setRadius(changes['radius'].currentValue);
        }
        // console.log('changes detected in aol-style-circle, setting new radius: ', changes['radius'].currentValue);
    };
    /**
     * @return {?}
     */
    StyleCircleComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-style-circle');
        this.host.instance.setImage(null);
    };
    StyleCircleComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style-circle',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleCircleComponent.ctorParameters = function () { return [
        { type: StyleComponent, decorators: [{ type: Host }] }
    ]; };
    StyleCircleComponent.propDecorators = {
        fill: [{ type: Input }],
        radius: [{ type: Input }],
        snapToPixel: [{ type: Input }],
        stroke: [{ type: Input }],
        atlasManager: [{ type: Input }]
    };
    return StyleCircleComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var StyleTextComponent = /** @class */ (function () {
    function StyleTextComponent(host) {
        this.host = host;
        this.componentType = 'style-text';
        if (!host) {
            throw new Error('aol-style-text must be a descendant of aol-style');
        }
        // console.log('creating aol-style-text with: ', this);
    }
    /**
     * @return {?}
     */
    StyleTextComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.style.Text instance with: ', this);
        this.instance = new Text(this);
        this.host.instance.setText(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    StyleTextComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (!this.instance) {
            return;
        }
        if (changes['font']) {
            this.instance.setFont(changes['font'].currentValue);
        }
        if (changes['offsetX']) {
            this.instance.setOffsetX(changes['offsetX'].currentValue);
        }
        if (changes['offsetY']) {
            this.instance.setOffsetY(changes['offsetY'].currentValue);
        }
        if (changes['scale']) {
            this.instance.setScale(changes['scale'].currentValue);
        }
        if (changes['rotation']) {
            this.instance.setRotation(changes['rotation'].currentValue);
        }
        if (changes['text']) {
            this.instance.setText(changes['text'].currentValue);
        }
        if (changes['textAlign']) {
            this.instance.setTextAlign(changes['textAlign'].currentValue);
        }
        if (changes['textBaseLine']) {
            this.instance.setTextBaseline(changes['textBaseLine'].currentValue);
        }
        this.host.update();
        // console.log('changes detected in aol-style-text, setting new properties: ', changes);
    };
    StyleTextComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style-text',
                    template: "\n    <div class=\"aol-style-text\"></div>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleTextComponent.ctorParameters = function () { return [
        { type: StyleComponent, decorators: [{ type: Optional }] }
    ]; };
    StyleTextComponent.propDecorators = {
        font: [{ type: Input }],
        offsetX: [{ type: Input }],
        offsetY: [{ type: Input }],
        scale: [{ type: Input }],
        rotateWithView: [{ type: Input }],
        rotation: [{ type: Input }],
        text: [{ type: Input }],
        textAlign: [{ type: Input }],
        textBaseLine: [{ type: Input }]
    };
    return StyleTextComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var StyleStrokeComponent = /** @class */ (function () {
    function StyleStrokeComponent(styleHost, styleCircleHost, styleTextHost) {
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
        // console.log('creating aol-style-stroke with: ', this);
    }
    /**
     * @return {?}
     */
    StyleStrokeComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        // console.log('creating ol.style.Stroke instance with: ', this);
        this.instance = new Stroke(this);
        switch (this.host.componentType) {
            case 'style':
                this.host.instance.setStroke(this.instance);
                // console.log('setting ol.style instance\'s stroke:', this.host);
                break;
            case 'style-text':
                this.host.instance.setStroke(this.instance);
                break;
            case 'style-circle':
                this.host.stroke = this.instance;
                // console.log('setting ol.style.circle instance\'s stroke:', this.host);
                break;
            default:
                throw new Error('unknown host type: ' + this.host);
            // break;
        }
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    StyleStrokeComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (!this.instance) {
            return;
        }
        if (changes['color']) {
            this.instance.setColor(changes['color'].currentValue);
        }
        if (changes['lineCap']) {
            this.instance.setLineCap(changes['lineCap'].currentValue);
        }
        if (changes['lineDash']) {
            this.instance.setLineDash(changes['lineDash'].currentValue);
        }
        if (changes['lineJoin']) {
            this.instance.setLineJoin(changes['lineJoin'].currentValue);
        }
        if (changes['miterLimit']) {
            this.instance.setMiterLimit(changes['miterLimit'].currentValue);
        }
        if (changes['width']) {
            this.instance.setWidth(changes['width'].currentValue);
        }
        this.host.update();
        // console.log('changes detected in aol-style-stroke, setting new properties: ', changes);
    };
    StyleStrokeComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style-stroke',
                    template: "\n    <div class=\"aol-style-stroke\"></div>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleStrokeComponent.ctorParameters = function () { return [
        { type: StyleComponent, decorators: [{ type: Optional }] },
        { type: StyleCircleComponent, decorators: [{ type: Optional }] },
        { type: StyleTextComponent, decorators: [{ type: Optional }] }
    ]; };
    StyleStrokeComponent.propDecorators = {
        color: [{ type: Input }],
        lineCap: [{ type: Input }],
        lineDash: [{ type: Input }],
        lineJoin: [{ type: Input }],
        miterLimit: [{ type: Input }],
        width: [{ type: Input }]
    };
    return StyleStrokeComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var StyleFillComponent = /** @class */ (function () {
    function StyleFillComponent(styleHost, styleCircleHost, styleTextHost) {
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
    StyleFillComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
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
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    StyleFillComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (!this.instance) {
            return;
        }
        if (changes['color']) {
            this.instance.setColor(changes['color'].currentValue);
        }
        this.host.update();
        // console.log('changes detected in aol-style-fill, setting new color: ', changes);
    };
    StyleFillComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-style-fill',
                    template: "\n    <div class=\"aol-style-fill\"></div>\n  "
                }] }
    ];
    /** @nocollapse */
    StyleFillComponent.ctorParameters = function () { return [
        { type: StyleComponent, decorators: [{ type: Optional }] },
        { type: StyleCircleComponent, decorators: [{ type: Optional }] },
        { type: StyleTextComponent, decorators: [{ type: Optional }] }
    ]; };
    StyleFillComponent.propDecorators = {
        color: [{ type: Input }]
    };
    return StyleFillComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DefaultControlComponent = /** @class */ (function () {
    function DefaultControlComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DefaultControlComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('ol.control.defaults init: ', this);
        this.instance = defaults(this);
        this.instance.forEach((/**
         * @param {?} c
         * @return {?}
         */
        function (c) { return _this.map.instance.addControl(c); }));
    };
    /**
     * @return {?}
     */
    DefaultControlComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        var _this = this;
        // console.log('removing aol-control-defaults');
        this.instance.forEach((/**
         * @param {?} c
         * @return {?}
         */
        function (c) { return _this.map.instance.removeControl(c); }));
    };
    DefaultControlComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-defaults',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DefaultControlComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DefaultControlComponent.propDecorators = {
        attribution: [{ type: Input }],
        attributionOptions: [{ type: Input }],
        rotate: [{ type: Input }],
        rotateOptions: [{ type: Input }],
        zoom: [{ type: Input }],
        zoomOptions: [{ type: Input }]
    };
    return DefaultControlComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlComponent = /** @class */ (function () {
    function ControlComponent(map) {
        this.map = map;
        this.componentType = 'control';
    }
    /**
     * @return {?}
     */
    ControlComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        if (this.content) {
            this.element = this.content.elementRef.nativeElement;
            this.instance = new Control(this);
            this.map.instance.addControl(this.instance);
        }
    };
    /**
     * @return {?}
     */
    ControlComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        if (this.instance) {
            this.map.instance.removeControl(this.instance);
        }
    };
    ControlComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlComponent.propDecorators = {
        content: [{ type: ContentChild, args: [ContentComponent,] }]
    };
    return ControlComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlAttributionComponent = /** @class */ (function () {
    function ControlAttributionComponent(map, element) {
        this.map = map;
        this.element = element;
        this.componentType = 'control';
    }
    /**
     * @return {?}
     */
    ControlAttributionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.target = this.element.nativeElement;
        // console.log('ol.control.Attribution init: ', this);
        this.instance = new Attribution(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlAttributionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-attribution');
        this.map.instance.removeControl(this.instance);
    };
    ControlAttributionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-attribution',
                    template: ""
                }] }
    ];
    /** @nocollapse */
    ControlAttributionComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: ElementRef }
    ]; };
    ControlAttributionComponent.propDecorators = {
        collapsible: [{ type: Input }]
    };
    return ControlAttributionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlFullScreenComponent = /** @class */ (function () {
    function ControlFullScreenComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-fullscreen');
    }
    /**
     * @return {?}
     */
    ControlFullScreenComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new FullScreen(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlFullScreenComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-fullscreen');
        this.map.instance.removeControl(this.instance);
    };
    ControlFullScreenComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-fullscreen',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlFullScreenComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlFullScreenComponent.propDecorators = {
        className: [{ type: Input }],
        label: [{ type: Input }],
        labelActive: [{ type: Input }],
        tipLabel: [{ type: Input }],
        keys: [{ type: Input }]
    };
    return ControlFullScreenComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlMousePositionComponent = /** @class */ (function () {
    function ControlMousePositionComponent(map, element) {
        this.map = map;
        this.element = element;
    }
    /**
     * @return {?}
     */
    ControlMousePositionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.target = this.element.nativeElement;
        // console.log('ol.control.MousePosition init: ', this);
        this.instance = new MousePosition(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlMousePositionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-mouseposition');
        this.map.instance.removeControl(this.instance);
    };
    ControlMousePositionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-mouseposition',
                    template: ""
                }] }
    ];
    /** @nocollapse */
    ControlMousePositionComponent.ctorParameters = function () { return [
        { type: MapComponent },
        { type: ElementRef }
    ]; };
    ControlMousePositionComponent.propDecorators = {
        coordinateFormat: [{ type: Input }],
        projection: [{ type: Input }]
    };
    return ControlMousePositionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlOverviewMapComponent = /** @class */ (function () {
    function ControlOverviewMapComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeControl(this.instance);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.instance != null && changes.hasOwnProperty('view')) {
            this.reloadInstance();
        }
    };
    /**
     * @private
     * @return {?}
     */
    ControlOverviewMapComponent.prototype.reloadInstance = /**
     * @private
     * @return {?}
     */
    function () {
        this.map.instance.removeControl(this.instance);
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    };
    ControlOverviewMapComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-overviewmap',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlOverviewMapComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlOverviewMapComponent.propDecorators = {
        collapsed: [{ type: Input }],
        collapseLabel: [{ type: Input }],
        collapsible: [{ type: Input }],
        label: [{ type: Input }],
        layers: [{ type: Input }],
        target: [{ type: Input }],
        tipLabel: [{ type: Input }],
        view: [{ type: Input }]
    };
    return ControlOverviewMapComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlRotateComponent = /** @class */ (function () {
    function ControlRotateComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-rotate');
    }
    /**
     * @return {?}
     */
    ControlRotateComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Rotate(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlRotateComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-rotate');
        this.map.instance.removeControl(this.instance);
    };
    ControlRotateComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-rotate',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlRotateComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlRotateComponent.propDecorators = {
        className: [{ type: Input }],
        label: [{ type: Input }],
        tipLabel: [{ type: Input }],
        duration: [{ type: Input }],
        autoHide: [{ type: Input }]
    };
    return ControlRotateComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlScaleLineComponent = /** @class */ (function () {
    function ControlScaleLineComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-scaleline');
    }
    /**
     * @return {?}
     */
    ControlScaleLineComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new ScaleLine(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlScaleLineComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-scaleline');
        this.map.instance.removeControl(this.instance);
    };
    ControlScaleLineComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-scaleline',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlScaleLineComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlScaleLineComponent.propDecorators = {
        units: [{ type: Input }]
    };
    return ControlScaleLineComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlZoomComponent = /** @class */ (function () {
    function ControlZoomComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-zoom');
    }
    /**
     * @return {?}
     */
    ControlZoomComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new Zoom(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlZoomComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-zoom');
        this.map.instance.removeControl(this.instance);
    };
    ControlZoomComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-zoom',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlZoomComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlZoomComponent.propDecorators = {
        duration: [{ type: Input }],
        zoomInLabel: [{ type: Input }],
        zoomOutLabel: [{ type: Input }],
        zoomInTipLabel: [{ type: Input }],
        zoomOutTipLabel: [{ type: Input }],
        delta: [{ type: Input }]
    };
    return ControlZoomComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlZoomSliderComponent = /** @class */ (function () {
    function ControlZoomSliderComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-zoomslider');
    }
    /**
     * @return {?}
     */
    ControlZoomSliderComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new ZoomSlider(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlZoomSliderComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-zoomslider');
        this.map.instance.removeControl(this.instance);
    };
    ControlZoomSliderComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-zoomslider',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlZoomSliderComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlZoomSliderComponent.propDecorators = {
        className: [{ type: Input }],
        duration: [{ type: Input }],
        maxResolution: [{ type: Input }],
        minResolution: [{ type: Input }]
    };
    return ControlZoomSliderComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ControlZoomToExtentComponent = /** @class */ (function () {
    function ControlZoomToExtentComponent(map) {
        this.map = map;
        // console.log('instancing aol-control-zoomtoextent');
    }
    /**
     * @return {?}
     */
    ControlZoomToExtentComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new ZoomToExtent(this);
        this.map.instance.addControl(this.instance);
    };
    /**
     * @return {?}
     */
    ControlZoomToExtentComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        // console.log('removing aol-control-zoomtoextent');
        this.map.instance.removeControl(this.instance);
    };
    ControlZoomToExtentComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-control-zoomtoextent',
                    template: "\n    <ng-content></ng-content>\n  "
                }] }
    ];
    /** @nocollapse */
    ControlZoomToExtentComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ControlZoomToExtentComponent.propDecorators = {
        className: [{ type: Input }],
        label: [{ type: Input }],
        tipLabel: [{ type: Input }],
        extent: [{ type: Input }]
    };
    return ControlZoomToExtentComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var FormatMVTComponent = /** @class */ (function (_super) {
    __extends(FormatMVTComponent, _super);
    function FormatMVTComponent() {
        var _this = _super.call(this) || this;
        _this.instance = new MVT(_this);
        return _this;
    }
    FormatMVTComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-format-mvt',
                    template: '',
                    providers: [{ provide: FormatComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return FormatMVTComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    FormatMVTComponent.ctorParameters = function () { return []; };
    FormatMVTComponent.propDecorators = {
        featureClass: [{ type: Input }],
        geometryName: [{ type: Input }],
        layerName: [{ type: Input }],
        layers: [{ type: Input }]
    };
    return FormatMVTComponent;
}(FormatComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DefaultInteractionComponent = /** @class */ (function () {
    function DefaultInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DefaultInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = defaults$1();
        this.instance.forEach((/**
         * @param {?} i
         * @return {?}
         */
        function (i) { return _this.map.instance.addInteraction(i); }));
    };
    /**
     * @return {?}
     */
    DefaultInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance.forEach((/**
         * @param {?} i
         * @return {?}
         */
        function (i) { return _this.map.instance.removeInteraction(i); }));
    };
    DefaultInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-default',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DefaultInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    return DefaultInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var FreeboardInteractionComponent = /** @class */ (function () {
    function FreeboardInteractionComponent(map) {
        this.map = map;
        this.interactions = [];
    }
    /**
     * @return {?}
     */
    FreeboardInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.interactions.push(new DragPan(this));
        this.interactions.push(new DragZoom(this));
        this.interactions.push(new PinchZoom(this));
        this.interactions.push(new MouseWheelZoom(this));
        this.interactions.push(new KeyboardPan(this));
        this.interactions.push(new KeyboardZoom(this));
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        function (i) { return _this.map.instance.addInteraction(i); }));
    };
    /**
     * @return {?}
     */
    FreeboardInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        function (i) { return _this.map.instance.removeInteraction(i); }));
    };
    FreeboardInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-freeboard',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    FreeboardInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    return FreeboardInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DoubleClickZoomInteractionComponent = /** @class */ (function () {
    function DoubleClickZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DoubleClickZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DoubleClickZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DoubleClickZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DoubleClickZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-doubleclickzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DoubleClickZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DoubleClickZoomInteractionComponent.propDecorators = {
        duration: [{ type: Input }],
        delta: [{ type: Input }]
    };
    return DoubleClickZoomInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DragAndDropInteractionComponent = /** @class */ (function () {
    function DragAndDropInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragAndDropInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragAndDrop(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragAndDropInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragAndDropInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-draganddrop',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragAndDropInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragAndDropInteractionComponent.propDecorators = {
        formatConstructors: [{ type: Input }],
        projection: [{ type: Input }],
        target: [{ type: Input }]
    };
    return DragAndDropInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DragBoxInteractionComponent = /** @class */ (function () {
    function DragBoxInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragBoxInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragBox(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragBoxInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragBoxInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragbox',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragBoxInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragBoxInteractionComponent.propDecorators = {
        className: [{ type: Input }],
        condition: [{ type: Input }],
        boxEndCondition: [{ type: Input }]
    };
    return DragBoxInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DragPanInteractionComponent = /** @class */ (function () {
    function DragPanInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragPanInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragPan(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragPanInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragPanInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragpan',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragPanInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragPanInteractionComponent.propDecorators = {
        condition: [{ type: Input }],
        kinetic: [{ type: Input }]
    };
    return DragPanInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DragRotateInteractionComponent = /** @class */ (function () {
    function DragRotateInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragRotateInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragRotate(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragRotateInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragRotateInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragrotate',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragRotateInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragRotateInteractionComponent.propDecorators = {
        condition: [{ type: Input }],
        duration: [{ type: Input }]
    };
    return DragRotateInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DragRotateAndZoomInteractionComponent = /** @class */ (function () {
    function DragRotateAndZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragRotateAndZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragRotateAndZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragRotateAndZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragRotateAndZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragrotateandzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragRotateAndZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragRotateAndZoomInteractionComponent.propDecorators = {
        condition: [{ type: Input }],
        duration: [{ type: Input }]
    };
    return DragRotateAndZoomInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DragZoomInteractionComponent = /** @class */ (function () {
    function DragZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    DragZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new DragZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DragZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DragZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-dragzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DragZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DragZoomInteractionComponent.propDecorators = {
        className: [{ type: Input }],
        condition: [{ type: Input }],
        duration: [{ type: Input }],
        out: [{ type: Input }]
    };
    return DragZoomInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var MouseWheelZoomInteractionComponent = /** @class */ (function () {
    function MouseWheelZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    MouseWheelZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new MouseWheelZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    MouseWheelZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    MouseWheelZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-mousewheelzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    MouseWheelZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    MouseWheelZoomInteractionComponent.propDecorators = {
        duration: [{ type: Input }],
        timeout: [{ type: Input }],
        useAnchor: [{ type: Input }]
    };
    return MouseWheelZoomInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var PinchZoomInteractionComponent = /** @class */ (function () {
    function PinchZoomInteractionComponent(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    PinchZoomInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new PinchZoom(this);
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    PinchZoomInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    PinchZoomInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-pinchzoom',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    PinchZoomInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    PinchZoomInteractionComponent.propDecorators = {
        duration: [{ type: Input }],
        constrainResolution: [{ type: Input }]
    };
    return PinchZoomInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var DrawInteractionComponent = /** @class */ (function () {
    function DrawInteractionComponent(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onChangeActive = new EventEmitter();
        this.onDrawEnd = new EventEmitter();
        this.onDrawStart = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
    }
    /**
     * @return {?}
     */
    DrawInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Draw(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChange.emit(event); }));
        this.instance.on('change:active', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeActive.emit(event); }));
        this.instance.on('drawend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onDrawEnd.emit(event); }));
        this.instance.on('drawstart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onDrawStart.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    DrawInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    DrawInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-draw',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    DrawInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    DrawInteractionComponent.propDecorators = {
        clickTolerance: [{ type: Input }],
        features: [{ type: Input }],
        source: [{ type: Input }],
        snapTolerance: [{ type: Input }],
        type: [{ type: Input }],
        maxPoints: [{ type: Input }],
        minPoints: [{ type: Input }],
        finishCondition: [{ type: Input }],
        style: [{ type: Input }],
        geometryFunction: [{ type: Input }],
        geometryName: [{ type: Input }],
        condition: [{ type: Input }],
        freehandCondition: [{ type: Input }],
        freehand: [{ type: Input }],
        wrapX: [{ type: Input }],
        onChange: [{ type: Output }],
        onChangeActive: [{ type: Output }],
        onDrawEnd: [{ type: Output }],
        onDrawStart: [{ type: Output }],
        onPropertyChange: [{ type: Output }]
    };
    return DrawInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SelectInteractionComponent = /** @class */ (function () {
    function SelectInteractionComponent(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onSelect = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
    }
    /**
     * @return {?}
     */
    SelectInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Select(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChange.emit(event); }));
        this.instance.on('select', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onSelect.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    SelectInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    SelectInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-select',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    SelectInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    SelectInteractionComponent.propDecorators = {
        addCondition: [{ type: Input }],
        condition: [{ type: Input }],
        layers: [{ type: Input }],
        style: [{ type: Input }],
        removeCondition: [{ type: Input }],
        toggleCondition: [{ type: Input }],
        multi: [{ type: Input }],
        features: [{ type: Input }],
        filter: [{ type: Input }],
        wrapX: [{ type: Input }],
        onChange: [{ type: Output }],
        onSelect: [{ type: Output }],
        onPropertyChange: [{ type: Output }]
    };
    return SelectInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var ModifyInteractionComponent = /** @class */ (function () {
    function ModifyInteractionComponent(map) {
        this.map = map;
        this.onModifyEnd = new EventEmitter();
        this.onModifyStart = new EventEmitter();
        this.onChange = new EventEmitter();
        this.onChangeActive = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ModifyInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Modify(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChange.emit(event); }));
        this.instance.on('change:active', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChangeActive.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.instance.on('modifyend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onModifyEnd.emit(event); }));
        this.instance.on('modifystart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onModifyStart.emit(event); }));
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    ModifyInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    ModifyInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-modify',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    ModifyInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    ModifyInteractionComponent.propDecorators = {
        condition: [{ type: Input }],
        deleteCondition: [{ type: Input }],
        pixelTolerance: [{ type: Input }],
        style: [{ type: Input }],
        features: [{ type: Input }],
        wrapX: [{ type: Input }],
        source: [{ type: Input }],
        onModifyEnd: [{ type: Output }],
        onModifyStart: [{ type: Output }],
        onChange: [{ type: Output }],
        onChangeActive: [{ type: Output }],
        onPropertyChange: [{ type: Output }]
    };
    return ModifyInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var TranslateInteractionComponent = /** @class */ (function () {
    function TranslateInteractionComponent(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
        this.onTranslateEnd = new EventEmitter();
        this.onTranslateStart = new EventEmitter();
        this.onTranslating = new EventEmitter();
    }
    /**
     * @return {?}
     */
    TranslateInteractionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        var _this = this;
        this.instance = new Translate(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onChange.emit(event); }));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onPropertyChange.emit(event); }));
        this.instance.on('translateend', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onTranslateEnd.emit(event); }));
        this.instance.on('translatestart', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onTranslateStart.emit(event); }));
        this.instance.on('translating', (/**
         * @param {?} event
         * @return {?}
         */
        function (event) { return _this.onTranslating.emit(event); }));
        this.map.instance.addInteraction(this.instance);
    };
    /**
     * @return {?}
     */
    TranslateInteractionComponent.prototype.ngOnDestroy = /**
     * @return {?}
     */
    function () {
        this.map.instance.removeInteraction(this.instance);
    };
    TranslateInteractionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-interaction-translate',
                    template: ''
                }] }
    ];
    /** @nocollapse */
    TranslateInteractionComponent.ctorParameters = function () { return [
        { type: MapComponent }
    ]; };
    TranslateInteractionComponent.propDecorators = {
        features: [{ type: Input }],
        layers: [{ type: Input }],
        hitTolerance: [{ type: Input }],
        onChange: [{ type: Output }],
        onPropertyChange: [{ type: Output }],
        onTranslateEnd: [{ type: Output }],
        onTranslateStart: [{ type: Output }],
        onTranslating: [{ type: Output }]
    };
    return TranslateInteractionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var AttributionComponent = /** @class */ (function () {
    function AttributionComponent(elementRef) {
        this.elementRef = elementRef;
    }
    /**
     * @return {?}
     */
    AttributionComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.html = this.elementRef.nativeElement.innerHTML;
        this.instance = new Attribution(this);
    };
    AttributionComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-attribution',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    AttributionComponent.ctorParameters = function () { return [
        { type: ElementRef }
    ]; };
    return AttributionComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var AttributionsComponent = /** @class */ (function () {
    function AttributionsComponent(source) {
        this.source = source;
    }
    /* we can do this at the very end */
    /* we can do this at the very end */
    /**
     * @return {?}
     */
    AttributionsComponent.prototype.ngAfterViewInit = /* we can do this at the very end */
    /**
     * @return {?}
     */
    function () {
        if (this.attributions.length) {
            this.instance = this.attributions.map((/**
             * @param {?} cmp
             * @return {?}
             */
            function (cmp) { return cmp.instance; }));
            // console.log('setting attributions:', this.instance);
            this.source.instance.setAttributions(this.instance);
        }
    };
    AttributionsComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-attributions',
                    template: '<ng-content></ng-content>'
                }] }
    ];
    /** @nocollapse */
    AttributionsComponent.ctorParameters = function () { return [
        { type: SourceComponent, decorators: [{ type: Host }] }
    ]; };
    AttributionsComponent.propDecorators = {
        attributions: [{ type: ContentChildren, args: [AttributionComponent,] }]
    };
    return AttributionsComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
var SourceUTFGridComponent = /** @class */ (function (_super) {
    __extends(SourceUTFGridComponent, _super);
    function SourceUTFGridComponent(layer) {
        return _super.call(this, layer) || this;
    }
    /**
     * @return {?}
     */
    SourceUTFGridComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.instance = new UTFGrid(this);
        this.host.instance.setSource(this.instance);
    };
    SourceUTFGridComponent.decorators = [
        { type: Component, args: [{
                    selector: 'aol-source-utfgrid',
                    template: "\n    <ng-content></ng-content>\n  ",
                    providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                             * @return {?}
                             */
                            function () { return SourceUTFGridComponent; })) }]
                }] }
    ];
    /** @nocollapse */
    SourceUTFGridComponent.ctorParameters = function () { return [
        { type: LayerTileComponent, decorators: [{ type: Host }] }
    ]; };
    SourceUTFGridComponent.propDecorators = {
        tileJSON: [{ type: Input }],
        url: [{ type: Input }]
    };
    return SourceUTFGridComponent;
}(SourceComponent));

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/** @type {?} */
var COMPONENTS = [
    MapComponent,
    ViewComponent,
    GraticuleComponent,
    LayerGroupComponent,
    LayerImageComponent,
    LayerTileComponent,
    LayerVectorComponent,
    LayerVectorTileComponent,
    SourceOsmComponent,
    SourceBingmapsComponent,
    SourceClusterComponent,
    SourceUTFGridComponent,
    SourceVectorComponent,
    SourceXYZComponent,
    SourceVectorTileComponent,
    SourceTileWMSComponent,
    SourceTileWMTSComponent,
    SourceTileJSONComponent,
    SourceGeoJSONComponent,
    SourceImageStaticComponent,
    SourceImageWMSComponent,
    SourceImageArcGISRestComponent,
    SourceRasterComponent,
    FeatureComponent,
    GeometryLinestringComponent,
    GeometryMultiLinestringComponent,
    GeometryMultiPointComponent,
    GeometryMultiPolygonComponent,
    GeometryPointComponent,
    GeometryPolygonComponent,
    GeometryCircleComponent,
    CoordinateComponent,
    CollectionCoordinatesComponent,
    StyleComponent,
    StyleCircleComponent,
    StyleFillComponent,
    StyleIconComponent,
    StyleStrokeComponent,
    StyleTextComponent,
    DefaultControlComponent,
    ControlComponent,
    ControlAttributionComponent,
    ControlFullScreenComponent,
    ControlMousePositionComponent,
    ControlOverviewMapComponent,
    ControlRotateComponent,
    ControlScaleLineComponent,
    ControlZoomComponent,
    ControlZoomSliderComponent,
    ControlZoomToExtentComponent,
    FormatMVTComponent,
    TileGridComponent,
    TileGridWMTSComponent,
    DefaultInteractionComponent,
    FreeboardInteractionComponent,
    DoubleClickZoomInteractionComponent,
    DragAndDropInteractionComponent,
    DragBoxInteractionComponent,
    DragPanInteractionComponent,
    DragRotateInteractionComponent,
    DragRotateAndZoomInteractionComponent,
    DragZoomInteractionComponent,
    MouseWheelZoomInteractionComponent,
    PinchZoomInteractionComponent,
    DrawInteractionComponent,
    SelectInteractionComponent,
    ModifyInteractionComponent,
    TranslateInteractionComponent,
    OverlayComponent,
    ContentComponent,
    AttributionsComponent,
    AttributionComponent,
];
var AngularOpenlayersModule = /** @class */ (function () {
    function AngularOpenlayersModule() {
    }
    AngularOpenlayersModule.decorators = [
        { type: NgModule, args: [{
                    declarations: COMPONENTS,
                    imports: [CommonModule],
                    exports: COMPONENTS,
                },] }
    ];
    return AngularOpenlayersModule;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

export { MapComponent, ViewComponent, GraticuleComponent, LayerGroupComponent, LayerImageComponent, LayerTileComponent, LayerVectorComponent, LayerVectorTileComponent, SourceOsmComponent, SourceBingmapsComponent, SourceClusterComponent, SourceUTFGridComponent, SourceVectorComponent, SourceXYZComponent, SourceVectorTileComponent, SourceTileWMSComponent, SourceTileWMTSComponent, SourceTileJSONComponent, SourceGeoJSONComponent, SourceImageStaticComponent, SourceImageWMSComponent, SourceRasterComponent, SourceImageArcGISRestComponent, FeatureComponent, GeometryLinestringComponent, GeometryMultiLinestringComponent, GeometryMultiPointComponent, GeometryMultiPolygonComponent, GeometryPointComponent, GeometryPolygonComponent, GeometryCircleComponent, CoordinateComponent, CollectionCoordinatesComponent, StyleComponent, StyleCircleComponent, StyleFillComponent, StyleIconComponent, StyleStrokeComponent, StyleTextComponent, DefaultControlComponent, ControlComponent, ControlAttributionComponent, ControlFullScreenComponent, ControlMousePositionComponent, ControlOverviewMapComponent, ControlRotateComponent, ControlScaleLineComponent, ControlZoomComponent, ControlZoomSliderComponent, ControlZoomToExtentComponent, FormatMVTComponent, TileGridComponent, TileGridWMTSComponent, DefaultInteractionComponent, FreeboardInteractionComponent, DoubleClickZoomInteractionComponent, DragAndDropInteractionComponent, DragBoxInteractionComponent, DragPanInteractionComponent, DragRotateInteractionComponent, DragRotateAndZoomInteractionComponent, DragZoomInteractionComponent, MouseWheelZoomInteractionComponent, PinchZoomInteractionComponent, DrawInteractionComponent, SelectInteractionComponent, ModifyInteractionComponent, TranslateInteractionComponent, OverlayComponent, ContentComponent, AttributionsComponent, AttributionComponent, AngularOpenlayersModule, FormatComponent as ɵc, SimpleGeometryComponent as ɵd, LayerComponent as ɵa, SourceComponent as ɵb };

//# sourceMappingURL=ngx-openlayers.js.map