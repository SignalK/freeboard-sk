// The extension actions (capability `actions`) for the target a feature popover
// shows: placed after the popover's own buttons, grouped and named by
// extension. The popover's title names the target.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { PlotterExtensionService } from './plotterext.service';
import type { SelectedTarget, UsableAction } from './actions';

/** More than this many actions go into a menu instead of a row of buttons. */
export const POPOVER_ACTION_BUTTONS = 4;

@Component({
  selector: 'fb-ext-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    @if (actions().length > maxButtons) {
      <div class="ext-actions">
        <button mat-button [matMenuTriggerFor]="more">
          <mat-icon>extension</mat-icon>
          EXTENSIONS
        </button>
        <mat-menu #more="matMenu">
          @for (a of actions(); track a.extension + '/' + a.action.id) {
            <button mat-menu-item (click)="choose(a)">
              <mat-icon>{{ a.action.icon || 'extension' }}</mat-icon>
              <span>{{ a.action.title }}</span>
              <span class="ext-source">{{ a.extensionName }}</span>
            </button>
          }
        </mat-menu>
      </div>
    } @else {
      @for (g of groups(); track g.extension) {
        <div class="ext-actions">
          <div class="ext-source">{{ g.name }}</div>
          <div class="ext-buttons">
            @for (a of g.actions; track a.action.id) {
              <button mat-button (click)="choose(a)">
                <mat-icon>{{ a.action.icon || 'extension' }}</mat-icon>
                {{ a.action.title }}
              </button>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .ext-actions {
        border-top: 1px solid rgba(128, 128, 128, 0.3);
        margin-top: 6px;
        padding-top: 2px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .ext-buttons {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .ext-source {
        font-size: 11px;
        opacity: 0.7;
        margin-left: 12px;
      }
    `
  ]
})
export class ExtActionsComponent {
  /** The target the popover shows; no target, no actions. */
  target = input<SelectedTarget | null | undefined>();
  /** The user chose an action (it has been invoked). */
  chosen = output<void>();

  protected readonly maxButtons = POPOVER_ACTION_BUTTONS;
  private service = inject(PlotterExtensionService);

  protected actions = computed<UsableAction[]>(() => {
    const t = this.target();
    return t ? this.service.actionsFor(t) : [];
  });

  protected groups = computed(() => {
    const groups: Array<{
      extension: string;
      name: string;
      actions: UsableAction[];
    }> = [];
    for (const a of this.actions()) {
      const g = groups.find((x) => x.extension === a.extension);
      if (g) g.actions.push(a);
      else
        groups.push({
          extension: a.extension,
          name: a.extensionName,
          actions: [a]
        });
    }
    return groups;
  });

  protected choose(a: UsableAction) {
    const t = this.target();
    if (!t) return;
    this.service.invokeAction(a.extension, a.action.id, t);
    this.chosen.emit();
  }
}
