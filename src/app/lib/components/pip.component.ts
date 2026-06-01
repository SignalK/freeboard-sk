import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  output,
  input,
  effect,
  linkedSignal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface PiPVideoElement extends HTMLVideoElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestPictureInPicture(): any;
}

//** Picture in Picture video component **
@Component({
  selector: 'pip-video',
  imports: [MatButtonModule, MatTooltipModule, MatIconModule],
  template: `
    <div style="border: gray 1px solid;border-radius:5px;display:none;">
      <video #vid [src]="vidUrl" [muted]="_muted()" autoplay></video>
    </div>
    <div style="padding-left: 5px;">
      <button
        class="button-toolbar"
        mat-mini-fab
        [style.display]="src() ? 'block' : 'none'"
        matTooltip="Show Video"
        matTooltipPosition="left"
        [disabled]="pipMode"
        (click)="initPiP()"
      >
        <mat-icon>videocam</mat-icon>
      </button>
      <!--<button mat-mini-fab [style.display]="pipMode ? 'block' : 'none'"
                matTooltip="Mute Audio"
                (click)="toggleMute()">
                <mat-icon>{{_muted() ? 'volume_off' : 'volume_mute'}}</mat-icon>
            </button>-->
    </div>
  `,
  styles: [``]
})
export class PiPVideoComponent implements OnInit {
  private pipVideo: PiPVideoElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pipWindow: any;
  pipMode = false;
  vidUrl: string;
  src = input<string>();
  muted = input<boolean>(true);
  _muted = linkedSignal(() => this.muted());
  resize = output<[number, number]>();
  change = output<boolean>();
  click = output<boolean>();
  @ViewChild('vid', { static: true }) vid: ElementRef;

  constructor() {
    effect(() => {
      if (this.src()) {
        this.vidUrl = this.src();
      }
    });
  }

  ngOnInit() {
    if (!('pictureInPictureEnabled' in document)) {
      //console.log('The Picture-in-Picture Web API is not available.');
      this.pipMode = true; // disable button by mimicing pipMode
    }

    this.pipVideo = this.vid.nativeElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.pipVideo.addEventListener('enterpictureinpicture', (event: any) => {
      this.pipMode = true;
      this.pipWindow = event.pictureInPictureWindow;
      this.pipWindow.addEventListener(
        'resize',
        this.onPipWindowResize.bind(this)
      );
      this.change.emit(this.pipMode);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.pipVideo.addEventListener('leavepictureinpicture', () => {
      this.pipMode = false;
      this.pipVideo.pause();
      this.pipWindow.removeEventListener('resize', this.onPipWindowResize);
      this.change.emit(this.pipMode);
    });
  }

  // ** pipWindow resize event handler **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPipWindowResize(event: any) {
    this.resize.emit([event.srcElement.width, event.srcElement.height]);
  }

  toggleMute() {
    this._muted.update((current) => !current);
  }

  // ** initialise picture in picture mode
  async initPiP() {
    try {
      await this.pipVideo.requestPictureInPicture();
      this.pipMode = true;
      this.vid.nativeElement.play();
      this.click.emit(true);
    } catch (e) {
      this.pipMode = false;
    }
  }
}
