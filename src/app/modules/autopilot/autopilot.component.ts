/***********************************
Autopilot Console component
    <autopilot-console>
***********************************/
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef
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
import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { Subscription } from 'rxjs';
import { UpdateMessage } from 'src/app/types';
import { SKStreamFacade } from 'src/app/modules';

@Component({
  standalone: true,
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
      @for(i of autopilotOptions.modes; track i) {
      <button mat-menu-item (click)="setMode(i)">{{ i }}</button>
      }
    </mat-menu>
    <mat-card cdkDragHandle>
      <div
        class="autopilot-console"
        cdkDrag
        (cdkDragReleased)="dragEventHandler($event, 'released')"
      >
        <div class="title">
          <div style="text-align: center;width: 100%">
            <mat-icon
              class="icon-warn"
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
              {{ app.data.vessels.self.autopilot.default ?? '' }}
            </div>
            <div class="lcd">
              <div style="padding: 5px 0;display: flex;">
                <div class="dial-text-title">Target</div>
              </div>

              <div class="dial-text">
                <div class="dial-text-value">
                  {{
                    formatTargetValue(app.data.vessels.self.autopilot.target)
                  }}&deg;
                </div>
              </div>

              <div style="padding: 10px 0;display: flex;">
                <div class="dial-text-title">
                  {{ app.data.vessels.self.autopilot.mode }}
                </div>
                <div class="dial-text-title">
                  {{ app.data.vessels.self.autopilot.state }}
                </div>
              </div>
            </div>

            @if(!app.data.autopilot.isLocal &&
            app.data.vessels.self.autopilot.mode === 'dodge') {
            <div class="button-bar">
              <div style="width:50%;">
                <button
                  class="button-secondary"
                  mat-mini-fab
                  (click)="dodgeAdjust(-10)"
                >
                  &lt;&lt;</button
                >&nbsp;
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  (click)="dodgeAdjust(-1)"
                >
                  &lt;
                </button>
              </div>

              <div>
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  (click)="dodgeAdjust(1)"
                >
                  &gt;</button
                >&nbsp;
                <button
                  class="button-secondary"
                  mat-mini-fab
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
                  (click)="targetAdjust(-10)"
                >
                  -10</button
                >&nbsp;
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  (click)="targetAdjust(-1)"
                >
                  -1
                </button>
              </div>

              <div>
                <button
                  class="button-toolbar"
                  mat-mini-fab
                  (click)="targetAdjust(1)"
                >
                  +1</button
                >&nbsp;
                <button
                  class="button-secondary"
                  mat-mini-fab
                  (click)="targetAdjust(10)"
                >
                  +10
                </button>
              </div>
            </div>
            }

            <div class="button-bar-thin">
              <div style="width:50%;">
                <button
                  class="button-primary"
                  mat-raised-button
                  (click)="toggleEngaged()"
                  [disabled]="
                    !app.data.autopilot.hasApi ||
                    app.data.vessels.self.autopilot.state === 'offline' ||
                    !app.data.vessels.self.autopilot.state
                  "
                  [ngClass]="{
                    'button-warn': app.data.vessels.self.autopilot.enabled,
                    'button-primary': !app.data.vessels.self.autopilot.enabled,
                  }"
                >
                  AUTO
                </button>
              </div>

              <div>
                <button
                  class="button-secondary"
                  mat-raised-button
                  [matMenuTriggerFor]="modemenu"
                  [disabled]="
                    !app.data.autopilot.hasApi ||
                    app.data.vessels.self.autopilot.state === 'offline' ||
                    !app.data.vessels.self.autopilot.state
                  "
                >
                  Mode
                </button>
              </div>
            </div>

            <div class="button-bar-thin">
              <div style="text-align:center;width:100%;">
                @if(!app.data.autopilot.isLocal) {
                <button
                  [ngClass]="{
                    'button-accent': app.data.vessels.self.autopilot.mode === 'dodge',
                    'button-toolbar': app.data.vessels.self.autopilot.mode !== 'dodge',
                  }"
                  [disabled]="
                    !app.data.autopilot.hasApi ||
                    app.data.vessels.self.autopilot.state === 'offline' ||
                    !app.data.vessels.self.autopilot.state
                  "
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
  protected autopilotOptions = { modes: [], states: [] };
  private deltaSub: Subscription;
  private autopilotApiPath: string;

  constructor(
    protected app: AppInfo,
    private signalk: SignalKClient,
    private stream: SKStreamFacade,
    private cdr: ChangeDetectorRef
  ) {
    this.autopilotApiPath = this.app.data.autopilot.isLocal
      ? 'vessels/self/steering/autopilot/default'
      : 'vessels/self/autopilots/_default';
  }

  ngOnInit() {
    this.deltaSub = this.stream.delta$().subscribe((e: UpdateMessage) => {
      if (e.action === 'update') {
        this.cdr.detectChanges();
      }
    });
  }

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
            this.autopilotOptions.modes = val.options.modes;
          }
          if (val.options.states && Array.isArray(val.options.states)) {
            this.autopilotOptions.states = val.options.states;
          }
          this.cdr.detectChanges();
        },
        () => {
          this.autopilotOptions = { modes: [], states: [] };
          this.app.data.autopilot.hasApi = false;
        }
      );
  }

  ngOnDestroy() {
    this.deltaSub.unsubscribe();
  }

  toggleEngaged() {
    const uri = this.app.data.vessels.self.autopilot.enabled
      ? `${this.autopilotApiPath}/disengage`
      : `${this.autopilotApiPath}/engage`;
    this.signalk.api.post(this.app.skApiVersion, uri, null).subscribe(
      () => undefined,
      (error: HttpErrorResponse) => {
        let msg = `Error setting Autopilot state!\n`;
        if (error.status === 403) {
          msg += 'Unauthorised: Please login.';
        }
        this.app.showAlert(`Error (${error.status}):`, msg);
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
        (err: HttpErrorResponse) => {
          this.app.debug(err);
        }
      );
  }

  toggleDodge() {
    if (this.app.data.vessels.self.autopilot.mode !== 'dodge') {
      this.signalk.api
        .post(this.app.skApiVersion, `${this.autopilotApiPath}/dodge`, null)
        .subscribe(
          () => {
            this.app.debug(`Set dodge mode.`);
          },
          (err: HttpErrorResponse) => {
            this.app.debug(err);
          }
        );
    } else {
      this.signalk.api
        .delete(this.app.skApiVersion, `${this.autopilotApiPath}/dodge`)
        .subscribe(
          () => {
            this.app.debug(`Clear dodge mode.`);
          },
          (err: HttpErrorResponse) => {
            this.app.debug(err);
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
        (err: HttpErrorResponse) => {
          this.app.debug(err);
        }
      );
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
            }
            this.app.showAlert(`Error (${error.status}):`, msg);
          }
        );
    }
  }

  formatTargetValue(value: number) {
    if (typeof value === 'number') {
      return Convert.radiansToDegrees(value)?.toFixed(1);
    } else return '--';
  }
}
