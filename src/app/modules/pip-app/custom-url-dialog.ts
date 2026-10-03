import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isMixedContent, resolveSourceUrl, sourceFromInput } from './sources';
import { PipAppSource } from './types';

export interface CustomUrlResult {
  title: string;
  source: PipAppSource;
}

/** Ask for an address (and optional title) to open as a PiP App window. */
@Component({
  selector: 'fb-pip-app-custom-url',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Open PiP App</h2>
    <mat-dialog-content>
      <mat-form-field class="field">
        <mat-label>Address</mat-label>
        <input
          matInput
          name="address"
          placeholder="/signalk-wifish/ or https://example.com"
          [ngModel]="address()"
          (ngModelChange)="address.set($event)"
          (keydown.enter)="submit()"
          cdkFocusInitial
        />
        <mat-hint>
          A path starting with / opens a webapp on this Signal K server.
        </mat-hint>
      </mat-form-field>
      <mat-form-field class="field">
        <mat-label>Title (optional)</mat-label>
        <input
          matInput
          name="title"
          [ngModel]="title()"
          (ngModelChange)="title.set($event)"
          (keydown.enter)="submit()"
        />
      </mat-form-field>
      @if (address().trim() && !source()) {
        <p class="msg warn">Enter a path or an http(s) address.</p>
      }
      @if (mixedContent()) {
        <p class="msg warn">
          Freeboard is served over https, so the browser will block this http
          address.
        </p>
      }
      <p class="msg">
        Some sites refuse to be shown inside another page. If the window stays
        blank, use its Open in new tab button.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!source()" (click)="submit()">
        Open
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      width: 100%;
    }
    .msg {
      font-size: 13px;
      margin: 4px 0;
    }
    .warn {
      color: #d32f2f;
    }
  `
})
export class PipAppCustomUrlDialog {
  private dialogRef =
    inject<MatDialogRef<PipAppCustomUrlDialog, CustomUrlResult>>(MatDialogRef);

  protected address = signal('');
  protected title = signal('');
  protected source = computed(() => sourceFromInput(this.address()));
  protected mixedContent = computed(() => {
    const s = this.source();
    if (s?.kind !== 'url') return false;
    const url = resolveSourceUrl(s, window.location.href);
    return !!url && isMixedContent(url, window.location.protocol);
  });

  protected submit() {
    const source = this.source();
    if (!source) return;
    this.dialogRef.close({ title: this.title().trim(), source });
  }
}
