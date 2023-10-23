/** Alarms Dialog Components **
 ********************************/

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AppInfo } from 'src/app/app.info';

interface AlarmData {
  key: string;
  title: string;
  value: {
    isSmoothing: boolean;
    message: string;
    sound: boolean;
    state: string;
    visual: boolean;
    acknowledged: boolean;
    muted: boolean;
  };
}

/********* AlarmComponent ********/
@Component({
  selector: 'ap-alarm',
  template: `
    <span
      class="alarmAck"
      *ngIf="alarm.value.acknowledged"
      (click)="minClick(alarm.key)"
    >
      <img [src]="iconUrl" [matTooltip]="alarm.title" />
    </span>
    <mat-card
      style="padding:5px;"
      *ngIf="alarm.value.visual && !alarm.value.acknowledged"
    >
      <mat-card-title-group>
        <img width="30px" [src]="iconUrl" />
        <mat-card-title>{{ alarm.value.message }}</mat-card-title>
      </mat-card-title-group>
      <mat-card-actions>
        <div style="display:flex;flex-wrap: wrap;">
          <div>
            <button mat-button (click)="ackAlarm(alarm.key)">
              <mat-icon style="color:green;">check</mat-icon>
              ACKNOWLEDGE
            </button>
          </div>
          <div style="text-align: left;">
            <button
              mat-button
              *ngIf="alarm.value.sound"
              (click)="muteAlarm(alarm.key)"
              [disabled]="alarm.value.muted"
            >
              <mat-icon color="warn">volume_off</mat-icon>
              {{ alarm.value.muted ? 'MUTED' : 'MUTE' }}
            </button>
            <div
              [ngSwitch]="app.config.selections.course.autoNextPointOnArrival"
              *ngIf="
                app.data.activeRoute && alarm.key === 'arrivalCircleEntered'
              "
            >
              <button
                *ngSwitchCase="false"
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
              <div *ngSwitchCase="true">
                <timer-button
                  *ngIf="
                    app.data.navData.pointIndex !==
                    app.data.navData.pointTotal - 1
                  "
                  [disabled]="nextPointClicked"
                  [icon]="'skip_next'"
                  [label]="'Next point in'"
                  [cancelledLabel]="'Next Point'"
                  [period]="app.config.selections.course.autoNextPointDelay"
                  (nextPoint)="gotoNextPoint()"
                >
                </timer-button>
              </div>
            </div>
          </div>
        </div>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .alarmAck {
        text-align: center;
        flex-wrap: wrap;
      }
      .alarmAck img {
        height: 35px;
      }
    `
  ]
})
export class AlarmComponent implements OnInit {
  @Input() alarm: AlarmData; // alarm data
  @Input() audioContext: AudioContext; // Web Audio API
  @Input() audioStatus: string; // changed audio context state
  @Input() soundFile = './assets/sound/woop.mp3';
  @Input() loop = true; // true: loop audio file playback
  @Input() mute = false; // true: mute audio playback

  @Output() acknowledge: EventEmitter<string> = new EventEmitter();
  @Output() unacknowledge: EventEmitter<string> = new EventEmitter();
  @Output() muted: EventEmitter<string> = new EventEmitter();
  @Output() clear: EventEmitter<string> = new EventEmitter();
  @Output() open: EventEmitter<string> = new EventEmitter();
  @Output() nextPoint: EventEmitter<number> = new EventEmitter();

  private stdAlarms = [
    'mob',
    'sinking',
    'fire',
    'piracy',
    'flooding',
    'collision',
    'grounding',
    'listing',
    'adrift',
    'abandon'
  ];

  canUnAck = false;
  isStdAlarm = false;
  iconUrl: string;
  private imgPath = './assets/img/alarms/';

  private audio: HTMLAudioElement;
  private source: MediaElementAudioSourceNode;
  nextPointClicked = false;

  constructor(public app: AppInfo) {}

  ngOnInit() {
    this.canUnAck =
      this.stdAlarms.indexOf(this.alarm.key) === -1 ? true : false;
    this.isStdAlarm =
      this.stdAlarms.indexOf(this.alarm.key) !== -1 ? true : false;
    this.iconUrl = `${this.imgPath}${this.alarm.key}.png`;
  }

  ngOnDestroy() {
    this.audio.pause();
    this.audio = null;
    this.source = null;
  }

  ngOnChanges() {
    this.processAudio();
  }

  ackAlarm(key: string) {
    this.acknowledge.emit(key);
  }

  muteAlarm(key: string) {
    this.muted.emit(key);
  }

  clearAlarm(key: string) {
    this.clear.emit(key);
  }

  minClick(key: string) {
    if (this.canUnAck) {
      this.unacknowledge.emit(key);
    } else {
      this.open.emit(key);
    }
  }

  processAudio() {
    // play audio when this.alarm.value.sound = true
    if (this.audioContext) {
      if (!this.audio) {
        this.audio = new Audio();
      }
      if (!this.source) {
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.audioContext.destination);
      }
      this.audio.loop = this.loop;
      this.audio.src = this.soundFile;
      if (this.audioStatus === 'running') {
        if (this.alarm.value.sound) {
          if (this.mute) {
            this.audio.pause();
          } else {
            this.audio.play();
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
    console.log('gotoNextPoint()');
  }
}
