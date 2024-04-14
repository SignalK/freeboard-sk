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

import { AppInfo } from 'src/app/app.info';

@Component({
  selector: 'signalk-preferred-paths',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./signalk-preferredpaths.component.css'],
  template: `
    <fieldset>
      <legend style="font-size: 10pt;">{{ title }}</legend>
      <div>
        <div class="sk-details" *ngFor="let item of pathChoices | keyvalue">
          <div class="title">
            <div>{{ item.value.name }}</div>
          </div>
          <div>
            @for(path of item.value.available; track path) {
            <div style="margin: 5px 0 5px 0;">
              <mat-radio-button
                #pathopt
                color="primary"
                [name]="item.key"
                [value]="path"
                [checked]="path === item.value.current"
                (change)="item.value.current = pathopt.value; save(true)"
              >
                {{ path.split('.').slice(-1) }}
              </mat-radio-button>
            </div>
            }
          </div>
        </div>
      </div>
    </fieldset>
  `
})
export class SignalKPreferredPathsComponent {
  @Input() title = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() chosen: any = new EventEmitter<any>();

  public pathChoices = {
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
    /*,
    course: {
      name: 'Course',
      choices: ['navigation.courseGreatCircle', 'navigation.courseRhumbline'],
      available: [],
      current: ''
    }*/
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public availPaths: any;

  constructor(public app: AppInfo) {}

  ngOnInit() {
    this.initEntries();
  }

  //ngOnChanges() {}

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
    /*this.pathChoices.course.current =
      this.app.config.selections.preferredPaths.course;*/

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
