import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from 'src/app/modules/skresources';
import type { GPXExportData } from './gpxsave-dialog';
import {
  attachTimes,
  displayedOwnTrail,
  TrackExportChoice,
  TrackExportSource,
  vesselLabel
} from './track-export';

/** Opens Export to GPX: from the menu (routes, waypoints and the own-vessel
 * trail) or from a vessel's popover (that vessel's track only), and reports
 * the result. The dialog itself is loaded on demand. */
@Injectable({ providedIn: 'root' })
export class GPXExportService {
  private app = inject(AppFacade);
  private dialog = inject(MatDialog);
  private skres = inject(SKResourceService);

  /** Routes, waypoints and the own-vessel trail. */
  exportResources(): Promise<void> {
    return this.open({
      routes: this.skres.routes(),
      tracks: [this.ownTrail()]
    });
  }

  /** The own-vessel trail alone (its popover), as displayed or over a range,
   * starting on `choice`. */
  exportOwnTrail(choice: TrackExportChoice = 'displayed'): Promise<void> {
    return this.open({
      routes: [],
      tracks: [this.ownTrail()],
      tracksOnly: true,
      initialChoice: choice
    });
  }

  /** One AIS vessel's track, as displayed or over a range, starting on
   * `choice`. */
  exportVesselTrack(
    id: string,
    choice: TrackExportChoice = 'displayed'
  ): Promise<void> {
    const source = this.vesselTrack(id);
    return source
      ? this.open({
          routes: [],
          tracks: [source],
          tracksOnly: true,
          initialChoice: choice
        })
      : Promise.resolve();
  }

  /** The own-vessel trail as displayed: the server trail when it is the one
   * drawn (with the local trail carrying on from it), else the local trail. */
  ownTrail(): TrackExportSource {
    const name = this.app.data.vessels.self?.name;
    return {
      context: 'self',
      label: name ? `${name} trail` : 'Vessel trail',
      displayed: displayedOwnTrail(
        this.app.selfTrailFromServer().length > 0,
        this.app.selfTrailTimed(),
        this.app.selfTrailFromServer(),
        this.app.localTrailTimed()
      )
    };
  }

  /** Whether an AIS vessel's track is only the tail gathered while Freeboard
   * was open: no provider records it (v2 sent no track for this vessel, or
   * v1 has no AIS tracks). */
  tailOnly(id: string): boolean {
    const source = this.app.trackSource();
    const recorded =
      source?.api === 'v2'
        ? this.app.aisTracksTimed().has(id)
        : source?.api === 'v1' && source.v1AisTracks;
    return !recorded;
  }

  /** An AIS vessel's track as displayed, with the recording times the Track
   * API sent for it. */
  vesselTrack(id: string): TrackExportSource | undefined {
    const vessel = this.app.data.vessels.aisTargets.get(id);
    const lines = this.app.data.vessels.aisTracks.get(id) ?? vessel?.track;
    if (!vessel && !lines) {
      return undefined;
    }
    const timed = this.app.aisTracksTimed().get(id);
    return {
      context: id,
      label: vesselLabel(id, vessel?.name, vessel?.mmsi),
      // none drawn: a vessel shown only in Track history exports a range
      displayed: attachTimes(lines ?? [], timed),
      tailOnly: this.tailOnly(id)
    };
  }

  private async open(data: GPXExportData): Promise<void> {
    const { GPXExportDialog } = await import('./gpxsave-dialog');
    return new Promise((resolve) =>
      this.dialog
        .open(GPXExportDialog, { disableClose: true, data })
        .afterClosed()
        .subscribe((errCount: number) => {
          if (errCount === 0) {
            this.app.showMsgBox(
              'GPX Save',
              data.tracksOnly
                ? 'Track saved to GPX file successfully.'
                : 'Resources saved to GPX file successfully.'
            );
          } else if (errCount > 0) {
            this.app.showAlert(
              'GPX Save',
              'Error saving resources to GPX file!'
            );
          }
          resolve();
        })
    );
  }
}
