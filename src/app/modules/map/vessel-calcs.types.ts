import { Position } from 'src/app/types';
import { SKVessel } from '../skresources';

export interface VesselLinesData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vesselConfig: any; // app.config.vessel
  vesselSelf: SKVessel; // dfeat.self === app.data.vessels.self
  vesselActive: SKVessel; // app.data.vessels.active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navData: any; // dfeat.navData.position = app.data.navData.position;
  mapZoomLevel: number; // fbMap.zoomLevel
  zoomOffsetLevel: number; // this.zoomOffsetLevel
  units: { distance: string }; // app.config.units
}

export interface VesselLinesResult {
  laylines: { port: number[][][]; starboard: number[][][] };
  targetAngle: Array<Position>;
  cog: Array<Position>;
  heading: Array<Position>;
  twd: Array<Position>;
  awa: Array<Position>;
}
