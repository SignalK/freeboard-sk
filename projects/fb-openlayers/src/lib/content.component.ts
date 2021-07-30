import {Component, ElementRef} from '@angular/core';

@Component({
    selector: 'ol-map > ol-content',
    template: '<ng-content></ng-content>'
})
export class ContentComponent {

    constructor(public elementRef: ElementRef) {
    }
}
