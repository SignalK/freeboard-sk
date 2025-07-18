/***********************************
Autopilot Console component
    <autopilot-console>
***********************************/
import {
  Component,
  signal,
  ChangeDetectionStrategy,
  input
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';

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
              (click)="app.data.autopilot.console = false"
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

            @if(apData().mode === 'dodge') {
            <div class="button-bar">
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
            <div class="button-bar">
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
              <div style="width:50%;">
                @if(stateOptions().length > 2) {
                <button
                  class="button-primary"
                  style="max-width:100px;"
                  mat-raised-button
                  [matMenuTriggerFor]="statemenu"
                  [disabled]="
                    !app.data.autopilot.hasApi ||
                    !apData().default ||
                    apData().state === 'off-line' ||
                    !apData().state
                  "
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
                <button
                  class="button-primary"
                  mat-raised-button
                  (click)="toggleEngaged()"
                  [disabled]="noPilot()"
                  [ngClass]="{
                    'button-warn': apData().enabled,
                    'button-primary': !apData().enabled,
                  }"
                >
                  AUTO
                </button>
                }
              </div>

              <div>
                <button
                  class="button-secondary"
                  mat-raised-button
                  [matMenuTriggerFor]="modemenu"
                  [disabled]="noPilot() || modeOptions().length === 0"
                >
                  Mode
                </button>
              </div>
            </div>

            <div class="button-bar-thin">
              <div style="text-align:center;width:100%;">
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
              </div>
            </div>
          </div>
        </mat-card-content>
      </div>
    </mat-card>
  `
})
export class AutopilotComponent {
  protected modeOptions = signal<string[]>([]);
  protected stateOptions = signal<Array<{ name: string; engaged: boolean }>>(
    []
  );
  private autopilotApiPath: string;

  apData = input<any>({});

  constructor(protected app: AppFacade, private signalk: SignalKClient) {
    this.autopilotApiPath = 'vessels/self/autopilots/_default';
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.signalk.api
      .get(this.app.skApiVersion, `${this.autopilotApiPath}`)
      .subscribe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (val: any) => {
          if (!val.options) {
            return;
          }
          if (val.options.modes && Array.isArray(val.options.modes)) {
            this.modeOptions.set(val.options.modes);
          }
          if (val.options.states && Array.isArray(val.options.states)) {
            this.stateOptions.set(val.options.states);
          }
        },
        () => {
          this.modeOptions.set([]);
          this.stateOptions.set([]);
          this.app.data.autopilot.hasApi = false;
          this.app.showMessage('No autopilot providers found!');
        }
      );
  }

  ngOnDestroy() {}

  noPilot(): boolean {
    return (
      !this.app.data.autopilot.hasApi ||
      !this.apData().default ||
      !this.apData().state ||
      this.apData().state === 'off-line'
    );
  }

  toggleEngaged() {
    const uri = this.apData().enabled
      ? `${this.autopilotApiPath}/disengage`
      : `${this.autopilotApiPath}/engage`;
    this.signalk.api.post(this.app.skApiVersion, uri, null).subscribe(
      () => undefined,
      (error: HttpErrorResponse) => {
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
    );
  }

  targetAdjust(value: number) {
    if (typeof value !== 'number') {
      return;
    }
    this.signalk.api
      .put(this.app.skApiVersion, `${this.autopilotApiPath}/target/adjust`, {
        value: value,
        units: 'deg'
      })
      .subscribe(
        () => {
          this.app.debug(`Target adjusted: ${value} deg.`);
        },
        (error: HttpErrorResponse) => {
          if (error.status === 403) {
            const msg = 'Unauthorised: Please login.';
            this.app.showAlert(`Error (${error.status}):`, msg);
          } else {
            this.app.showMessage(
              error.error?.message ?? 'Device returned an error!'
            );
          }
        }
      );
  }

  toggleDodge() {
    if (this.apData().mode !== 'dodge') {
      this.signalk.api
        .post(this.app.skApiVersion, `${this.autopilotApiPath}/dodge`, null)
        .subscribe(
          () => {
            this.app.debug(`Set dodge mode.`);
          },
          (error: HttpErrorResponse) => {
            if (error.status === 403) {
              const msg = 'Unauthorised: Please login.';
              this.app.showAlert(`Error (${error.status}):`, msg);
            } else {
              this.app.showMessage(
                error.error?.message ?? 'Device returned an error!'
              );
            }
          }
        );
    } else {
      this.signalk.api
        .delete(this.app.skApiVersion, `${this.autopilotApiPath}/dodge`)
        .subscribe(
          () => {
            this.app.debug(`Clear dodge mode.`);
          },
          (error: HttpErrorResponse) => {
            if (error.status === 403) {
              const msg = 'Unauthorised: Please login.';
              this.app.showAlert(`Error (${error.status}):`, msg);
            } else {
              this.app.showMessage(
                error.error?.message ?? 'Device returned an error!'
              );
            }
          }
        );
    }
  }

  dodgeAdjust(value: number) {
    if (typeof value !== 'number') {
      return;
    }
    this.signalk.api
      .put(this.app.skApiVersion, `${this.autopilotApiPath}/dodge`, {
        value: value,
        units: 'deg'
      })
      .subscribe(
        () => {
          this.app.debug(`Dodge port / starboard: ${value} deg.`);
        },
        (error: HttpErrorResponse) => {
          if (error.status === 403) {
            const msg = 'Unauthorised: Please login.';
            this.app.showAlert(`Error (${error.status}):`, msg);
          } else {
            this.app.showMessage(
              error.error?.message ?? 'Device returned an error!'
            );
          }
        }
      );
  }

  setMode(mode: string) {
    if (mode) {
      // autopilot mode
      this.signalk.api
        .put(this.app.skApiVersion, `${this.autopilotApiPath}/mode`, {
          value: mode
        })
        .subscribe(
          () => undefined,
          (error: HttpErrorResponse) => {
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
        );
    }
  }

  setState(state: string) {
    if (state) {
      // autopilot mode
      this.signalk.api
        .put(this.app.skApiVersion, `${this.autopilotApiPath}/state`, {
          value: state
        })
        .subscribe(
          () => undefined,
          (error: HttpErrorResponse) => {
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
        );
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
