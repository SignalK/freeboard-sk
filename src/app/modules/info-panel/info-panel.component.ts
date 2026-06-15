import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { InfoPanelFacade } from './info-panel.facade';

@Component({
  selector: 'info-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="position: relative">
      <mat-nav-list style="text-align:right">
        <a mat-list-item matIconButton (click)="close()">
          <mat-icon>close</mat-icon>
        </a>
        <mat-divider></mat-divider>
      </mat-nav-list>
    </div>
    <div
      style="
            position: fixed;
            bottom: 0;
            top: 60px;
            width: 247px;
        "
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: ``,
  imports: [MatListModule, MatIconModule]
})
export class InfoPanelComponent {
  closed = output<void>();
  protected infoPanel = inject(InfoPanelFacade);

  close() {
    this.infoPanel.close();
    this.closed.emit();
  }
}
