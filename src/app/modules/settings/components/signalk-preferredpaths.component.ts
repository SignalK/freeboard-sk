/***********************************
Signal K preferred paths component
    <signalk-preferred-paths>
***********************************/
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatRadioModule } from '@angular/material/radio';

import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'signalk-preferred-paths',
  imports: [CommonModule, MatRadioModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./signalk-preferredpaths.component.css'],
  template: `
    <fieldset>
      <legend style="font-size: 10pt;">{{ title }}</legend>
      <div>
        @for(item of pathChoicesArray; track item[0]) {
        <div class="sk-details">
          <div class="title">
            <div>{{ item[1].name }}</div>
          </div>
          <div>
            @for(path of item[1].available; track path) {
            <div style="margin: 5px 0 5px 0;">
              <mat-radio-button
                #pathopt
                [name]="item[0]"
                [value]="path"
                [checked]="path === item[1].current"
                (change)="item[1].current = pathopt.value; save(true)"
              >
                {{ path.split('.').slice(-1) }}
              </mat-radio-button>
            </div>
            }
          </div>
        </div>
        }
      </div>
    </fieldset>
  `
})
export class SignalKPreferredPathsComponent {
  @Input() title = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() chosen: any = new EventEmitter<any>();

  private pathChoices = {
    tws: {
      name: 'True Wind Speed',
      choices: [
        'environment.wind.speedTrue',
        'environment.wind.speedOverGround'
      ],
      available: [],
      current: ''
    },
    twd: {
      name: 'True Wind Direction',
      choices: [
        'environment.wind.directionTrue',
        'environment.wind.directionMagnetic',
        'environment.wind.angleTrueGround',
        'environment.wind.angleTrueWater'
      ],
      available: [],
      current: ''
    },
    heading: {
      name: 'Heading / COG',
      choices: [
        'navigation.courseOverGroundTrue',
        'navigation.courseOverGroundMagnetic',
        'navigation.headingTrue',
        'navigation.headingMagnetic'
      ],
      available: [],
      current: ''
    }
  };

  protected pathChoicesArray = Object.entries(this.pathChoices);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public availPaths: any;

  constructor(public app: AppFacade) {}

  ngOnInit() {
    this.initEntries();
  }

  // ** initialise items from settings
  initEntries() {
    this.availPaths = new Map(
      Object.entries(this.app.data.vessels.prefAvailablePaths)
    );
    this.pathChoices.tws.current =
      this.app.config.selections.preferredPaths.tws;
    this.pathChoices.twd.current =
      this.app.config.selections.preferredPaths.twd;
    this.pathChoices.heading.current =
      this.app.config.selections.preferredPaths.heading;

    const u = Object.entries(this.pathChoices);
    u.forEach((x) => {
      const i = x[1];
      // ** fill available paths from received path data **
      i['choices'].forEach((c) => {
        if (this.availPaths.has(c)) {
          i['available'].push(c);
        }
      });
      // ** ensure a default
      if (i['available'].length === 0) {
        i['available'].push(i['choices'][0]);
      }
    });
  }

  // save / cancel
  save(keep: boolean) {
    const value = {};
    Object.entries(this.pathChoices).forEach((i) => {
      value[i[0]] = i[1].current;
    });
    this.chosen.emit({ save: keep, value: value });
  }
}
