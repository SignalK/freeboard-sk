// Alert Component

import {
  Component,
  Output,
  EventEmitter,
  input,
  effect,
  signal
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TimerButtonComponent } from './timer-button.component';

import { AppFacade } from 'src/app/app.facade';
import { NotificationManager } from '../notification-manager';
import { AppIconDef } from '../../icons';
import { ALARM_STATE } from '@signalk/server-api';

export interface AlertData {
  path: string;
  priority: ALARM_STATE;
  message: string;
  sound: boolean;
  visual: boolean;
  properties?: { [index: string]: any };
  icon: AppIconDef;
  type?: string;
  acknowledged: boolean;
  silenced: boolean;
  canAcknowledge?: boolean;
  canCancel?: boolean;
  createdAt: number;
}

const SoundFiles = {
  emergency: './assets/sound/woop.mp3',
  alarm: './assets/sound/woop.mp3',
  alert: './assets/sound/ding.mp3',
  warn: './assets/sound/ding.mp3'
};

@Component({
  selector: 'fb-alert',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    TimerButtonComponent
  ],
  template: `
    @if(app.sAlertListShow() || hidden()) {
    <span></span>
    } @else { @if(alert().visual && !alert().acknowledged) {
    <div>
      @if(!alert().canAcknowledge) {
      <mat-progress-bar
        mode="determinate"
        [value]="progressValue()"
      ></mat-progress-bar>
      }
      <mat-card style="padding:5px;border-radius:0;">
        <mat-card-content>
          <div style="display:flex; width:100%;">
            <div style="width:35px;">
              <mat-icon
                [class]="this.alert().icon.class"
                [svgIcon]="this.alert().icon.svgIcon"
                >{{ this.alert().icon.name }}</mat-icon
              >
            </div>
            <div
              style="overflow: hidden;
                  display: -webkit-box;
                  -webkit-box-orient: vertical;
                  -webkit-line-clamp: 2;
                  line-clamp: 2;
                  text-overflow:ellipsis;"
            >
              {{ alert().message }}
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <div style="display:flex;flex-wrap: wrap;">
            @if(alert().sound) {
            <div style="text-align: left;">
              <button
                mat-raised-button
                (click)="muteAlarm()"
                [disabled]="alert().silenced"
              >
                <mat-icon
                  class="ob"
                  [svgIcon]="
                    alert().silenced
                      ? 'sound-off-fill'
                      : 'sound-unavailable-fill'
                  "
                ></mat-icon>
                {{ alert().silenced ? 'MUTED' : 'MUTE' }}
              </button>
            </div>
            } @if(alert().canAcknowledge) {
            <div>
              <button mat-raised-button (click)="ackAlarm()">
                <mat-icon>check</mat-icon>
                ACK
              </button>
            </div>
            } @else {
            <button
              mat-raised-button
              matTooltip="Dismiss"
              matTooltipPosition="left"
              (click)="hide()"
            >
              <mat-icon>clear_all</mat-icon>
              Dismiss
            </button>
            } @if(app.data.activeRoute && alert().type ===
            'arrivalCircleEntered') {
            <div>
              @if(app.config.selections.course.autoNextPointOnArrival) {
              <div>
                @if(app.data.navData.pointIndex !== app.data.navData.pointTotal
                - 1) {
                <timer-button
                  [disabled]="nextPointClicked"
                  [icon]="'skip_next'"
                  [label]="'Next point in'"
                  [cancelledLabel]="'Next Point'"
                  [period]="app.config.selections.course.autoNextPointDelay"
                  (nextPoint)="gotoNextPoint()"
                >
                </timer-button>
                }
              </div>
              } @else {
              <button
                mat-button
                [disabled]="
                  nextPointClicked ||
                  app.data.navData.pointIndex ===
                    app.data.navData.pointTotal - 1
                "
                (click)="gotoNextPoint()"
              >
                <mat-icon style="color:green;">skip_next</mat-icon>
                NEXT POINT
              </button>
              }
            </div>
            }
          </div>
        </mat-card-actions>
      </mat-card>
    </div>
    }}
  `,
  styles: []
})
export class AlertComponent {
  alert = input<AlertData>();
  acknowledged = input<boolean>(false);
  silenced = input<boolean>(false);
  audioStatus = input<string>(); // changed audio context state
  doNotPlaySound = input<boolean>(false); // config setting

  hidden = signal<boolean>(false); // alert card is hidden
  progressValue = signal<number>(100);

  @Output() nextPoint: EventEmitter<void> = new EventEmitter();

  protected showNextPoint = false;
  protected nextPointClicked = false;
  private audio: HTMLAudioElement;
  private source: MediaElementAudioSourceNode;
  private soundFile = SoundFiles.warn;
  private timerRef!: any;

  constructor(protected app: AppFacade, private notiMgr: NotificationManager) {
    effect(() => {
      const ack = this.acknowledged();
      const mute = this.silenced();
      const al = this.alert();
      this.showNextPoint = al.type === 'arrivalCircleEntered';
      if (typeof this.doNotPlaySound() !== 'undefined') {
      }
      this.processAudio();
      if (
        !this.timerRef &&
        !['emergency', 'alarm'].includes(this.alert().priority) &&
        !this.showNextPoint
      ) {
        //  hide after set time secs
        this.timerRef = setInterval(() => {
          if (this.progressValue() > 0) {
            this.progressValue.update((value) => value - 4);
          } else {
            this.hidden.set(true);
            clearInterval(this.timerRef);
          }
        }, 100);
      }
    });
  }

  ngOnDestroy() {
    this.audio.pause();
    this.audio = null;
    this.source = null;
  }

  protected hide() {
    this.hidden.set(true);
  }

  protected ackAlarm() {
    this.notiMgr.acknowledge(this.alert().path);
  }

  protected muteAlarm() {
    this.notiMgr.silence(this.alert().path);
  }

  private processAudio() {
    this.soundFile = SoundFiles[this.alert().priority];
    if (this.app.audio.context) {
      if (!this.audio) {
        this.audio = new Audio();
      }
      if (!this.source) {
        this.source = this.app.audio.context.createMediaElementSource(
          this.audio
        );
        this.source.connect(this.app.audio.context.destination);
      }
      if (this.audioStatus() === 'running') {
        if (this.alert().sound) {
          if (
            this.doNotPlaySound() ||
            this.alert().silenced ||
            this.alert().acknowledged
          ) {
            this.audio.pause();
          } else {
            this.audio.loop = ['emergency', 'alarm'].includes(
              this.alert().priority
            );
            this.audio.src = this.soundFile;
            this.audio
              .play()
              .then(() => undefined)
              .catch(() => undefined);
          }
        } else {
          this.audio.pause();
        }
      }
    }
  }

  // arrival alarm - goto next point handler
  gotoNextPoint() {
    this.nextPointClicked = true;
    this.nextPoint.emit();
    this.hide();
  }
}
