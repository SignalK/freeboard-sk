import { Component, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'ol-map > ol-content',
  template: '<ng-content></ng-content>',
  standalone: false
})
export class ContentComponent {
  protected elementRef = inject(ElementRef);

  constructor() {}
}
