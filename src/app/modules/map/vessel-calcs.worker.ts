/// <reference lib="webworker" />

import { VesselLinesData, VesselLinesResult } from './vessel-calcs.types';

import { Convert } from 'src/app/lib/convert';
import { GeoUtils, Angle } from 'src/app/lib/geoutils';
import { computeDestinationPoint } from 'geolib';

// ******** MESSAGE FROM APP ************
// ** listen for posted messages from APP
addEventListener('message', ({ data }) => {
  drawVesselLines(data);
});

//** POST message to App**
function drawVesselLines(data: VesselLinesData) {
  const vl: VesselLinesResult = {
    laylines: { port: [], starboard: [] },
    targetAngle: [],
    cog: [],
    heading: [],
    awa: [],
    twd: []
  };

  // laylines (active)
  if (
    data.vesselConfig.laylines &&
    Array.isArray(data.navData.position) &&
    typeof data.navData.position[0] === 'number' &&
    typeof data.vesselActive.heading === 'number'
  ) {
    const twd_deg = Convert.radiansToDegrees(data.vesselSelf.wind.twd);
    const destUpwind =
      Math.abs(Angle.difference(data.navData.bearing.value, twd_deg)) < 90;
    const ba_deg = Convert.radiansToDegrees(
      data.vesselSelf.performance.beatAngle ?? Math.PI / 4
    );
    const destInTarget =
      Math.abs(Angle.difference(data.navData.bearing.value, twd_deg)) < ba_deg;
    const dtg =
      data.units.distance === 'm'
        ? data.navData.dtg * 1000
        : Convert.nauticalMilesToKm(data.navData.dtg * 1000);

    if (destInTarget) {
      const heading_deg = Convert.radiansToDegrees(data.vesselActive.heading);

      const bta = Angle.add(heading_deg, 90); // tack angle
      const hbd_rad = Convert.degreesToRadians(
        Angle.difference(heading_deg, data.navData.bearing.value)
      );
      const dist1 = Math.sin(hbd_rad) * dtg;
      const dist2 = Math.cos(hbd_rad) * dtg;
      const pt1 = computeDestinationPoint(
        data.vesselActive.position,
        dist1,
        bta
      );
      const pt2 = computeDestinationPoint(
        data.vesselActive.position,
        dist2,
        heading_deg
      );
      const p1a = [data.vesselActive.position, [pt1.longitude, pt1.latitude]];
      const p1b = [[pt1.longitude, pt1.latitude], data.navData.position];
      const l1 = hbd_rad < 0 ? [p1a, p1b] : [p1b, p1a];

      const p2a = [[pt2.longitude, pt2.latitude], data.navData.position];
      const p2b = [data.vesselActive.position, [pt2.longitude, pt2.latitude]];
      const l2 = hbd_rad < 0 ? [p2a, p2b] : [p2b, p2a];

      vl.laylines = {
        port: hbd_rad < 0 ? l2 : l1,
        starboard: hbd_rad < 0 ? l1 : l2
      };
    }

    // beat / gybe angle lines
    if (destUpwind) {
      const ta_deg = ba_deg;
      const bapt1 = computeDestinationPoint(
        data.vesselActive.position,
        dtg,
        Angle.add(twd_deg, ta_deg)
      );
      const bapt2 = computeDestinationPoint(
        data.vesselActive.position,
        dtg,
        Angle.add(twd_deg, 0 - ta_deg)
      );

      vl.targetAngle = [
        [bapt1.longitude, bapt1.latitude],
        data.vesselActive.position,
        [bapt2.longitude, bapt2.latitude]
      ];
    }
  }

  // ** cog line (active) **
  const sog = data.vesselActive.sog || 0;
  const cl = sog * (data.vesselConfig.cogLine * 60);
  if (data.vesselActive.cog) {
    vl.cog = [
      data.vesselActive.position,
      GeoUtils.destCoordinate(
        data.vesselActive.position,
        data.vesselActive.cog,
        cl
      )
    ];
  }

  // ** heading line (active) **
  const z = data.mapZoomLevel;
  const offset = z < 29 ? data.zoomOffsetLevel[Math.floor(z)] : 60;
  const wMax = 10; // ** max line length

  let hl = 0;
  if (data.vesselConfig.headingLineSize === -1) {
    hl = (sog > wMax ? wMax : sog) * offset;
  } else {
    hl = Convert.nauticalMilesToKm(data.vesselConfig.headingLineSize) * 1000;
  }
  vl.heading = [
    data.vesselActive.position,
    GeoUtils.destCoordinate(
      data.vesselActive.position,
      data.vesselActive.orientation,
      hl
    )
  ];

  // ** awa (focused) **
  let aws = data.vesselActive.wind.aws || 0;
  if (aws > wMax) {
    aws = wMax;
  }

  vl.awa = [
    data.vesselActive.position,
    GeoUtils.destCoordinate(
      data.vesselActive.position,
      data.vesselActive.wind.awa + data.vesselActive.orientation,
      typeof data.vesselActive.orientation === 'number' ? aws * offset : 0
    )
  ];

  // ** twd (focused) **
  let tws = data.vesselActive.wind.tws || 0;
  if (tws > wMax) {
    tws = wMax;
  }
  vl.twd = [
    data.vesselActive.position,
    GeoUtils.destCoordinate(
      data.vesselActive.position,
      data.vesselActive.wind.direction || 0,
      typeof data.vesselActive.orientation === 'number' ? tws * offset : 0
    )
  ];

  postMessage(vl);
}
