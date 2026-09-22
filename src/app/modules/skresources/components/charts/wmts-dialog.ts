import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { AppFacade } from 'src/app/app.facade';
import { ChartProvider } from 'src/app/types';

/********* WMTSDialog **********
	Prompts for a WMTS host and returns a new chart source for it; the layer
	selection is made in the chart properties dialog.
***********************************/
@Component({
  selector: 'wmts-dialog',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatInputModule
  ],
  template: `
    <div class="_ap-wmts">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>public</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Add WMTS Source</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <mat-form-field floatLabel="always" style="width:100%">
          <mat-label> WMTS host. </mat-label>
          <input matInput #txturl type="url" required [(value)]="hostUrl" />
          @if (txturl) {
            <button
              matSuffix
              mat-icon-button
              [disabled]="txturl.value.length === 0"
              (click)="handleSave(txturl.value)"
            >
              <mat-icon>arrow_forward</mat-icon>
            </button>
          }
          <mat-hint> Enter url of the WMTS host. </mat-hint>
          @if (txturl.invalid) {
            <mat-error>WMTS host is required!</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
    </div>
  `
})
export class WMTSDialog {
  protected hostUrl = '';

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WMTSDialog>);

  /**
   * Close and return a new WMTS chart source for the host
   * @param wmtsHost WMTS server host url (without parameters)
   */
  handleSave(wmtsHost: string) {
    const source: ChartProvider = {
      name: 'New WMTS Chart',
      description: '',
      type: 'WMTS',
      url: wmtsHost,
      format: 'png',
      layers: []
    };
    this.dialogRef.close([source]);
  }
}
