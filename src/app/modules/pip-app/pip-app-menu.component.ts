import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { WebappEntry } from 'src/app/lib/webapps';
import { CustomUrlResult, PipAppCustomUrlDialog } from './custom-url-dialog';
import { PipAppService } from './pip-app.service';

/** Toolbar button and menu that open, find and close PiP App windows. */
@Component({
  selector: 'fb-pip-app-menu',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="button-toolbar"
      mat-mini-fab
      matTooltip="PiP App"
      matTooltipPosition="before"
      [matMenuTriggerFor]="pipmenu"
      (menuOpened)="service.refreshWebapps()"
    >
      <mat-icon>picture_in_picture_alt</mat-icon>
    </button>
    <mat-menu #pipmenu="matMenu" xPosition="before">
      @for (a of service.webapps(); track a.url) {
        <button
          mat-menu-item
          [title]="a.description || ''"
          (click)="openWebapp(a)"
        >
          <mat-icon>web_asset</mat-icon>
          <span>{{ a.name }}</span>
        </button>
      } @empty {
        <button mat-menu-item disabled>
          <span>No other webapps installed</span>
        </button>
      }
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="openCustom()">
        <mat-icon>link</mat-icon>
        <span>Custom address…</span>
      </button>
      @if (service.windows().length) {
        <mat-divider></mat-divider>
        @for (w of service.windows(); track w.id) {
          <button mat-menu-item (click)="service.focus(w.id)">
            <mat-icon>flip_to_front</mat-icon>
            <span>{{ w.title }}</span>
          </button>
        }
        <button mat-menu-item (click)="service.closeAll()">
          <mat-icon>close</mat-icon>
          <span>Close all</span>
        </button>
      }
    </mat-menu>
  `
})
export class PipAppMenuComponent {
  protected service = inject(PipAppService);
  private app = inject(AppFacade);
  private dialog = inject(MatDialog);

  protected openWebapp(a: WebappEntry) {
    if (!this.service.open({ kind: 'webapp', path: a.url }, a.name)) {
      this.app.showMessage(`${a.name} cannot be opened as a PiP App.`);
    }
  }

  protected openCustom() {
    this.dialog
      .open<PipAppCustomUrlDialog, void, CustomUrlResult>(
        PipAppCustomUrlDialog,
        { width: '480px', maxWidth: '96vw' }
      )
      .afterClosed()
      .subscribe((r) => {
        if (r) this.service.open(r.source, r.title);
      });
  }
}
