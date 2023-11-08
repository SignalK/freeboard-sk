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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
    MatSelectModule,
    MatSlideToggleModule,
    FormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./autopilot.component.css'],
  template: `
    <mat-card cdkDragHandle>
      <div
        class="autopilot-console mat-app-background"
        cdkDrag
        (cdkDragReleased)="dragEventHandler($event, 'released')"
      >
        <div class="title">
          <div style="flex: 1 1 auto;">
            Autopilot:
            <mat-slide-toggle
              id="autopilotenable"
              color="primary"
              labelPosition="after"
              [hideIcon]="true"
              [disabled]="!this.app.data.autopilot.hasApi"
              [checked]="app.data.vessels.self.autopilot.enabled"
              (change)="onFormChange($event)"
            >
              Engage
            </mat-slide-toggle>
          </div>
          <div class="closer">
            <mat-icon (click)="app.data.autopilot.console = false"
              >close</mat-icon
            >
          </div>
        </div>
        <div class="content">
          <div style="display:flex;flex-wrap:nowrap;">
            <mat-form-field floatLabel="always">
              <mat-label>Mode</mat-label>
              <mat-select
                id="autopilotmode"
                [disabled]="!this.app.data.autopilot.hasApi"
                [(value)]="app.data.vessels.self.autopilot.mode"
                (selectionChange)="onFormChange($event)"
              >
                <mat-option
                  *ngFor="let i of autoPilotModes"
                  [value]="i"
                  [matTooltip]="i"
                  matTooltipPosition="right"
                >
                  {{ i }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div style="display:flex;flex-wrap:nowrap;">
            <div>
              <button mat-mini-fab (click)="targetAdjust(-10)">-10</button
              ><br />
              <button mat-mini-fab (click)="targetAdjust(-1)">-1</button>
            </div>

            <div class="dial-text mat-app-background">
              <div class="dial-text-title">Target</div>
              <div class="dial-text-value">
                {{ formatTargetValue(app.data.vessels.self.autopilot.target) }}
              </div>
              <div class="dial-text-units">degrees</div>
            </div>

            <div>
              <button mat-mini-fab (click)="targetAdjust(10)">10</button><br />
              <button mat-mini-fab (click)="targetAdjust(1)">1</button>
            </div>
          </div>
        </div>
      </div>
    </mat-card>
  `
})
export class AutopilotComponent {
  protected autoPilotModes = [];
  private context = 'self';
  private deltaSub: Subscription;

  constructor(
    protected app: AppInfo,
    private signalk: SignalKClient,
    private stream: SKStreamFacade,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.deltaSub = this.stream.delta$().subscribe((e: UpdateMessage) => {
      if (e.action === 'update') {
        this.cdr.detectChanges();
      }
    });

    this.signalk.api
      .get(this.app.skApiVersion, 'vessels/self/steering/autopilot')
      .subscribe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (val: any) => {
          if (
            val.options &&
            val.options.mode &&
            Array.isArray(val.options.mode)
          ) {
            this.autoPilotModes = val.options.mode;
          }
        },
        () => {
          this.autoPilotModes = [];
          this.app.data.autopilot.hasApi = false;
        }
      );
  }

  ngOnDestroy() {
    this.deltaSub.unsubscribe();
  }

  targetAdjust(value: number) {
    const rad = value ? Convert.degreesToRadians(value) : 0;
    if (!rad) {
      return;
    }
    this.signalk.api
      .put(
        this.app.skApiVersion,
        'vessels/self/steering/autopilot/target/adjust',
        { value: rad }
      )
      .subscribe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => {
          this.app.debug(`Target adjusted: ${value} deg.`);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormChange(e: any) {
    if (e.source) {
      if (e.source.id === 'autopilotenable') {
        // toggle autopilot enable
        this.signalk.api
          .post(
            this.app.skApiVersion,
            `vessels/self/${
              e.checked
                ? 'steering/autopilot/engage'
                : 'steering/autopilot/disengage'
            }`,
            null
          )
          .subscribe(
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
      if (e.source.id === 'autopilotmode') {
        // autopilot mode
        this.signalk.api
          .putWithContext(
            this.app.skApiVersion,
            this.context,
            'steering/autopilot/mode',
            {
              value: e.value
            }
          )
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
  }

  formatTargetValue(value: number) {
    if (typeof value === 'number') {
      return Convert.radiansToDegrees(value)?.toFixed(1);
    } else return '--';
  }
}
