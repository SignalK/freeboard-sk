import {
  Component,
  ChangeDetectionStrategy,
  computed,
  Signal,
  output,
  inject
} from '@angular/core';

import { MatTooltip } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppFacade } from 'src/app/app.facade';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FBMapInteractService } from 'src/app/modules/map/fbmap-interact.service';
import { Measurements } from './measurements.component';
import { PopoverComponent } from 'src/app/modules/map/popovers/popover.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'fb-interact-help',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltip,
    MatToolbarModule,
    Measurements,
    PopoverComponent
  ],
  template: `
    @if (isRouteEditing()) {
      <!-- Unified route draw/modify helper: same ap-popover card as the
           feature popover (#2), docked in place. Finish = keep, ✕ = cancel. -->
      <div class="_ap_interact_dock">
        <ap-popover
          [docked]="true"
          [canClose]="true"
          [title]="mode.iconText"
          [icon]="{ class: '', name: mode.iconName }"
          (closed)="close()"
        >
          <fb-measurements
            [coords]="mapInteract.measurement().coords"
            [index]="mapInteract.measurement().index"
            [totalOnly]="mapInteract.isDrawing()"
            [card]="true"
          >
          </fb-measurements>
          @if (mode.steps.length !== 0) {
            <ol class="_ap_steps">
              @for (step of mode.steps; track step) {
                <li>{{ step }}</li>
              }
            </ol>
          }
          <div class="_ap_action_row">
            <div class="_ap_action_button">
              <button
                mat-button
                [disabled]="!mapInteract.canUndo()"
                (click)="undoLast()"
                matTooltip="Undo last change (Ctrl/Cmd-Z)"
                matTooltipPosition="after"
              >
                <mat-icon>undo</mat-icon>
                UNDO
              </button>
            </div>
            <div class="_ap_action_button">
              <button
                mat-button
                color="primary"
                [disabled]="!canFinish()"
                (click)="finishEditing()"
                [matTooltip]="
                  mapInteract.isModifying()
                    ? 'Save changes'
                    : 'Finish — keep changes'
                "
                matTooltipPosition="after"
              >
                <mat-icon>check</mat-icon>
                {{ mapInteract.isModifying() ? 'SAVE' : 'FINISH' }}
              </button>
            </div>
            <div class="_ap_action_button">
              <button
                mat-button
                class="icon-warn"
                (click)="close()"
                matTooltip="Cancel — discard changes"
                matTooltipPosition="after"
              >
                <mat-icon class="icon-warn">close</mat-icon>
                CANCEL
              </button>
            </div>
          </div>
        </ap-popover>
      </div>
    } @else {
      <div class="mat-app-background _ap_interact_help">
        @if (showHelpPanel()) {
          <div class="mat-app-background measurePanel">
            <div>
              <span style="font-weight: bold; padding: 5px">
                <mat-icon>{{ mode.iconName }}</mat-icon> {{ mode.iconText }}
              </span>
              @if (mode.description.length !== 0) {
                <div style="padding: 5px">
                  {{ mode.description }}
                </div>
              }
              @if (mode.steps.length !== 0) {
                <div style="padding: 5px">
                  <ol
                    style="
                  margin-block-start: 0.2em;
                  margin-block-end: 0.2em;
                  padding-inline-start: 15px;
                "
                  >
                    @for (step of mode.steps; track step) {
                      <li>{{ step }}</li>
                    }
                  </ol>
                </div>
              }
            </div>

            <div style="text-align: center; padding: 6px 0 8px">
              <!-- cancel Draw button -->
              <a
                class="icon-warn"
                mat-raised-button
                (click)="close()"
                [matTooltip]="
                  mapInteract.isModifying()
                    ? 'Finish Editing'
                    : 'Cancel Operation'
                "
                matTooltipPosition="left"
              >
                <mat-icon class="icon-warn">close</mat-icon>
                {{ mapInteract.isModifying() ? 'FINISH' : 'CANCEL' }}
              </a>
            </div>
          </div>
        }
        @if (showMeasurePanel()) {
          <fb-measurements
            matTooltip="Click on the Map to start. Click cancel or the last point to end."
            [coords]="mapInteract.measurement().coords"
            [index]="mapInteract.measurement().index"
            (cancel)="close()"
          >
          </fb-measurements>
        }
      </div>
    }
  `,
  styles: [
    `
      ._ap_interact_help {
        position: fixed;
        min-width: 200px;

        top: 60px;
        left: 50px;
        border: black 1px solid;
        font-family: roboto;
        font-size: 10pt;
      }

      ._ap_interact_dock {
        position: fixed;
        top: 60px;
        left: 50px;
        font-family: roboto;
        font-size: 10pt;
      }

      ._ap_steps {
        margin-block-start: 0.2em;
        margin-block-end: 0.4em;
        padding-inline-start: 18px;
      }

      ._ap_action_row {
        display: flex;
        flex-wrap: wrap;
      }
      ._ap_action_button {
        flex: 1 1 45%;
      }

      ._ap_row {
        display: flex;
        flex-wrap: no-wrap;
        flex: 2;
      }
      ._ap_row .icon-label {
        width: 30px;
      }
      ._ap_row .row-label {
        font-weight: 500;
        min-width: 60px;
      }
      ._ap_measurements .value {
        padding-right: 10px;
      }

      @media only screen and (max-width: 500px) {
        ._ap_measurements {
          left: 0;
          width: 100%;
        }
      }
    `
  ]
})
export class InteractionHelpComponent {
  finish = output<void>();
  cancel = output<void>();
  undo = output<void>();

  protected showHelpPanel: Signal<boolean>;
  protected showMeasurePanel: Signal<boolean>;
  /** Route draw or modify → render the unified docked popover card. */
  protected isRouteEditing: Signal<boolean>;
  /** Enough drawn points for Finish to complete a route (always true once
   *  modifying). */
  protected canFinish: Signal<boolean>;

  protected mode = {
    iconName: '',
    iconText: '',
    description: '',
    steps: []
  };

  protected app = inject(AppFacade);
  protected mapInteract = inject(FBMapInteractService);

  constructor() {
    this.showHelpPanel = computed(() => {
      return (
        (this.mapInteract.isDrawing() &&
          this.mapInteract.draw.resourceType !== 'route') ||
        this.mapInteract.isModifying() ||
        this.mapInteract.isBoxSelecting() ||
        (this.mapInteract.isMeasuring() &&
          this.mapInteract.measureGeometryType === 'Circle')
      );
    });

    this.showMeasurePanel = computed(() => {
      return (
        this.mapInteract.isMeasuring() &&
        this.mapInteract.measureGeometryType === 'LineString'
      );
    });

    this.isRouteEditing = computed(() => {
      return (
        this.mapInteract.draw.resourceType === 'route' &&
        (this.mapInteract.isDrawing() || this.mapInteract.isModifying())
      );
    });

    this.canFinish = computed(() => {
      return (
        this.mapInteract.isModifying() ||
        this.mapInteract.measurement().coords.length >= 2
      );
    });

    if (this.isRouteEditing()) {
      this.mode = this.mapInteract.isDrawing()
        ? {
            iconName: 'edit',
            iconText: 'Draw New Route',
            description: '',
            steps: [
              'Click / tap the map to add each point.',
              'Double-click, or press Finish, to end.'
            ]
          }
        : {
            iconName: 'edit',
            iconText: this.mapInteract.draw.name
              ? `Modify ${this.mapInteract.draw.name}`
              : 'Modify Route',
            description: '',
            steps: [
              'Click and drag to move a point.',
              'Ctrl-Click or press-and-hold to remove a point.'
            ]
          };
    } else if (this.showHelpPanel()) {
      if (this.mapInteract.isDrawing()) {
        this.mode = {
          iconName: 'edit',
          iconText: 'Drawing Help',
          description:
            this.mapInteract.draw.resourceType === 'region'
              ? ''
              : 'Click on the Map where to drop the feature.',
          steps:
            this.mapInteract.draw.resourceType === 'region'
              ? [
                  'Click on the Map to place a vertex of the Region.',
                  'Click on the last point to end drawing.'
                ]
              : []
        };
      } else if (this.mapInteract.isModifying()) {
        this.mode = {
          iconName: 'edit',
          iconText: 'Modify',
          description:
            this.mapInteract.draw.forSave.id === 'anchor'
              ? 'Click and drag to move anchor.'
              : '',
          steps:
            this.mapInteract.draw.forSave.id !== 'anchor'
              ? [
                  'Click and drag to move point.',
                  'Ctrl-Click or press-and-hold to remove point from a line.'
                ]
              : []
        };
      } else if (this.mapInteract.isBoxSelecting()) {
        this.mode = {
          iconName: 'highlight_alt',
          iconText: 'Select',
          description: '',
          steps: [
            'Click and drag to select area.',
            'On touch devices, press and hold then drag.'
          ]
        };
      } else if (
        this.mapInteract.isMeasuring() &&
        this.mapInteract.measureGeometryType === 'Circle'
      ) {
        this.mode = {
          iconName: 'straighten',
          iconText: 'Measure',
          description: '',
          steps: [
            'Click on the Map to start.',
            'On touch devices, press and hold then move.'
          ]
        };
      }
    }
  }

  /** ✕ / cancel — discard the draw or the route modify directly (non-route
   *  modifies are still confirmed by the host). */
  close() {
    this.cancel.emit();
  }

  /** Finish — complete & keep (drawing finishes the sketch; modify exits). */
  finishEditing() {
    this.finish.emit();
  }

  /** Undo — step the draw back a point or revert the last modify operation. */
  undoLast() {
    this.undo.emit();
  }
}
