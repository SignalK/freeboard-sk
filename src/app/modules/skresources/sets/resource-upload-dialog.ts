import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';

import { AppInfo } from 'src/app/app.info';

//** Resources upload dialog **
@Component({
  selector: 'resource-upload-dialog',
  templateUrl: './resource-upload-dialog.html',
  styleUrls: ['./resource-upload-dialog.css']
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
    public app: AppInfo,
    public skclient: SignalKClient,
    public dialogRef: MatDialogRef<ResourceImportDialog>,
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

  parseFile(e) {
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
