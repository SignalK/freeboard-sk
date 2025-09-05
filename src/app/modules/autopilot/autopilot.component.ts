/***********************************
Autopilot Console component
    <autopilot-console>
***********************************/
import {
  Component,
  signal,
  ChangeDetectionStrategy,
  input,
  Output,
  EventEmitter,
  effect,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { AutopilotService } from './autopilot.service';

@Component({
  selector: 'autopilot-console',
  imports: [
    MatTooltipModule,
    CommonModule,
    DragDropModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    FormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./autopilot.component.css'],
  template: `
    <mat-menu #modemenu="matMenu">
      @for(i of modeOptions(); track i) {
      <button mat-menu-item (click)="setMode(i)">
        <span>{{ i }}</span>
        @if (i === apData().mode) {
        <mat-icon>check</mat-icon>
        } @else {
        <mat-icon>ok</mat-icon>
        }
      </button>
      }
    </mat-menu>
    <mat-menu #statemenu="matMenu">
      @for(i of stateOptions(); track i.name) {
      <button mat-menu-item (click)="setState(i.name)">
        <span>{{ i.name }}</span>
        @if (i.name === apData().state) {
        <mat-icon>check</mat-icon>
        } @else {
        <mat-icon>ok</mat-icon>
        }
      </button>
      }
    </mat-menu>
    <mat-card cdkDragHandle>
      <div
        class="autopilot-console"
        cdkDrag
        (cdkDragReleased)="dragEventHandler($event, 'released')"
      >
        <div class="title" style="cursor: grab;">
          <div style="text-align: center;width: 100%;">
            <mat-icon
              class="icon-warn"
              style="cursor: pointer;"
              matTooltip="Close"
              (click)="handleClose()"
              >close</mat-icon
            >
          </div>
        </div>
        <mat-card-content>
          <div class="content">
            <div style="height: 45px;color:whitesmoke;">
              Autopilot<br />
              {{ apData().default ?? '' }}
            </div>
            <div class="lcd">
              <div style="padding: 5px 0;display: flex;">
                <div class="dial-text-title">
                  @if(apData().default) {
                  <span>Target</span>
                  } @else {
                  <span>No Pilot</span>
                  }
                </div>
              </div>

              <div class="dial-text">
                <div class="dial-text-value">
                  @if(apData().default || apData().state === 'off-line') {
                  <span>{{ formatTargetValue(apData().target) }}</span>
                  } @else {
                  <span>--</span>
                  } &deg;
                </div>
              </div>

              <div style="padding: 10px 0;display: flex;">
                <div class="dial-text-title">
                  @if(apData().default || apData().state === 'off-line') {
                  <span>{{ apData().state }}</span>
                  } @else {
                  <span>--</span>
                  }
                </div>
                <div class="dial-text-title">
                  @if(apData().default || apData().state === 'off-line') {
                  <span>{{ apData().mode }}</span>
                  } @else {
                  <span>--</span>
                  }
                </div>
              </div>
            </div>

            <div class="button-bar">
              <div style="width:50%;">
                @if(stateOptions().length > 2) {
                <button
                  class="button-primary"
                  style="max-width:100px;"
                  mat-raised-button
                  [matMenuTriggerFor]="statemenu"
                  [disabled]="noPilot()"
                  [ngClass]="{
                    'button-warn': apData().enabled,
                    'button-primary': !apData().enabled,
                  }"
                >
                  <div
                    style="white-space: pre;text-overflow: ellipsis;overflow: hidden;max-width:90px;"
                    [innerText]="formatLabel(apData().state)"
                  ></div>
                </button>
                } @else {
                <mat-slide-toggle
                  [checked]="apData().enabled"
                  [disabled]="noPilot()"
                  (toggleChange)="toggleEngaged()"
                  [matTooltip]="apData().enabled ? 'Disengage' : 'Engage'"
                ></mat-slide-toggle>
                }
              </div>

              <div>
                @if(modeOptions().length !== 0) {
                <button
                  class="button-secondary"
                  mat-raised-button
                  [matMenuTriggerFor]="modemenu"
                  [disabled]="noPilot() || modeOptions().length === 0"
                >
                  Mode
                </button>
                }
              </div>
            </div>

            @if(apData().mode === 'dodge') {
            <div class="button-bar-thin">
              <div style="width:50%;">
                <button
                  class="button-secondary"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="dodgeAdjust(-10)"
                >
                  &lt;&lt;</button
                >&nbsp;
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="dodgeAdjust(-1)"
                >
                  &lt;
                </button>
              </div>

              <div>
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="dodgeAdjust(1)"
                >
                  &gt;</button
                >&nbsp;
                <button
                  class="button-secondary"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="dodgeAdjust(10)"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
            } @else {
            <div class="button-bar-thin">
              <div style="width:50%;">
                <button
                  class="button-secondary"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="targetAdjust(-10)"
                >
                  -10</button
                >&nbsp;
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="targetAdjust(-1)"
                >
                  -1
                </button>
              </div>

              <div>
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="targetAdjust(1)"
                >
                  +1</button
                >&nbsp;
                <button
                  class="button-secondary"
                  mat-mini-fab
                  [disabled]="
                    !apData().default || apData().state === 'off-line'
                  "
                  (click)="targetAdjust(10)"
                >
                  +10
                </button>
              </div>
            </div>
            }

            <div class="button-bar-thin">
              <div style="text-align:center;width:100%;">
                @if(dodgeAction()) {
                <button
                  [ngClass]="{
                    'button-accent': apData().mode === 'dodge',
                    'button-toolbar': apData().mode !== 'dodge',
                  }"
                  [disabled]="noPilot()"
                  mat-raised-button
                  (click)="toggleDodge()"
                >
                  Dodge
                </button>
                }
              </div>
            </div>
          </div>
        </mat-card-content>
      </div>
    </mat-card>
  `
})
export class AutopilotComponent {
  @Output() close: EventEmitter<void> = new EventEmitter();

  protected modeOptions = signal<string[]>([]);
  protected stateOptions = signal<Array<{ name: string; engaged: boolean }>>(
    []
  );
  private autopilotApiPath: string;
  private currentPilot: string;

  apData = input<{
    default?: string;
    mode?: string;
    state?: string;
    target?: number;
    enabled?: boolean;
    availableActions?: string[];
  }>({});

  protected noPilot = computed(() => {
    return (
      !this.app.featureFlags().autopilotApi ||
      !this.apData().default ||
      !this.apData().state ||
      this.apData().state === 'off-line'
    );
  });

  protected dodgeAction = computed(() => {
    return this.apData().availableActions?.includes('dodge');
  });

  constructor(protected app: AppFacade, protected autopilot: AutopilotService) {
    this.autopilotApiPath = 'vessels/self/autopilots/_default';
    effect(() => {
      if (this.apData().default !== this.currentPilot) {
        this.app.debug(
          'changed default pilot:',
          this.currentPilot,
          this.apData().default
        );
        this.currentPilot = this.apData().default;
        this.fetchAPOptions();
      }
    });
  }

  handleClose() {
    this.close.emit();
  }

  /** fetch AP options from server */
  private async fetchAPOptions() {
    try {
      const options = await this.autopilot.fetchOptions();
      if (options.modes && Array.isArray(options.modes)) {
        this.modeOptions.set(options.modes);
      }
      if (options.states && Array.isArray(options.states)) {
        this.stateOptions.set(options.states);
      }
    } catch (err) {
      this.modeOptions.set([]);
      this.stateOptions.set([]);
      this.app.showMessage('No autopilot providers found!');
    }
  }

  /** engage / disengage the pilot */
  protected async toggleEngaged() {
    const uri = this.apData().enabled
      ? `${this.autopilotApiPath}/disengage`
      : `${this.autopilotApiPath}/engage`;

    try {
      if (this.apData().enabled) {
        await this.autopilot.disengage();
      } else {
        await this.autopilot.engage();
      }
    } catch (error) {
      let msg = `Error setting Autopilot state!\n`;
      if (error.status === 403) {
        msg += 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${error.status}):`, msg);
      } else {
        this.app.showMessage(
          error.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** adjust device target
   * @param value Number (in degrees)
   */
  protected async targetAdjust(value: number) {
    try {
      await this.autopilot.adjustTarget(value);
    } catch (error) {
      if (error.status === 403) {
        const msg = 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${error.status}):`, msg);
      } else {
        this.app.showMessage(
          error.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** toggle dodge mode on/off */
  protected async toggleDodge() {
    try {
      await this.autopilot.dodge(this.apData().mode !== 'dodge');
      this.app.debug(`Set dodge mode.`);
    } catch (error) {
      if (error.status === 403) {
        const msg = 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${error.status}):`, msg);
      } else {
        this.app.showMessage(
          error.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** send dodge direction value */
  protected async dodgeAdjust(value: number) {
    try {
      await this.autopilot.adjustDodge(value);
    } catch (error) {
      if (error.status === 403) {
        const msg = 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${error.status}):`, msg);
      } else {
        this.app.showMessage(
          error.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** send mode command
   * @param mode Mode to set on the device
   */
  protected async setMode(mode: string) {
    try {
      await this.autopilot.mode(mode);
    } catch (error) {
      let msg = `Error setting Autopilot mode!\n`;
      if (error.status === 403) {
        msg += 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${error.status}):`, msg);
      } else {
        this.app.showMessage(
          error.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** send mode command
   * @param state Mode to set on the device
   */
  protected async setState(state: string) {
    try {
      await this.autopilot.state(state);
    } catch (error) {
      let msg = `Error setting Autopilot state!\n`;
      if (error.status === 403) {
        msg += 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${error.status}):`, msg);
      } else {
        this.app.showMessage(
          error.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragEventHandler(e: any, type: string) {
    this.app.debug(
      'e:',
      e,
      'type:',
      type,
      e.event.srcElement.clientLeft,
      e.event.srcElement.clientTop
    );
  }

  formatLabel(value: string) {
    return value ? value.toUpperCase() : '...';
  }

  formatTargetValue(value: number) {
    if (typeof value === 'number') {
      return Convert.radiansToDegrees(value)?.toFixed(1);
    } else return '--';
  }
}
