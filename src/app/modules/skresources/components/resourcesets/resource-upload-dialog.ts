import { Component, OnInit, Inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import { PipesModule } from 'src/app/lib/pipes';
import { SignalKClient } from 'signalk-client-angular';
import { FileInputComponent } from 'src/app/lib/components';
import { AppFacade } from 'src/app/app.facade';

//** Resources upload dialog **
@Component({
  selector: 'resource-upload-dialog',
  templateUrl: './resource-upload-dialog.html',
  styleUrls: ['./resource-upload-dialog.css'],
  imports: [
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatDialogModule,
    PipesModule,
    FileInputComponent
  ]
})
export class ResourceImportDialog implements OnInit {
  public resPaths: Array<string> = [];
  public targetPath: string = null;
  public source = { type: null, name: null, data: null };

  public display = {
    notValid: false
  };

  private unsubscribe = [];

  constructor(
    public app: AppFacade,
    public skclient: SignalKClient,
    public dialogRef: MatDialogRef<ResourceImportDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: { [key: string]: any }
  ) {}

  ngOnInit() {
    this.skclient.api.get(this.app.skApiVersion, '/resources').subscribe(
      (r) => {
        this.resPaths = [];
        this.targetPath = null;
        this.resPaths = Object.keys(r).filter((i) => {
          return ![
            'routes',
            'waypoints',
            'notes',
            'regions',
            'charts',
            'tracks'
          ].includes(i);
        });
      },
      () => {
        this.resPaths = [];
        this.targetPath = null;
      }
    );
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((i) => i.unsubscribe());
  }

  // ** send data for load to server **
  load() {
    this.dialogRef.close({ path: this.targetPath, data: this.source.data });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseFile(e: any) {
    this.source = e;
    this.source.type = 'Unknown';
    try {
      const jdata = JSON.parse(e.data);
      this.source.type = jdata.type ? jdata.type : this.source.type;
    } catch (error) {
      console.log(`Error parsing resource file!`);
    }
  }
}
