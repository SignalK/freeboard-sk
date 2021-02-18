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
import { Graticule, Feature, Overlay } from 'ol';
import { defaults, Control, Attribution, FullScreen, OverviewMap, Rotate, ScaleLine, Zoom, ZoomSlider, ZoomToExtent } from 'ol/control';
import { Component, ElementRef, Input, Output, EventEmitter, SkipSelf, Optional, forwardRef, Host, ContentChild, ContentChildren, NgModule } from '@angular/core';
import { Raster, XYZ, OSM, BingMaps, Vector as Vector$1, Cluster, WMTS as WMTS$1, VectorTile as VectorTile$1, TileWMS, TileJSON, ImageStatic, ImageWMS, ImageArcGISRest, UTFGrid } from 'ol/source';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class MapComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
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
    ngOnInit() {
        // console.log('creating ol.Map instance with:', this);
        this.instance = new Map(this);
        this.instance.setTarget(this.host.nativeElement.firstElementChild);
        this.instance.on('click', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onClick.emit(event)));
        this.instance.on('dblclick', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onDblClick.emit(event)));
        this.instance.on('moveend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onMoveEnd.emit(event)));
        this.instance.on('pointerdrag', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPointerDrag.emit(event)));
        this.instance.on('pointermove', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPointerMove.emit(event)));
        this.instance.on('postcompose', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPostCompose.emit(event)));
        this.instance.on('postrender', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPostRender.emit(event)));
        this.instance.on('precompose', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPreCompose.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.instance.on('singleclick', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onSingleClick.emit(event)));
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        // console.log('changes detected in aol-map, setting new properties: ', properties);
        this.instance.setProperties(properties, false);
    }
    /**
     * @return {?}
     */
    ngAfterViewInit() {
        this.instance.updateSize();
    }
}
MapComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-map',
                template: `
    <div [style.width]="width" [style.height]="height" tabindex="-1"></div>
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
MapComponent.ctorParameters = () => [
    { type: ElementRef }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ViewComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
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
    ngOnInit() {
        // console.log('creating ol.View instance with: ', this);
        this.instance = new View(this);
        this.host.instance.setView(this.instance);
        this.instance.on('change:zoom', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChangeZoom.emit(event)));
        this.instance.on('change:resolution', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChangeResolution.emit(event)));
        this.instance.on('change:center', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChangeCenter.emit(event)));
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        /** @type {?} */
        let args = {};
        for (const key in changes) {
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
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-view');
    }
}
ViewComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-view',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ViewComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GraticuleComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.componentType = 'graticule';
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        if (properties) {
            this.instance = new Graticule(properties);
        }
        this.instance.setMap(this.map.instance);
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.instance = new Graticule({
            strokeStyle: this.strokeStyle,
            showLabels: this.showLabels,
            lonLabelPosition: this.lonLabelPosition,
            latLabelPosition: this.latLabelPosition,
        });
        this.instance.setMap(this.map.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.instance.setMap(null);
    }
}
GraticuleComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-graticule',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
GraticuleComponent.ctorParameters = () => [
    { type: MapComponent }
];
GraticuleComponent.propDecorators = {
    strokeStyle: [{ type: Input }],
    showLabels: [{ type: Input }],
    lonLabelPosition: [{ type: Input }],
    latLabelPosition: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @abstract
 */
class LayerComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
        this.host = host;
        this.componentType = 'layer';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        if (this.precompose !== null && this.precompose !== undefined) {
            this.instance.on('precompose', this.precompose);
        }
        if (this.postcompose !== null && this.postcompose !== undefined) {
            this.instance.on('postcompose', this.postcompose);
        }
        this.host.instance.getLayers().push(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.host.instance.getLayers().remove(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
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
    }
}
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class LayerGroupComponent extends LayerComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class LayerImageComponent extends LayerComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class LayerTileComponent extends LayerComponent {
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
        // console.log('creating ol.layer.Tile instance with:', this);
        this.instance = new Tile(this);
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
LayerTileComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-layer-tile',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
LayerTileComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: LayerGroupComponent, decorators: [{ type: Optional }] }
];
LayerTileComponent.propDecorators = {
    preload: [{ type: Input }],
    useInterimTilesOnError: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class LayerVectorComponent extends LayerComponent {
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
        // console.log('creating ol.layer.Vector instance with:', this);
        this.instance = new Vector(this);
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
LayerVectorComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-layer-vector',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
LayerVectorComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: LayerGroupComponent, decorators: [{ type: Optional }] }
];
LayerVectorComponent.propDecorators = {
    renderBuffer: [{ type: Input }],
    style: [{ type: Input }],
    updateWhileAnimating: [{ type: Input }],
    updateWhileInteracting: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class LayerVectorTileComponent extends LayerComponent {
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
        // console.log('creating ol.layer.VectorTile instance with:', this);
        this.instance = new VectorTile(this);
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
LayerVectorTileComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-layer-vectortile',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
LayerVectorTileComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: LayerGroupComponent, decorators: [{ type: Optional }] }
];
LayerVectorTileComponent.propDecorators = {
    renderBuffer: [{ type: Input }],
    renderMode: [{ type: Input }],
    renderOrder: [{ type: Input }],
    style: [{ type: Input }],
    updateWhileAnimating: [{ type: Input }],
    updateWhileInteracting: [{ type: Input }],
    visible: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceComponent {
    /**
     * @param {?} host
     * @param {?=} raster
     */
    constructor(host, raster) {
        this.host = host;
        this.raster = raster;
        this.componentType = 'source';
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this.host && this.host.instance) {
            this.host.instance.setSource(null);
        }
        if (this.raster) {
            this.raster.sources = [];
        }
    }
    /**
     * @protected
     * @param {?} s
     * @return {?}
     */
    _register(s) {
        if (this.host) {
            this.host.instance.setSource(s);
        }
        if (this.raster) {
            this.raster.sources = [s];
            this.raster.init();
        }
    }
}
SourceComponent.propDecorators = {
    attributions: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class TileGridComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceRasterComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
        this.beforeOperations = new EventEmitter();
        this.afterOperations = new EventEmitter();
        this.sources = [];
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.init();
    }
    /**
     * @return {?}
     */
    init() {
        this.instance = new Raster(this);
        this.instance.on('beforeoperations', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.beforeOperations.emit(event)));
        this.instance.on('afteroperations', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.afterOperations.emit(event)));
        this._register(this.instance);
    }
}
SourceRasterComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-raster',
                template: `
    <ng-content></ng-content>
  `,
                providers: [
                    {
                        provide: SourceComponent,
                        useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceRasterComponent)),
                    },
                ]
            }] }
];
/** @nocollapse */
SourceRasterComponent.ctorParameters = () => [
    { type: LayerImageComponent, decorators: [{ type: Host }] }
];
SourceRasterComponent.propDecorators = {
    operation: [{ type: Input }],
    threads: [{ type: Input }],
    lib: [{ type: Input }],
    operationType: [{ type: Input }],
    beforeOperations: [{ type: Output }],
    afterOperations: [{ type: Output }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceXYZComponent extends SourceComponent {
    /**
     * @param {?} layer
     * @param {?=} raster
     */
    constructor(layer, raster) {
        super(layer, raster);
        this.tileLoadStart = new EventEmitter();
        this.tileLoadEnd = new EventEmitter();
        this.tileLoadError = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        if (this.tileGridXYZ) {
            this.tileGrid = this.tileGridXYZ.instance;
        }
        this.init();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
            if (changes.hasOwnProperty(key)) {
                properties[key] = changes[key].currentValue;
            }
        }
        this.instance.setProperties(properties, false);
        if (changes.hasOwnProperty('url')) {
            this.init();
        }
    }
    /**
     * @return {?}
     */
    init() {
        this.instance = new XYZ(this);
        this.instance.on('tileloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadStart.emit(event)));
        this.instance.on('tileloadend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadEnd.emit(event)));
        this.instance.on('tileloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadError.emit(event)));
        this._register(this.instance);
    }
}
SourceXYZComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-xyz',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceXYZComponent)) }]
            }] }
];
/** @nocollapse */
SourceXYZComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Optional }, { type: Host }] },
    { type: SourceRasterComponent, decorators: [{ type: Optional }, { type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceOsmComponent extends SourceXYZComponent {
    /**
     * @param {?} layer
     * @param {?=} raster
     */
    constructor(layer, raster) {
        super(layer, raster);
        this.tileLoadStart = new EventEmitter();
        this.tileLoadEnd = new EventEmitter();
        this.tileLoadError = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        if (this.tileGridXYZ) {
            this.tileGrid = this.tileGridXYZ.instance;
        }
        this.instance = new OSM(this);
        this.instance.on('tileloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadStart.emit(event)));
        this.instance.on('tileloadend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadEnd.emit(event)));
        this.instance.on('tileloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.tileLoadError.emit(event)));
        this._register(this.instance);
    }
}
SourceOsmComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-osm',
                template: `
    <div class="aol-source-osm"></div>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceOsmComponent)) }]
            }] }
];
/** @nocollapse */
SourceOsmComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }, { type: Optional }] },
    { type: SourceRasterComponent, decorators: [{ type: Host }, { type: Optional }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceBingmapsComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
        this.imagerySet = 'Aerial';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new BingMaps(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceBingmapsComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-bingmaps',
                template: `
    <div class="aol-source-bingmaps"></div>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceBingmapsComponent)) }]
            }] }
];
/** @nocollapse */
SourceBingmapsComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceVectorComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Vector$1(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceVectorComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-vector',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceVectorComponent)) }]
            }] }
];
/** @nocollapse */
SourceVectorComponent.ctorParameters = () => [
    { type: LayerVectorComponent, decorators: [{ type: Host }] }
];
SourceVectorComponent.propDecorators = {
    overlaps: [{ type: Input }],
    useSpatialIndex: [{ type: Input }],
    wrapX: [{ type: Input }],
    url: [{ type: Input }],
    format: [{ type: Input }],
    strategy: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceClusterComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.source = this.sourceVectorComponent.instance;
        this.instance = new Cluster(this);
        this.host.instance.setSource(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance && changes.hasOwnProperty('distance')) {
            this.instance.setDistance(this.distance);
        }
    }
}
SourceClusterComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-cluster',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceClusterComponent)) }]
            }] }
];
/** @nocollapse */
SourceClusterComponent.ctorParameters = () => [
    { type: LayerVectorComponent, decorators: [{ type: Host }] }
];
SourceClusterComponent.propDecorators = {
    distance: [{ type: Input }],
    geometryFunction: [{ type: Input }],
    wrapX: [{ type: Input }],
    sourceVectorComponent: [{ type: ContentChild, args: [SourceVectorComponent,] }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class TileGridWMTSComponent extends TileGridComponent {
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new WMTS(this);
    }
}
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceTileWMTSComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
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
    }
    /**
     * @return {?}
     */
    setLayerSource() {
        this.instance = new WMTS$1(this);
        this.host.instance.setSource(this.instance);
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        if (this.tileGridWMTS) {
            this.tileGrid = this.tileGridWMTS.instance;
            this.setLayerSource();
        }
    }
}
SourceTileWMTSComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-tilewmts',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceTileWMTSComponent)) }]
            }] }
];
/** @nocollapse */
SourceTileWMTSComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class FormatComponent {
    constructor() {
        this.componentType = 'format';
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceVectorTileComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /* need the children to construct the OL3 object */
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.format = this.formatComponent.instance;
        this.tileGrid = this.tileGridComponent.instance;
        // console.log('creating ol.source.VectorTile instance with:', this);
        this.instance = new VectorTile$1(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceVectorTileComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-vectortile',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceVectorTileComponent)) }]
            }] }
];
/** @nocollapse */
SourceVectorTileComponent.ctorParameters = () => [
    { type: LayerVectorTileComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceTileWMSComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new TileWMS(this);
        this.host.instance.setSource(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    }
}
SourceTileWMSComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-tilewms',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceTileWMSComponent)) }]
            }] }
];
/** @nocollapse */
SourceTileWMSComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceTileJSONComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new TileJSON(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceTileJSONComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-tilejson',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceTileJSONComponent)) }]
            }] }
];
/** @nocollapse */
SourceTileJSONComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
SourceTileJSONComponent.propDecorators = {
    url: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceGeoJSONComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.format = new GeoJSON(this);
        this.instance = new Vector$1(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceGeoJSONComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-geojson',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceGeoJSONComponent)) }]
            }] }
];
/** @nocollapse */
SourceGeoJSONComponent.ctorParameters = () => [
    { type: LayerVectorComponent, decorators: [{ type: Host }] }
];
SourceGeoJSONComponent.propDecorators = {
    defaultDataProjection: [{ type: Input }],
    featureProjection: [{ type: Input }],
    geometryName: [{ type: Input }],
    url: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceImageStaticComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
        this.onImageLoadStart = new EventEmitter();
        this.onImageLoadEnd = new EventEmitter();
        this.onImageLoadError = new EventEmitter();
    }
    /**
     * @return {?}
     */
    setLayerSource() {
        this.instance = new ImageStatic(this);
        this.host.instance.setSource(this.instance);
        this.instance.on('imageloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadStart.emit(event)));
        this.instance.on('imageloadend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadEnd.emit(event)));
        this.instance.on('imageloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadError.emit(event)));
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.setLayerSource();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        /** @type {?} */
        const properties = {};
        if (!this.instance) {
            return;
        }
        for (const key in changes) {
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
    }
}
SourceImageStaticComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-imagestatic',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceImageStaticComponent)) }]
            }] }
];
/** @nocollapse */
SourceImageStaticComponent.ctorParameters = () => [
    { type: LayerImageComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceImageWMSComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
        this.onImageLoadStart = new EventEmitter();
        this.onImageLoadEnd = new EventEmitter();
        this.onImageLoadError = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new ImageWMS(this);
        this.host.instance.setSource(this.instance);
        this.instance.on('imageloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadStart.emit(event)));
        this.instance.on('imageloadend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadEnd.emit(event)));
        this.instance.on('imageloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadError.emit(event)));
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    }
}
SourceImageWMSComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-imagewms',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceImageWMSComponent)) }]
            }] }
];
/** @nocollapse */
SourceImageWMSComponent.ctorParameters = () => [
    { type: LayerImageComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceImageArcGISRestComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
        this.ratio = 1.5;
        this.onImageLoadStart = new EventEmitter();
        this.onImageLoadEnd = new EventEmitter();
        this.onImageLoadError = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new ImageArcGISRest(this);
        this.host.instance.setSource(this.instance);
        this.instance.on('imageloadstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadStart.emit(event)));
        this.instance.on('imageloadend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadEnd.emit(event)));
        this.instance.on('imageloaderror', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onImageLoadError.emit(event)));
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance && changes.hasOwnProperty('params')) {
            this.instance.updateParams(this.params);
        }
    }
}
SourceImageArcGISRestComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-imagearcgisrest',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceImageArcGISRestComponent)) }]
            }] }
];
/** @nocollapse */
SourceImageArcGISRestComponent.ctorParameters = () => [
    { type: LayerImageComponent, decorators: [{ type: Host }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class FeatureComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
        this.host = host;
        this.componentType = 'feature';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Feature();
        if (this.id !== undefined) {
            this.instance.setId(this.id);
        }
        this.host.instance.addFeature(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.host.instance.removeFeature(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance) {
            this.instance.setId(this.id);
        }
    }
}
FeatureComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-feature',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
FeatureComponent.ctorParameters = () => [
    { type: SourceVectorComponent }
];
FeatureComponent.propDecorators = {
    id: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @abstract
 */
class SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        this.map = map;
        this.host = host;
        this.componentType = 'simple-geometry';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.host.instance.setGeometry(this.instance);
    }
}
SimpleGeometryComponent.propDecorators = {
    srid: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryCircleComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-circle';
        // defaulting coordinates to [0,0]. To be overridden in child component.
        this.instance = new Circle([0, 0]);
    }
    /**
     * @return {?}
     */
    get radius() {
        return this.instance.getRadius();
    }
    /**
     * @param {?} radius
     * @return {?}
     */
    set radius(radius) {
        this.instance.setRadius(radius);
    }
}
GeometryCircleComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-circle',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryCircleComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];
GeometryCircleComponent.propDecorators = {
    radius: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryLinestringComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-linestring';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new LineString([[0, 0], [1, 1]]);
        super.ngOnInit();
    }
}
GeometryLinestringComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-linestring',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryLinestringComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryMultiLinestringComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-multilinestring';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new MultiLineString([[[0, 0], [1, 1]]]);
        super.ngOnInit();
    }
}
GeometryMultiLinestringComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-multilinestring',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryMultiLinestringComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryMultiPointComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-multipoint';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new MultiPoint([[0, 0], [1, 1]]);
        super.ngOnInit();
    }
}
GeometryMultiPointComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-multipoint',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryMultiPointComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryMultiPolygonComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-multipolygon';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new MultiPolygon([[[[0, 0], [1, 1], [0, 1]]]]);
        super.ngOnInit();
    }
}
GeometryMultiPolygonComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-multipolygon',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryMultiPolygonComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryPointComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-point';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Point([0, 0]);
        super.ngOnInit();
    }
}
GeometryPointComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-point',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryPointComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class GeometryPolygonComponent extends SimpleGeometryComponent {
    /**
     * @param {?} map
     * @param {?} host
     */
    constructor(map, host) {
        super(map, host);
        this.componentType = 'geometry-polygon';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Polygon([[[0, 0], [1, 1], [0, 1]]]);
        super.ngOnInit();
    }
}
GeometryPolygonComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-geometry-polygon',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
GeometryPolygonComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: FeatureComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ContentComponent {
    /**
     * @param {?} elementRef
     */
    constructor(elementRef) {
        this.elementRef = elementRef;
    }
}
ContentComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-content',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
ContentComponent.ctorParameters = () => [
    { type: ElementRef }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class OverlayComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.componentType = 'overlay';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        if (this.content) {
            this.element = this.content.elementRef.nativeElement;
            this.instance = new Overlay(this);
            this.map.instance.addOverlay(this.instance);
        }
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this.instance) {
            this.map.instance.removeOverlay(this.instance);
        }
    }
}
OverlayComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-overlay',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
OverlayComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class CoordinateComponent {
    /**
     * @param {?} map
     * @param {?} viewHost
     * @param {?} geometryPointHost
     * @param {?} geometryCircleHost
     * @param {?} overlayHost
     */
    constructor(map, viewHost, geometryPointHost, geometryCircleHost, overlayHost) {
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
    ngOnInit() {
        this.map.instance.on('change:view', (/**
         * @param {?} e
         * @return {?}
         */
        e => this.onMapViewChanged(e)));
        this.mapSrid = this.map.instance
            .getView()
            .getProjection()
            .getCode();
        this.transformCoordinates();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        this.transformCoordinates();
    }
    /**
     * @private
     * @param {?} event
     * @return {?}
     */
    onMapViewChanged(event) {
        this.mapSrid = event.target
            .get(event.key)
            .getProjection()
            .getCode();
        this.transformCoordinates();
    }
    /**
     * @private
     * @return {?}
     */
    transformCoordinates() {
        /** @type {?} */
        let transformedCoordinates;
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
    }
}
CoordinateComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-coordinate',
                template: `
    <div class="aol-coordinate"></div>
  `
            }] }
];
/** @nocollapse */
CoordinateComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: ViewComponent, decorators: [{ type: Optional }] },
    { type: GeometryPointComponent, decorators: [{ type: Optional }] },
    { type: GeometryCircleComponent, decorators: [{ type: Optional }] },
    { type: OverlayComponent, decorators: [{ type: Optional }] }
];
CoordinateComponent.propDecorators = {
    x: [{ type: Input }],
    y: [{ type: Input }],
    srid: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class CollectionCoordinatesComponent {
    /**
     * @param {?} map
     * @param {?} geometryLinestring
     * @param {?} geometryPolygon
     * @param {?} geometryMultipoint
     * @param {?} geometryMultilinestring
     * @param {?} geometryMultipolygon
     */
    constructor(map, geometryLinestring, geometryPolygon, geometryMultipoint, geometryMultilinestring, geometryMultipolygon) {
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
    ngOnInit() {
        this.map.instance.on('change:view', (/**
         * @param {?} e
         * @return {?}
         */
        e => this.onMapViewChanged(e)));
        this.mapSrid = this.map.instance
            .getView()
            .getProjection()
            .getCode();
        this.transformCoordinates();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        this.transformCoordinates();
    }
    /**
     * @private
     * @param {?} event
     * @return {?}
     */
    onMapViewChanged(event) {
        this.mapSrid = event.target
            .get(event.key)
            .getProjection()
            .getCode();
        this.transformCoordinates();
    }
    /**
     * @private
     * @return {?}
     */
    transformCoordinates() {
        /** @type {?} */
        let transformedCoordinates;
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
                    c => transform(c, this.srid, this.mapSrid)));
                    break;
                case 'geometry-polygon':
                case 'geometry-multilinestring':
                    transformedCoordinates = ((/** @type {?} */ (this.coordinates))).map((/**
                     * @param {?} cc
                     * @return {?}
                     */
                    cc => cc.map((/**
                     * @param {?} c
                     * @return {?}
                     */
                    c => transform(c, this.srid, this.mapSrid)))));
                    break;
                case 'geometry-multipolygon':
                    transformedCoordinates = ((/** @type {?} */ (this.coordinates))).map((/**
                     * @param {?} ccc
                     * @return {?}
                     */
                    ccc => ccc.map((/**
                     * @param {?} cc
                     * @return {?}
                     */
                    cc => cc.map((/**
                     * @param {?} c
                     * @return {?}
                     */
                    c => transform(c, this.srid, this.mapSrid)))))));
                    break;
            }
        }
        this.host.instance.setCoordinates(transformedCoordinates);
    }
}
CollectionCoordinatesComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-collection-coordinates',
                template: `
    <div class="aol-collection-coordinates"></div>
  `
            }] }
];
/** @nocollapse */
CollectionCoordinatesComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: GeometryLinestringComponent, decorators: [{ type: Optional }] },
    { type: GeometryPolygonComponent, decorators: [{ type: Optional }] },
    { type: GeometryMultiPointComponent, decorators: [{ type: Optional }] },
    { type: GeometryMultiLinestringComponent, decorators: [{ type: Optional }] },
    { type: GeometryMultiPolygonComponent, decorators: [{ type: Optional }] }
];
CollectionCoordinatesComponent.propDecorators = {
    coordinates: [{ type: Input }],
    srid: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class StyleComponent {
    /**
     * @param {?} featureHost
     * @param {?} layerHost
     */
    constructor(featureHost, layerHost) {
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
    update() {
        // console.log('updating style\'s host: ', this.host);
        this.host.instance.changed();
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log('creating aol-style instance with: ', this);
        this.instance = new Style(this);
        this.host.instance.setStyle(this.instance);
    }
}
StyleComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
StyleComponent.ctorParameters = () => [
    { type: FeatureComponent, decorators: [{ type: Optional }] },
    { type: LayerVectorComponent, decorators: [{ type: Optional }] }
];
StyleComponent.propDecorators = {
    geometry: [{ type: Input }],
    fill: [{ type: Input }],
    image: [{ type: Input }],
    stroke: [{ type: Input }],
    text: [{ type: Input }],
    zIndex: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class StyleCircleComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
        this.host = host;
        this.componentType = 'style-circle';
    }
    /**
     * WORK-AROUND: since the re-rendering is not triggered on style change
     * we trigger a radius change.
     * see openlayers #6233 and #5775
     * @return {?}
     */
    update() {
        if (!!this.instance) {
            // console.log('setting ol.style.Circle instance\'s radius');
            this.instance.setRadius(this.radius);
        }
        this.host.update();
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        // console.log('creating ol.style.Circle instance with: ', this);
        this.instance = new Circle$1(this);
        this.host.instance.setImage(this.instance);
        this.host.update();
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (!this.instance) {
            return;
        }
        if (changes['radius']) {
            this.instance.setRadius(changes['radius'].currentValue);
        }
        // console.log('changes detected in aol-style-circle, setting new radius: ', changes['radius'].currentValue);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-style-circle');
        this.host.instance.setImage(null);
    }
}
StyleCircleComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style-circle',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
StyleCircleComponent.ctorParameters = () => [
    { type: StyleComponent, decorators: [{ type: Host }] }
];
StyleCircleComponent.propDecorators = {
    fill: [{ type: Input }],
    radius: [{ type: Input }],
    snapToPixel: [{ type: Input }],
    stroke: [{ type: Input }],
    atlasManager: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class StyleTextComponent {
    /**
     * @param {?} host
     */
    constructor(host) {
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
    ngOnInit() {
        // console.log('creating ol.style.Text instance with: ', this);
        this.instance = new Text(this);
        this.host.instance.setText(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
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
    }
}
StyleTextComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style-text',
                template: `
    <div class="aol-style-text"></div>
  `
            }] }
];
/** @nocollapse */
StyleTextComponent.ctorParameters = () => [
    { type: StyleComponent, decorators: [{ type: Optional }] }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class StyleStrokeComponent {
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
        // console.log('creating aol-style-stroke with: ', this);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
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
    }
}
StyleStrokeComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-style-stroke',
                template: `
    <div class="aol-style-stroke"></div>
  `
            }] }
];
/** @nocollapse */
StyleStrokeComponent.ctorParameters = () => [
    { type: StyleComponent, decorators: [{ type: Optional }] },
    { type: StyleCircleComponent, decorators: [{ type: Optional }] },
    { type: StyleTextComponent, decorators: [{ type: Optional }] }
];
StyleStrokeComponent.propDecorators = {
    color: [{ type: Input }],
    lineCap: [{ type: Input }],
    lineDash: [{ type: Input }],
    lineJoin: [{ type: Input }],
    miterLimit: [{ type: Input }],
    width: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class StyleIconComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class StyleFillComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DefaultControlComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // console.log('ol.control.defaults init: ', this);
        this.instance = defaults(this);
        this.instance.forEach((/**
         * @param {?} c
         * @return {?}
         */
        c => this.map.instance.addControl(c)));
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-defaults');
        this.instance.forEach((/**
         * @param {?} c
         * @return {?}
         */
        c => this.map.instance.removeControl(c)));
    }
}
DefaultControlComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-defaults',
                template: ''
            }] }
];
/** @nocollapse */
DefaultControlComponent.ctorParameters = () => [
    { type: MapComponent }
];
DefaultControlComponent.propDecorators = {
    attribution: [{ type: Input }],
    attributionOptions: [{ type: Input }],
    rotate: [{ type: Input }],
    rotateOptions: [{ type: Input }],
    zoom: [{ type: Input }],
    zoomOptions: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.componentType = 'control';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        if (this.content) {
            this.element = this.content.elementRef.nativeElement;
            this.instance = new Control(this);
            this.map.instance.addControl(this.instance);
        }
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this.instance) {
            this.map.instance.removeControl(this.instance);
        }
    }
}
ControlComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlComponent.propDecorators = {
    content: [{ type: ContentChild, args: [ContentComponent,] }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlAttributionComponent {
    /**
     * @param {?} map
     * @param {?} element
     */
    constructor(map, element) {
        this.map = map;
        this.element = element;
        this.componentType = 'control';
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.target = this.element.nativeElement;
        // console.log('ol.control.Attribution init: ', this);
        this.instance = new Attribution(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-attribution');
        this.map.instance.removeControl(this.instance);
    }
}
ControlAttributionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-attribution',
                template: ``
            }] }
];
/** @nocollapse */
ControlAttributionComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: ElementRef }
];
ControlAttributionComponent.propDecorators = {
    collapsible: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlFullScreenComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        // console.log('instancing aol-control-fullscreen');
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new FullScreen(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-fullscreen');
        this.map.instance.removeControl(this.instance);
    }
}
ControlFullScreenComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-fullscreen',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlFullScreenComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlFullScreenComponent.propDecorators = {
    className: [{ type: Input }],
    label: [{ type: Input }],
    labelActive: [{ type: Input }],
    tipLabel: [{ type: Input }],
    keys: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlMousePositionComponent {
    /**
     * @param {?} map
     * @param {?} element
     */
    constructor(map, element) {
        this.map = map;
        this.element = element;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.target = this.element.nativeElement;
        // console.log('ol.control.MousePosition init: ', this);
        this.instance = new MousePosition(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-mouseposition');
        this.map.instance.removeControl(this.instance);
    }
}
ControlMousePositionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-mouseposition',
                template: ``
            }] }
];
/** @nocollapse */
ControlMousePositionComponent.ctorParameters = () => [
    { type: MapComponent },
    { type: ElementRef }
];
ControlMousePositionComponent.propDecorators = {
    coordinateFormat: [{ type: Input }],
    projection: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlOverviewMapComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeControl(this.instance);
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        if (this.instance != null && changes.hasOwnProperty('view')) {
            this.reloadInstance();
        }
    }
    /**
     * @private
     * @return {?}
     */
    reloadInstance() {
        this.map.instance.removeControl(this.instance);
        this.instance = new OverviewMap(this);
        this.map.instance.addControl(this.instance);
    }
}
ControlOverviewMapComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-overviewmap',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlOverviewMapComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlRotateComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        // console.log('instancing aol-control-rotate');
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Rotate(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-rotate');
        this.map.instance.removeControl(this.instance);
    }
}
ControlRotateComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-rotate',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlRotateComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlRotateComponent.propDecorators = {
    className: [{ type: Input }],
    label: [{ type: Input }],
    tipLabel: [{ type: Input }],
    duration: [{ type: Input }],
    autoHide: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlScaleLineComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        // console.log('instancing aol-control-scaleline');
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new ScaleLine(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-scaleline');
        this.map.instance.removeControl(this.instance);
    }
}
ControlScaleLineComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-scaleline',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlScaleLineComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlScaleLineComponent.propDecorators = {
    units: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlZoomComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        // console.log('instancing aol-control-zoom');
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Zoom(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-zoom');
        this.map.instance.removeControl(this.instance);
    }
}
ControlZoomComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-zoom',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlZoomComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlZoomComponent.propDecorators = {
    duration: [{ type: Input }],
    zoomInLabel: [{ type: Input }],
    zoomOutLabel: [{ type: Input }],
    zoomInTipLabel: [{ type: Input }],
    zoomOutTipLabel: [{ type: Input }],
    delta: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlZoomSliderComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        // console.log('instancing aol-control-zoomslider');
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new ZoomSlider(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-zoomslider');
        this.map.instance.removeControl(this.instance);
    }
}
ControlZoomSliderComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-zoomslider',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlZoomSliderComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlZoomSliderComponent.propDecorators = {
    className: [{ type: Input }],
    duration: [{ type: Input }],
    maxResolution: [{ type: Input }],
    minResolution: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ControlZoomToExtentComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        // console.log('instancing aol-control-zoomtoextent');
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new ZoomToExtent(this);
        this.map.instance.addControl(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        // console.log('removing aol-control-zoomtoextent');
        this.map.instance.removeControl(this.instance);
    }
}
ControlZoomToExtentComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-control-zoomtoextent',
                template: `
    <ng-content></ng-content>
  `
            }] }
];
/** @nocollapse */
ControlZoomToExtentComponent.ctorParameters = () => [
    { type: MapComponent }
];
ControlZoomToExtentComponent.propDecorators = {
    className: [{ type: Input }],
    label: [{ type: Input }],
    tipLabel: [{ type: Input }],
    extent: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class FormatMVTComponent extends FormatComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DefaultInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = defaults$1();
        this.instance.forEach((/**
         * @param {?} i
         * @return {?}
         */
        i => this.map.instance.addInteraction(i)));
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.instance.forEach((/**
         * @param {?} i
         * @return {?}
         */
        i => this.map.instance.removeInteraction(i)));
    }
}
DefaultInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-default',
                template: ''
            }] }
];
/** @nocollapse */
DefaultInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class FreeboardInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.interactions = [];
    }
    /**
     * @return {?}
     */
    ngOnInit() {
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
        i => this.map.instance.addInteraction(i)));
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.interactions.forEach((/**
         * @param {?} i
         * @return {?}
         */
        i => this.map.instance.removeInteraction(i)));
    }
}
FreeboardInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-freeboard',
                template: ''
            }] }
];
/** @nocollapse */
FreeboardInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DoubleClickZoomInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DoubleClickZoom(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DoubleClickZoomInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-doubleclickzoom',
                template: ''
            }] }
];
/** @nocollapse */
DoubleClickZoomInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DoubleClickZoomInteractionComponent.propDecorators = {
    duration: [{ type: Input }],
    delta: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DragAndDropInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DragAndDrop(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DragAndDropInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-draganddrop',
                template: ''
            }] }
];
/** @nocollapse */
DragAndDropInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DragAndDropInteractionComponent.propDecorators = {
    formatConstructors: [{ type: Input }],
    projection: [{ type: Input }],
    target: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DragBoxInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DragBox(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DragBoxInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-dragbox',
                template: ''
            }] }
];
/** @nocollapse */
DragBoxInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DragBoxInteractionComponent.propDecorators = {
    className: [{ type: Input }],
    condition: [{ type: Input }],
    boxEndCondition: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DragPanInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DragPan(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DragPanInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-dragpan',
                template: ''
            }] }
];
/** @nocollapse */
DragPanInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DragPanInteractionComponent.propDecorators = {
    condition: [{ type: Input }],
    kinetic: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DragRotateInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DragRotate(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DragRotateInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-dragrotate',
                template: ''
            }] }
];
/** @nocollapse */
DragRotateInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DragRotateInteractionComponent.propDecorators = {
    condition: [{ type: Input }],
    duration: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DragRotateAndZoomInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DragRotateAndZoom(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DragRotateAndZoomInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-dragrotateandzoom',
                template: ''
            }] }
];
/** @nocollapse */
DragRotateAndZoomInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DragRotateAndZoomInteractionComponent.propDecorators = {
    condition: [{ type: Input }],
    duration: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DragZoomInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new DragZoom(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DragZoomInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-dragzoom',
                template: ''
            }] }
];
/** @nocollapse */
DragZoomInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
DragZoomInteractionComponent.propDecorators = {
    className: [{ type: Input }],
    condition: [{ type: Input }],
    duration: [{ type: Input }],
    out: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class MouseWheelZoomInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new MouseWheelZoom(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
MouseWheelZoomInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-mousewheelzoom',
                template: ''
            }] }
];
/** @nocollapse */
MouseWheelZoomInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
MouseWheelZoomInteractionComponent.propDecorators = {
    duration: [{ type: Input }],
    timeout: [{ type: Input }],
    useAnchor: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class PinchZoomInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new PinchZoom(this);
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
PinchZoomInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-pinchzoom',
                template: ''
            }] }
];
/** @nocollapse */
PinchZoomInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
PinchZoomInteractionComponent.propDecorators = {
    duration: [{ type: Input }],
    constrainResolution: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class DrawInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
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
    ngOnInit() {
        this.instance = new Draw(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChange.emit(event)));
        this.instance.on('change:active', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChangeActive.emit(event)));
        this.instance.on('drawend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onDrawEnd.emit(event)));
        this.instance.on('drawstart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onDrawStart.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
DrawInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-draw',
                template: ''
            }] }
];
/** @nocollapse */
DrawInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SelectInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
        this.map = map;
        this.onChange = new EventEmitter();
        this.onSelect = new EventEmitter();
        this.onPropertyChange = new EventEmitter();
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new Select(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChange.emit(event)));
        this.instance.on('select', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onSelect.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
SelectInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-select',
                template: ''
            }] }
];
/** @nocollapse */
SelectInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class ModifyInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
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
    ngOnInit() {
        this.instance = new Modify(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChange.emit(event)));
        this.instance.on('change:active', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChangeActive.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.instance.on('modifyend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onModifyEnd.emit(event)));
        this.instance.on('modifystart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onModifyStart.emit(event)));
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
ModifyInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-modify',
                template: ''
            }] }
];
/** @nocollapse */
ModifyInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class TranslateInteractionComponent {
    /**
     * @param {?} map
     */
    constructor(map) {
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
    ngOnInit() {
        this.instance = new Translate(this);
        this.instance.on('change', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onChange.emit(event)));
        this.instance.on('propertychange', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onPropertyChange.emit(event)));
        this.instance.on('translateend', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onTranslateEnd.emit(event)));
        this.instance.on('translatestart', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onTranslateStart.emit(event)));
        this.instance.on('translating', (/**
         * @param {?} event
         * @return {?}
         */
        (event) => this.onTranslating.emit(event)));
        this.map.instance.addInteraction(this.instance);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.map.instance.removeInteraction(this.instance);
    }
}
TranslateInteractionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-interaction-translate',
                template: ''
            }] }
];
/** @nocollapse */
TranslateInteractionComponent.ctorParameters = () => [
    { type: MapComponent }
];
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class AttributionComponent {
    /**
     * @param {?} elementRef
     */
    constructor(elementRef) {
        this.elementRef = elementRef;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.html = this.elementRef.nativeElement.innerHTML;
        this.instance = new Attribution(this);
    }
}
AttributionComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-attribution',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
AttributionComponent.ctorParameters = () => [
    { type: ElementRef }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class AttributionsComponent {
    /**
     * @param {?} source
     */
    constructor(source) {
        this.source = source;
    }
    /* we can do this at the very end */
    /**
     * @return {?}
     */
    ngAfterViewInit() {
        if (this.attributions.length) {
            this.instance = this.attributions.map((/**
             * @param {?} cmp
             * @return {?}
             */
            cmp => cmp.instance));
            // console.log('setting attributions:', this.instance);
            this.source.instance.setAttributions(this.instance);
        }
    }
}
AttributionsComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-attributions',
                template: '<ng-content></ng-content>'
            }] }
];
/** @nocollapse */
AttributionsComponent.ctorParameters = () => [
    { type: SourceComponent, decorators: [{ type: Host }] }
];
AttributionsComponent.propDecorators = {
    attributions: [{ type: ContentChildren, args: [AttributionComponent,] }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
class SourceUTFGridComponent extends SourceComponent {
    /**
     * @param {?} layer
     */
    constructor(layer) {
        super(layer);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.instance = new UTFGrid(this);
        this.host.instance.setSource(this.instance);
    }
}
SourceUTFGridComponent.decorators = [
    { type: Component, args: [{
                selector: 'aol-source-utfgrid',
                template: `
    <ng-content></ng-content>
  `,
                providers: [{ provide: SourceComponent, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => SourceUTFGridComponent)) }]
            }] }
];
/** @nocollapse */
SourceUTFGridComponent.ctorParameters = () => [
    { type: LayerTileComponent, decorators: [{ type: Host }] }
];
SourceUTFGridComponent.propDecorators = {
    tileJSON: [{ type: Input }],
    url: [{ type: Input }]
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/** @type {?} */
const COMPONENTS = [
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
class AngularOpenlayersModule {
}
AngularOpenlayersModule.decorators = [
    { type: NgModule, args: [{
                declarations: COMPONENTS,
                imports: [CommonModule],
                exports: COMPONENTS,
            },] }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

export { MapComponent, ViewComponent, GraticuleComponent, LayerGroupComponent, LayerImageComponent, LayerTileComponent, LayerVectorComponent, LayerVectorTileComponent, SourceOsmComponent, SourceBingmapsComponent, SourceClusterComponent, SourceUTFGridComponent, SourceVectorComponent, SourceXYZComponent, SourceVectorTileComponent, SourceTileWMSComponent, SourceTileWMTSComponent, SourceTileJSONComponent, SourceGeoJSONComponent, SourceImageStaticComponent, SourceImageWMSComponent, SourceRasterComponent, SourceImageArcGISRestComponent, FeatureComponent, GeometryLinestringComponent, GeometryMultiLinestringComponent, GeometryMultiPointComponent, GeometryMultiPolygonComponent, GeometryPointComponent, GeometryPolygonComponent, GeometryCircleComponent, CoordinateComponent, CollectionCoordinatesComponent, StyleComponent, StyleCircleComponent, StyleFillComponent, StyleIconComponent, StyleStrokeComponent, StyleTextComponent, DefaultControlComponent, ControlComponent, ControlAttributionComponent, ControlFullScreenComponent, ControlMousePositionComponent, ControlOverviewMapComponent, ControlRotateComponent, ControlScaleLineComponent, ControlZoomComponent, ControlZoomSliderComponent, ControlZoomToExtentComponent, FormatMVTComponent, TileGridComponent, TileGridWMTSComponent, DefaultInteractionComponent, FreeboardInteractionComponent, DoubleClickZoomInteractionComponent, DragAndDropInteractionComponent, DragBoxInteractionComponent, DragPanInteractionComponent, DragRotateInteractionComponent, DragRotateAndZoomInteractionComponent, DragZoomInteractionComponent, MouseWheelZoomInteractionComponent, PinchZoomInteractionComponent, DrawInteractionComponent, SelectInteractionComponent, ModifyInteractionComponent, TranslateInteractionComponent, OverlayComponent, ContentComponent, AttributionsComponent, AttributionComponent, AngularOpenlayersModule, FormatComponent as ɵc, SimpleGeometryComponent as ɵd, LayerComponent as ɵa, SourceComponent as ɵb };

//# sourceMappingURL=ngx-openlayers.js.map