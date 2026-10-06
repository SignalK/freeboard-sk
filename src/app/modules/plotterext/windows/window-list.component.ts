import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlotterExtensionService } from '../plotterext.service';
import { ExtWindowService } from './window.service';
import { ExtWindow } from './types';

/**
 * The user's list of open extension windows, hidden ones included: show and
 * raise one, or really close it (even a window whose own close control only
 * hides it). This is what keeps every window in the user's control, so a
 * broken or forgotten extension can never leave an unreachable window running.
 */
@Component({
  selector: 'fb-pe-window-list',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="button-toolbar"
      mat-mini-fab
      matTooltip="Extension windows"
      matTooltipPosition="before"
      aria-label="Extension windows"
      [matMenuTriggerFor]="list"
    >
      <mat-icon>filter_none</mat-icon>
    </button>
    <mat-menu #list="matMenu" xPosition="before">
      @for (w of service.windows(); track w.id) {
        <button
          mat-menu-item
          [matMenuTriggerFor]="actions"
          [matMenuTriggerData]="{ w: w }"
        >
          <mat-icon>{{ w.visible ? 'web_asset' : 'visibility_off' }}</mat-icon>
          <span>{{ w.title }}</span>
          <span class="pe-wl-ext">
            {{ extensionName(w) }}{{ w.visible ? '' : ' · hidden' }}
          </span>
        </button>
      }
    </mat-menu>
    <mat-menu #actions="matMenu">
      <ng-template matMenuContent let-w="w">
        <button mat-menu-item (click)="show(w)">
          <mat-icon>open_in_browser</mat-icon>
          <span>Show</span>
        </button>
        <button mat-menu-item (click)="service.close(w.id, 'user')">
          <mat-icon>close</mat-icon>
          <span>Close</span>
        </button>
      </ng-template>
    </mat-menu>
  `,
  styles: `
    .pe-wl-ext {
      margin-left: 8px;
      font-size: 12px;
      opacity: 0.7;
    }
  `
})
export class ExtWindowListComponent {
  protected service = inject(ExtWindowService);
  private host = inject(PlotterExtensionService);

  protected extensionName(w: ExtWindow): string {
    return this.host.manifests()[w.extension]?.name ?? w.extension;
  }

  protected show(w: ExtWindow) {
    this.service.update(w.id, { visible: true });
    if (w.collapsed) this.service.setCollapsed(w.id, false);
    this.service.focus(w.id);
  }
}
