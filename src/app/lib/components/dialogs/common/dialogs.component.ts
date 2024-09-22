/** Dialog Components **
 ************************/

import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

/*********** MsgBox ***************
	data: {
        message: "<string>" text to display,
        title: "<string>" title text,
        buttonText"<string>" button text
    }
***********************************/
@Component({
  selector: 'ap-msgbox',
  template: `
    <div class="_ap-msgbox">
      <div>
        <h1 mat-dialog-title>{{ data.title }}</h1>
      </div>
      <mat-dialog-content>
        @for(line of msglines; track line) {
        <div>
          <div>{{ line }}&nbsp;</div>
        </div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button mat-raised-button (click)="dialogRef.close(true)">
          {{ data.buttonText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-msgbox {
        font-family: Roboto;
        min-width: 150px;
      }
    `
  ]
})
export class MsgBox implements OnInit {
  public msglines = [];

  constructor(
    public dialogRef: MatDialogRef<MsgBox>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.buttonText = this.data.buttonText || 'OK';
    this.msglines = this.data.message.split('\n');
  }
}

/********* AlertDialog ************
	data: {
        message: "<string>" text to display,
        title: "<string>" title text,
        buttonText"<string>" button text,
        image: "<string>" path to image file
    }
***********************************/
@Component({
  selector: 'ap-alertdialog',
  template: `
    <div class="_ap-alert">
      <div>
        <h1 mat-dialog-title>{{ data.title }}</h1>
      </div>
      <mat-dialog-content>
        <div style="display:flex;">
          <div class="ap-alert-icon">
            @if(image) {
            <img [src]="image" style="width:90%" />
            } @else {
            <mat-icon>warning</mat-icon>
            }
          </div>
          <div style="padding-left: 10px;">
            @for(line of msglines; track line) {
            <div>
              <div>{{ line }}&nbsp;</div>
            </div>
            }
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button mat-raised-button (click)="dialogRef.close(true)">
          {{ data.buttonText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-alert {
        font-family: Roboto;
        min-width: 150px;
      }
      .ap-alert-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
        .ap-alert-icon {
          min-width: 25%;
          max-width: 25%;
          text-align: center;
        }
      }
    `
  ]
})
export class AlertDialog implements OnInit {
  public msglines = [];
  public image = null;

  constructor(
    public dialogRef: MatDialogRef<AlertDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.buttonText = this.data.buttonText || 'OK';
    this.msglines = this.data.message.split('\n');
    if (this.data.image) {
      this.image = this.data.image;
    }
  }
}

/********* ConfirmDialog **********
	data: {
        message: "<string>" text to display,
        title: "<string>" title text,
        checkText: string text for check box
        button1Text"<string>" button 1 text,
        button2Text"<string>" button 2 text
    }
***********************************/
@Component({
  selector: 'ap-confirmdialog',
  template: `
    <div class="_ap-confirm">
      <div>
        <h1 mat-dialog-title>{{ data.title }}</h1>
      </div>
      <mat-dialog-content style="overflow:unset">
        <div style="display:flex;">
          <div class="ap-confirm-icon">
            <mat-icon>help</mat-icon>
          </div>
          <div style="padding-left: 10px;">
            @for(line of msglines; track line) {
            <div>
              <div>{{ line }}&nbsp;</div>
            </div>
            }
          </div>
        </div>
        <div style="display:flex;">
          <div class="ap-confirm-icon"></div>
          @if(data.checkText) {
          <div style="padding-left: 10px;">
            <div style="font-weight: 500;">
              <mat-checkbox (change)="checked = $event.checked">
                {{ data.checkText }}&nbsp;
              </mat-checkbox>
            </div>
          </div>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button
          mat-raised-button
          (click)="dialogRef.close({ ok: true, checked: checked })"
        >
          {{ data.button1Text }}
        </button>
        <button mat-raised-button (click)="dialogRef.close(null)">
          {{ data.button2Text }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-confirm {
        font-family: Roboto;
        min-width: 150px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
        .ap-confirm-icon {
          min-width: 25%;
          max-width: 25%;
        }
      }
    `
  ]
})
export class ConfirmDialog implements OnInit {
  public msglines = [];
  public checked = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.button1Text = this.data.button1Text || 'Yes';
    this.data.button2Text = this.data.button2Text || 'No';
    this.msglines = this.data.message.split('\n');
  }
}

/********* AboutDialog ****************
    data: {
        name: this.app.name,  
        version: this.app.version, 
        description: this.app.description, 
        logo: this.app.logo,  
        url: this.app.url
    }
***************************************/
@Component({
  selector: 'ap-about-dialog',
  template: `
    <div>
      <h1 mat-dialog-title>About:</h1>
      <mat-dialog-content>
        <div class="about-row">
          <div class="item"><img [src]="data.logo" /></div>
          <div class="item">
            <span style="font-weight:bold;">{{ data.name }}</span
            >&nbsp;&nbsp;<br />
            <span class="description">
              {{ data.description }}
            </span>
            <br />
            <span>Version: {{ data.version }}</span>
            <br /><br />
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        @if(data.url) {
        <a mat-button [href]="data.url" target="_web" rel="noopener"
          >Visit Website</a
        >
        &nbsp; }
        <button mat-raised-button (click)="dialogRef.close(false)">
          Close
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .about-row {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-content: stretch;
        font-family: roboto;
      }
      .about-row .item {
        padding-left: 10px;
      }
      .about-row img {
        width: 42px;
      }
      .about-row .description {
        font-size: 12pt;
      }
    `
  ]
})
export class AboutDialog {
  constructor(
    public dialogRef: MatDialogRef<AboutDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}
}

/********* LoginDialog ****************
    data: {
        message: '',  
        button1Text: 'Log in', 
        button2Text: 'Cancel'
    }
***************************************/
@Component({
  selector: 'ap-login-dialog',
  styles: [],
  template: `
    <mat-dialog-content>
      <mat-card>
        <mat-card-title-group>
          <mat-icon>account_circle</mat-icon>
          <mat-card-title>Sign-In</mat-card-title>
          <mat-card-subtitle>{{ data.message }}</mat-card-subtitle>
        </mat-card-title-group>
        <mat-card-content>
          <mat-form-field hintLabel="User name:">
            <input
              matInput
              type="text"
              value=""
              #username
              (keyup)="keyUp($event, username, password)"
              style="width:110px;"
              (focus)="handleFocus($event)"
            /> </mat-form-field
          ><br />
          <mat-form-field hintLabel="Password:">
            <input
              matInput
              type="password"
              value=""
              #password
              (keyup)="keyUp($event, username, password)"
              style="width:110px;"
              (focus)="handleFocus($event)"
            />
          </mat-form-field>
        </mat-card-content>
        <mat-card-actions align="end">
          <button
            default
            mat-raised-button
            [disabled]="username.value.length === 0"
            (click)="login(username.value, password.value)"
          >
            {{ data.button1Text }}
          </button>
          &nbsp;&nbsp;
          <button default mat-raised-button (click)="cancel()">
            {{ data.button2Text }}
          </button>
        </mat-card-actions>
      </mat-card>
    </mat-dialog-content>
  `
})
export class LoginDialog implements OnInit {
  @ViewChild('username', { static: false }) username;

  public imgSource = 'assets/img/success.png';
  private result = {
    cancel: false,
    user: null,
    pwd: null
  };

  constructor(
    public dialogRef: MatDialogRef<LoginDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  ngOnInit() {
    this.data.message = this.data.message || '';
    this.data.button1Text = this.data.button1Text || 'Log in';
    this.data.button2Text = this.data.button2Text || 'Cancel';
  }

  ngAfterViewInit() {
    setTimeout(() => this.username.nativeElement.focus(), 500);
  }

  keyUp(e, u, p) {
    if (e.key === 'Enter') {
      this.login(u.value, p.value);
    }
  }

  handleFocus(e) {
    e.currentTarget.select(0, e.currentTarget.value.length);
  }

  // ** cancelled login
  cancel() {
    this.result.cancel = true;
    this.dialogRef.close(this.result);
  }

  //** submit log in
  login(user = '', password = '') {
    this.result.cancel = false;
    this.result.user = user;
    this.result.pwd = password;
    this.dialogRef.close(this.result);
  }
}

/********* MessageBarComponent ****************
    data: {
        message: '',  
        sound: boolean
    }
***************************************/
@Component({
  selector: 'message-bar',
  template: `
    <div class="message-bar">
      <mat-icon>message</mat-icon>&nbsp;&nbsp;
      {{ data.message }}
    </div>
    @if(data.sound) {
    <audio src="./assets/sound/ding.mp3" [autoplay]="true"></audio>
    }
  `,
  styles: [
    `
      .message-bar {
        font-family: roboto;
      }
    `
  ]
})
export class MessageBarComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data) {}
}

/********* WelcomeDialog ****************
    data: { 
        buttonText: string,
        content: []
    }
***************************************/
@Component({
  selector: 'ap-welcome-dialog',
  template: `
    <mat-dialog-content>
      <div class="welcome">
        <mat-horizontal-stepper [linear]="false" #stepper>
          @for(c of data.content; track c; let i = $index) {
          <mat-step>
            <div style="text-align:center;">
              <h3>{{ c.title }}</h3>
            </div>
            <div style="display:flex;">
              <div style="min-width:50px;text-align:left;padding-top: 15%;">
                @if(i !== 0 && data.content.length > 1) {
                <button
                  mat-icon-button
                  (click)="currentPage = currentPage - 1"
                  matStepperPrevious
                >
                  <mat-icon>keyboard_arrow_left</mat-icon>
                </button>
                }
              </div>
              <div style="flex: 1 1 auto;" [innerHTML]="c.message"></div>
              <div style="min-width:50px;text-align:right;padding-top: 15%;">
                @if(i !== data.content.length - 1) {
                <button
                  mat-icon-button
                  (click)="currentPage = currentPage + 1"
                  matStepperNext
                >
                  <mat-icon>keyboard_arrow_right</mat-icon>
                </button>
                }
              </div>
            </div>
          </mat-step>
          }
        </mat-horizontal-stepper>
        <div style="text-align:center;font-size:10pt;font-family:roboto;">
          @for(c of data.content; track c; let i = $index) {
          <mat-icon
            [ngClass]="{
              'step-current': currentPage - 1 === i,
              'step-other': currentPage - 1 !== i
            }"
            style="font-size:8pt;width:12px;"
          >
            fiber_manual_record
          </mat-icon>
          }
        </div>
        <div style="text-align:center;">
          <button mat-raised-button (click)="dialogRef.close(data.showPrefs)">
            {{ data.buttonText }}
          </button>
          <br />&nbsp;
        </div>
      </div>
    </mat-dialog-content>
  `,
  styles: [
    `
      .welcome h1 {
        font-weight: normal !important;
      }
      .welcome h3 {
        font-weight: 500;
      }
      .welcome-row {
        display: -webkit-box;
        display: -moz-box;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-content: stretch;
        font-family: roboto, Arial, Helvetica, sans-serif;
      }
      .welcome-row .item.stretch {
        text-align: center;
        width: 100%;
      }
      .welcome-row .item {
        padding-left: 5px;
      }
      .welcome-row img {
        width: 42px;
      }
      .welcome-row .description {
        font-size: 12pt;
      }
    `
  ]
})
export class WelcomeDialog {
  public currentPage = 1;

  constructor(
    public dialogRef: MatDialogRef<WelcomeDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  ngAfterViewInit() {
    const sh = document.getElementsByClassName(
      'mat-horizontal-stepper-header-container'
    );
    if (sh) {
      sh[0]['style']['display'] = 'none';
    }
  }
}
