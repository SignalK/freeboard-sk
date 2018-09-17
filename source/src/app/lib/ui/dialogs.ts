/** Dialog Components **
************************/

import {Component, OnInit, Input, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

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
						<h1 mat-dialog-title>{{data.title}}</h1>
					</div>
					<mat-dialog-content>
						<div *ngFor="let line of msglines">
							<div>{{line}}&nbsp;</div>
						</div>
					</mat-dialog-content>
					<mat-dialog-actions>
                        <div style="width:100%;text-align:center;">
                            <button mat-raised-button color="accent" (click)="dialogRef.close(true)">
                                {{data.buttonText}}
                            </button>		
                        </div>					
					</mat-dialog-actions>
				</div>	
			`,
    styles: [`  ._ap-msgbox {
                    font-family: arial;
                    min-width: 150px;
				}	
			`]
})
export class MsgBox implements OnInit {
	public msglines= [];

    constructor(
        public dialogRef: MatDialogRef<MsgBox>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
	//** lifecycle: events **
    ngOnInit() {
        this.data.buttonText= this.data.buttonText || 'OK';
		this.msglines= this.data.message.split('\n');
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
						<h1 mat-dialog-title>{{data.title}}</h1>
					</div>
					<mat-dialog-content>
						<div style="display:flex;">
							<div class="ap-alert-icon">
								<img *ngIf="image" [src]="image" style="width:90%"/>
								<mat-icon *ngIf="!image">warning</mat-icon>
							</div>
							<div style="padding-left: 10px;">
								<div *ngFor="let line of msglines">
									<div>{{line}}&nbsp;</div>
								</div>
							</div>
						</div>
					</mat-dialog-content>
					<mat-dialog-actions>
                        <div style="width:100%;text-align:center;">
                            <button mat-raised-button color="accent" (click)="dialogRef.close(true)">
                                {{data.buttonText}}</button>		
                        </div>					
					</mat-dialog-actions>
				</div>	
			`,
    styles: [`  ._ap-alert {
                    font-family: arial;
                    min-width: 150px;
                }	
                .ap-alert-icon { 
                    min-width: 35px;
                    max-width: 35px;
                    color: darkorange;
                    text-align: left;                    
                }
                .ap-alert-icon .mat-icon { 
                    font-size: 25pt;
                }

                @media only screen
                and (min-device-width : 768px)
                and (max-device-width : 1024px),
                only screen	and (min-width : 800px) { 
                    .ap-alert-icon {
                        min-width: 25%;
                        max-width: 25%;
                        text-align: center; 
                    }
                }               
			`]
})
export class AlertDialog implements OnInit {
    public msglines= [];
    public image= null;

    constructor(
        public dialogRef: MatDialogRef<MsgBox>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
	//** lifecycle: events **
    ngOnInit() {
        this.data.buttonText= this.data.buttonText || 'OK';
        this.msglines= this.data.message.split('\n'); 
        if(this.data.image) { this.image= this.data.image }       
	}

}

/********* ConfirmDialog **********
	data: {
        message: "<string>" text to display,
        title: "<string>" title text,
        button1Text"<string>" button 1 text,
        button2Text"<string>" button 2 text
    }
***********************************/
@Component({
	selector: 'ap-confirmdialog',
	template: `
				<div class="_ap-confirm">
					<div>
						<h1 mat-dialog-title>{{data.title}}</h1>
					</div>
					<mat-dialog-content>
						<div style="display:flex;">
							<div class="ap-confirm-icon">
								<mat-icon>help</mat-icon>
							</div>
                            <div style="padding-left: 10px;">
                                <div *ngFor="let line of msglines">
                                    <div>{{line}}&nbsp;</div>
                                </div>
                            </div>
						</div>
					</mat-dialog-content>
					<mat-dialog-actions>
                        <div style="text-align:center;width:100%;">
                            <button mat-raised-button color="accent" (click)="dialogRef.close(true)">
                             {{data.button1Text}}
                            </button>
                            <button mat-raised-button (click)="dialogRef.close(false)">
                                {{data.button2Text}}
                            </button>
                        </div>					
					</mat-dialog-actions>
				</div>	
			`,
    styles: [`  ._ap-confirm {
                    font-family: arial;
                    min-width: 150px;
                }
                .ap-confirm-icon { 
                    min-width: 35px;
                    max-width: 35px;
                    color: darkorange;
                    text-align: left;                    
                }
                .ap-confirm-icon .mat-icon { 
                    font-size: 25pt;
                }

                @media only screen
                and (min-device-width : 768px)
                and (max-device-width : 1024px),
                only screen	and (min-width : 800px) { 
                    .ap-confirm-icon {
                        min-width: 25%;
                        max-width: 25%;
                    }
                    .ap-confirm-icon .mat-icon { 
                        font-size: 40pt;
                    }                    
                }                 	
			`]
})
export class ConfirmDialog implements OnInit {

	public msglines= [];

    constructor(
        public dialogRef: MatDialogRef<MsgBox>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
	//** lifecycle: events **
    ngOnInit() {
        this.data.button1Text= this.data.button1Text || 'Yes';
        this.data.button2Text= this.data.button2Text || 'No';
		this.msglines= this.data.message.split('\n');
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
        <div class="about">
            <h1 mat-dialog-title>About:</h1>
            <div class="content" theme-content>
                <div class="about-row">
                    <div class="item" ><img [src]="data.logo"></div>
                    <div class="item">
                        <span style="font-weight:bold;">{{data.name}}</span>&nbsp;&nbsp;<br>
                        <span class="description">
                            {{data.description}}
                        </span>
                        <br><br>
                    </div>
                </div>
                <div class="about-row" *ngIf="data.url">
                    <div class="item stretch">   	
                        <a [href]="data.url" target="_web" rel="noopener">Visit Website</a>
                    </div>  
                </div>  
                <br>              
                <div class="about-row">            
                    <div class="item stretch">   	
                        <button mat-raised-button 
                            color="primary"
                            (click)="dialogRef.close(false)">
                            Close
                        </button>
                    </div>
                </div>
                
            </div>
        </div>    
    `,
    styles: [`
        .about h1 { font-weight: normal !important; }
        .about-row {
            display: -webkit-box;      
            display: -moz-box;         
            display: -ms-flexbox;      
            display: -webkit-flex; 		
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            justify-content: flex-start;
            align-content: stretch;
            font-family: Arial, Helvetica, sans-serif;
        }
        .about-row .item.stretch {
            text-align:center;
            width:100%;
        }
        .about-row .item {
            padding-left:5px;
        }	
        .about-row img {
            width: 42px; 
        } 	
        .about-row .description {
            
            font-size: 12pt;
        }    
    `]
})
export class AboutDialog  {

    constructor(
        public dialogRef: MatDialogRef<MsgBox>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    ngOnInit() { }

}

