import { Component } from '@angular/core';

@Component({
  selector: 'fab-container',
  imports: [],
  template: `
    <div class="fb-fab-container">
      <ng-content> </ng-content>
    </div>
  `,
  styles: [
    `
      .fb-fab-container {
        position: absolute;
        bottom: 23px;
        right: 5px;
        z-index: 5000;
      }
    `
  ]
})
export class FABContainerComponent {
  constructor() {}
}
