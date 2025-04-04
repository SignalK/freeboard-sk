/// <reference lib="webworker" />

import { SignalKStreamWorker, Alarm } from 'signalk-worker-angular';
import {
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo
} from 'src/app/modules/skresources/resource-classes';
import { GeoUtils, Extent } from 'src/app/lib/geoutils';
import {
  NotificationMessage,
  UpdateMessage,
  TrailMessage,
  ResultPayload
} from 'src/app/types/stream';
import { SimplifyAP } from 'simplify-ts';
import { Convert } from 'src/app/lib/convert';
import { PathValue } from '@signalk/server-api';

interface AisStatus {
  updated: { [key: string]: boolean };
  stale: { [key: string]: boolean };
  expired: { [key: string]: boolean };
}

interface AisFilter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signalk: { [key: string]: any };
  aisState: [];
}

interface VesselTrailConfig {
  trailDuration: number; // number of hours of trail to fetch from server
  trailResolution: {
    // resolution at defined time horizons e.g. '5s', '1m', '5m'
    lastHour: string;
    next23: string;
    beyond24: string;
  };
}

type GroupFilter = Map<string, SKVessel | SKSaR | SKAircraft | SKAtoN>;

interface MsgFromApp {
  cmd:
    | 'open'
    | 'close'
    | 'subscribe'
    | 'settings'
    | 'alarm'
    | 'vessel'
    | 'auth'
    | 'trail';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: { [key: string]: any };
}

// ** preference source paths **
const prefSourcePaths = [
  'environment.wind.speedTrue',
  'environment.wind.speedOverGround',
  'environment.wind.angleTrueGround',
  'environment.wind.angleTrueWater',
  'environment.wind.directionTrue',
  'environment.wind.directionMagnetic',
  'navigation.courseOverGroundTrue',
  'navigation.courseOverGroundMagnetic',
  'navigation.headingTrue',
  'navigation.headingMagnetic'
];

let vessels: ResultPayload; // post message payload
let stream: SignalKStreamWorker;
let skToken!: string;
const unsubscribe = [];
let timers = [];
let updateReceived = false;

let apiUrl: string; // path to Signal K api
let hasTrackPlugin = false;

// ** AIS target management **
const targetFilter: AisFilter = { signalk: {}, aisState: [] };
let targetExtent: Extent = [0, 0, 0, 0]; // ais target extent
let extRecalcInterval = 60; // number of message posts before re-calc of targetExtent
let extRecalcCounter = 0;
let targetStatus: AisStatus; // per interval ais target status

// ** settings **
let preferredPaths = {};
let msgInterval = 500;
let playbackMode = false;
let playbackTime: string;
const aisMgr = {
  maxAge: 540000, // time since last update in ms (9 min)
  staleAge: 360000, // time since last update in ms (6 min)
  lastTick: new Date().valueOf(),
  maxTrack: 20 // max point count in track
};

let vesselPrefs = { cogLine: 10, aisCogLine: 10 }; // selections.vessel

// ** Vessel trail management **
const trailMgr: VesselTrailConfig = {
  trailDuration: 24,
  trailResolution: {
    lastHour: '5s',
    next23: '10s',
    beyond24: '1m'
  }
};

// current delta $source
let $source!: string;
// autopilot device id
let apDeviceId = 'freeboard-sk';

// *******************************************************************

// ** Initialise message data structures **
function initVessels() {
  vessels = {
    self: new SKVessel(),
    aisTargets: new Map(),
    aisStatus: {
      updated: [],
      stale: [],
      expired: []
    },
    paths: {},
    atons: new Map(),
    aircraft: new Map(),
    sar: new Map(),
    meteo: new Map()
  };
  // flag to indicate at least one position data message received
  vessels.self['positionReceived'] = false;

  initAisTargetStatus();
}

// ** Initialise ais target status data structure **
function initAisTargetStatus() {
  targetStatus = {
    updated: {},
    stale: {},
    expired: {}
  };
}

/** handle stream event and POST Message to App**
** stream event **
{ action: 'onConnect' | 'onClose' | 'onerror' | 'onMessage', msg: stream message }

** posted message **
{ 
    action: 'closed', 
    result: 'result / message'
} 
*/
function handleStreamEvent({ action, msg }) {
  switch (action) {
    case 'onConnect':
      postMessage({
        action: 'open',
        playback: playbackMode,
        result: msg.target.readyState
      });
      break;
    case 'onClose':
      //console.warn('streamEvent: ', msg);
      closeStream(false);
      break;
    case 'onError':
      //console.warn('streamEvent: ', msg);
      postMessage({
        action: 'error',
        playback: playbackMode,
        result: 'Connection error!'
      });
      break;
    case 'onMessage':
      parseStreamMessage(msg);
      break;
  }
}

// ******** MESSAGE FROM APP ************
// ** listen for posted messages from APP
addEventListener('message', ({ data }) => {
  handleCommand(data);
});

/** handle posted Message from APP: 
    { 
        cmd: 'open' | 'close' | 'subscribe' | 'settings' | 'alarm' | 'vessel | 'auth' | 'trail',
        options: {..}
    }
 * **************************/
function handleCommand(data: MsgFromApp) {
  if (!data.cmd) {
    return;
  }
  switch (data.cmd) {
    // { cmd: 'open', options: { url: string, subscribe: string, token: string} }
    case 'open':
      //console.log('Worker control: opening stream...');
      applySettings(data.options);
      openStream(data.options);
      break;
    //** { cmd: 'close', options: {terminate: boolean} }
    case 'close':
      //console.log('Worker control: closing stream...');
      closeStream(true);
      break;
    //** { cmd: 'subscribe' , options: {context: string, path: Array<any>} }
    case 'subscribe':
      //console.log('Worker control: subscribing to paths...');
      stream.subscribe(data.options.context, data.options.path);
      break;
    //** { cmd: 'settings' , options: {..}
    case 'settings':
      //console.log('Worker control: settings...');
      applySettings(data.options);
      break;
    //** { cmd: 'alarm', options: {raise: boolean, type: string, msg: string, state: string} }
    case 'alarm':
      //console.log('Worker control: alarm action...');
      actionAlarm(data.options);
      break;
    //** { cmd: 'vessel', options: {context: string, name: string} }
    case 'vessel':
      //console.log('Worker control: vessel setting...');
      if (data.options) {
        let v: SKVessel;
        if (data.options.context === 'self') {
          v = vessels.self;
        } else {
          v = vessels.aisTargets.get(data.options.context);
        }
        if (v && data.options.name) {
          v.name = data.options.name;
        }
      }
      break;
    //** { cmd: 'auth', options: {token: string} }
    case 'auth':
      //console.log('Worker control: auth token...');
      if (data.options && typeof data.options.token !== 'undefined') {
        skToken = data.options.token;
      }
      break;
    /** { cmd: 'trail',options: {
              duration: number,
              resolution: {
                  lastHour: string,
                  next23: string,
                  beyond24: string
              }
            } 
          }
      */
    case 'trail':
      //console.log('Worker control: Fetch vessel trail from server...');
      if (data.options) {
        trailMgr.trailDuration = data.options.trailDuration ?? 24;
        if (data.options.trailResolution) {
          trailMgr.trailResolution.lastHour =
            data.options.trailResolution.lastHour ?? '5s';
          trailMgr.trailResolution.next23 =
            data.options.trailResolution.next23 ?? '1m';
          trailMgr.trailResolution.beyond24 =
            data.options.trailResolution.beyond24 ?? '5m';
        }
      }
      getVesselTrail(trailMgr);
      break;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySettings(opt: { [key: string]: any } = {}) {
  if (opt.interval && typeof opt.interval === 'number') {
    msgInterval = opt.interval;
    clearTimers();
    startTimers();
    extRecalcInterval = (1 / (msgInterval / 1000)) * 60;
  }
  playbackMode = opt.playback ? true : false;
  if (opt.selections) {
    // Preferred path selection
    if (typeof opt.selections.preferredPaths !== 'undefined') {
      preferredPaths = opt.selections.preferredPaths;
    }
    if (
      opt.selections.aisMaxAge &&
      typeof opt.selections.aisMaxAge === 'number'
    ) {
      aisMgr.maxAge = opt.selections.aisMaxAge;
    }
    if (
      opt.selections.aisStaleAge &&
      typeof opt.selections.aisStaleAge === 'number'
    ) {
      aisMgr.staleAge = opt.selections.aisStaleAge;
    }
    if (typeof opt.selections.signalk.maxRadius === 'number') {
      targetFilter.signalk = opt.selections.signalk;
    }
    if (
      typeof opt.selections.aisState !== 'undefined' &&
      Array.isArray(opt.selections.aisState)
    ) {
      targetFilter.aisState = opt.selections.aisState;
    }

    vesselPrefs = opt.selections.vessel;

    //console.log('Worker: AIS Filter...', targetFilter);
  }
}

// **************************************

function closeStream(fromCommand = false) {
  clearTimers();
  unsubscribe.forEach((i) => i.unsubscribe());
  if (stream && fromCommand) {
    stream.close();
  }
  stream = null;
  postMessage({
    action: 'close',
    result: fromCommand,
    playback: playbackMode
  });
}

// fetch from api endpoint
function apiGet(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    fetch(`${url}`)
      .then((r: Response) => {
        r.json()
          .then((j) => resolve(j))
          .catch((err) => reject(err));
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// fetch other vessel tracks
function getAISTracks() {
  const filter: string =
    targetFilter && targetFilter.signalk && targetFilter.signalk.maxRadius
      ? `?radius=${targetFilter.signalk.maxRadius}`
      : `?radius=10000`; // default radius if none supplied
  apiGet(apiUrl + '/tracks' + filter)
    .then((r) => {
      hasTrackPlugin = true;
      // update ais vessels track data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(r).forEach((t: any) => {
        if (vessels.aisTargets.has(t[0])) {
          const v = vessels.aisTargets.get(t[0]);
          v.track = t[1].coordinates;
          appendTrack(v);
        }
      });
    })
    .catch(() => {
      hasTrackPlugin = false;
      //console.warn('Unable to fetch AIS tracks!');
    });
}

// fetch vessel trail from server
function getVesselTrail(opt: VesselTrailConfig) {
  //console.info('Worker: Fetching vessel trail from server', opt);
  const url = apiUrl + '/self/track?';
  const req = [];
  const tolerance = 0.0005; //0.0001
  const highQuality = true;
  // set up fetch requests
  if (opt.trailDuration > 24) {
    // beyond last 24hrs
    req.push(
      apiGet(
        `${url}timespan=${opt.trailDuration - 24}h&resolution=${
          opt.trailResolution.beyond24
        }&timespanOffset=24`
      )
    );
    req.push(
      apiGet(
        `${url}timespan=23h&resolution=${opt.trailResolution.next23}&timespanOffset=1`
      )
    );
  }
  if (opt.trailDuration > 1 && opt.trailDuration < 25) {
    // last 24hrs
    req.push(
      apiGet(
        `${url}timespan=${opt.trailDuration - 1}h&resolution=${
          opt.trailResolution.next23
        }&timespanOffset=1`
      )
    );
  }
  // lastHour
  req.push(
    apiGet(`${url}timespan=1h&resolution=${opt.trailResolution.lastHour}`)
  );

  let trail = [];
  const msg = new TrailMessage();
  msg.playback = playbackMode;

  Promise.all(req)
    .then((res) => {
      let idx = 0;
      const lastIdx = req.length - 1;
      const segLen = 60; // max line segment length (OL rendering treatment)

      res.forEach((r) => {
        if (r.type && r.type === 'MultiLineString') {
          if (r.coordinates && Array.isArray(r.coordinates)) {
            if (idx !== lastIdx) {
              // > 1hr simplify trail
              let coords = [];
              r.coordinates.forEach((line) => {
                coords = coords.concat(line);
              });
              coords = SimplifyAP(coords, tolerance, highQuality);
              // break up into segments for OL rendering
              while (coords.length > segLen) {
                const ls = coords.slice(0, segLen);
                trail.push(ls);
                coords = coords.slice(segLen - 1); // ensure segments join
                // offset first point so OL renders
                coords[0] = [
                  coords[0][0] + 0.000000005,
                  coords[0][1] + 0.000000005
                ];
              }
              if (coords.length !== 0) {
                trail.push(coords);
              }
            } else {
              // last Hour
              trail = trail.concat(r.coordinates);
            }
          }
        }
        idx++;
      });
      msg.result = trail;
      postMessage(msg);
    })
    .catch(() => {
      msg.result = null;
      postMessage(msg);
    });
}

function openStream(opt) {
  if (stream) {
    return;
  }
  if (!opt.url) {
    postMessage({ action: 'error', result: 'Valid options not provided!' });
    return;
  }
  // compose apiUrl
  const u = opt.url.split('/');
  u.pop();
  u.push('api');
  u[0] = u[0] === 'wss:' ? 'https:' : 'http:';
  apiUrl = u.join('/');

  initVessels();
  stream = new SignalKStreamWorker();
  unsubscribe.push(
    stream.onConnect.subscribe((r) =>
      handleStreamEvent({ action: 'onConnect', msg: r })
    )
  );
  unsubscribe.push(
    stream.onClose.subscribe((r) =>
      handleStreamEvent({ action: 'onClose', msg: r })
    )
  );
  unsubscribe.push(
    stream.onError.subscribe((r) =>
      handleStreamEvent({ action: 'onError', msg: r })
    )
  );
  unsubscribe.push(
    stream.onMessage.subscribe((r) =>
      handleStreamEvent({ action: 'onMessage', msg: r })
    )
  );
  stream.authToken = skToken;
  if (opt.playback) {
    //playback?subscribe=self&startTime=2018-08-24T15:19:09Z&playbackRate=5
    const st = opt.playbackOptions.startTime
      ? `?startTime=${opt.playbackOptions.startTime}`
      : null;
    let pbr = opt.playbackOptions.playbackRate
      ? `playbackRate=${opt.playbackOptions.playbackRate}`
      : null;
    pbr = pbr ? (st ? '&' + pbr : '?' + pbr) : null;
    const url = `${opt.url}${st ? st : ''}${pbr ? pbr : ''}`;
    stream.open(url, opt.playbackOptions.subscribe, opt.token);
  } else {
    stream.open(opt.url, opt.subscribe, opt.token);
    getAISTracks();
  }
}

function actionAlarm(opt) {
  const n =
    opt.type.indexOf('notifications.') === -1
      ? `notifications.${opt.type}`
      : opt.type;
  if (opt.raise) {
    // raise alarm
    stream.raiseAlarm('self', n, new Alarm(opt.message, opt.state, true, true));
  } else {
    stream.clearAlarm('self', n);
  } // clear alarm
}

// **************************************

// ** process Signal K message **
function parseStreamMessage(data) {
  if (stream.isHello(data)) {
    // hello
    postMessage({
      action: 'hello',
      result: data,
      self: data.self,
      playback: playbackMode
    });
    if (msgInterval) {
      startTimers();
    }
  } else if (stream.isDelta(data)) {
    // update
    updateReceived = true;
    data.updates.forEach((u) => {
      if (!u.values) {
        return;
      }
      $source = u.$source;
      u.values.forEach((v) => {
        playbackTime = u.timestamp;
        if (!data.context) {
          return;
        }
        switch (data.context.split('.')[0]) {
          case 'shore': // shore
          case 'atons': // aids to navigation
            if (targetFilter?.signalk.atons) {
              processAtoN(data.context, v);
            }
            filterContext(
              data.context,
              vessels.atons,
              targetFilter?.signalk.atons
            );
            break;
          case 'sar': // search and rescue
            if (targetFilter?.signalk.sar) {
              processSaR(data.context, v);
            }
            filterContext(data.context, vessels.sar, targetFilter?.signalk.sar);
            break;
          case 'aircraft': // aircraft
            if (targetFilter?.signalk.aircraft) {
              processAircraft(data.context, v);
            }
            filterContext(
              data.context,
              vessels.aircraft,
              targetFilter?.signalk.aircraft
            );
            break;
          case 'meteo': // weather station
            if (targetFilter?.signalk.meteo) {
              processMeteo(data.context, v), processNotifications(v);
            }
            filterContext(
              data.context,
              vessels.meteo,
              targetFilter?.signalk.meteo
            );
            break;

          case 'vessels': // vessels
            if (stream.isSelf(data)) {
              // self
              if (!vessels.self.id) {
                vessels.self.id = data.context;
              }
              processVessel(vessels.self, v, true), processNotifications(v);
            } else {
              // other vessels
              if (targetFilter?.signalk.vessels) {
                const oVessel = selectVessel(data.context);
                processVessel(oVessel, v);
              }
              filterContext(
                data.context,
                vessels.aisTargets,
                targetFilter?.signalk.vessels,
                targetFilter?.aisState
              );
            }
            break;
        }
      });
    });
    postUpdate();
  } else if (stream.isResponse(data)) {
    // request response
    postMessage({
      action: 'response',
      result: data
    });
  }
}

// ** parse and filter a context update
function filterContext(
  context: string,
  group: GroupFilter,
  enabled = true,
  state: Array<string> = []
) {
  if (enabled) {
    let obj = group.get(context);
    // filter on state
    if (obj && state.includes(obj?.state)) {
      //console.log(`state match => ${state}, ${context}`);
      targetStatus.expired[context] = true;
      obj = null; // skip subsequent filters
    }
    // filter on max radius
    if (obj && targetFilter.signalk.maxRadius) {
      if (
        obj['positionReceived'] &&
        GeoUtils.inBounds(obj.position, targetExtent)
      ) {
        targetStatus.updated[context] = true;
      } else {
        group.delete(context);
        targetStatus.expired[context] = true;
      }
    } else {
      targetStatus.updated[context] = true;
    }
  } else {
    if (group.size !== 0) {
      group.forEach((v, k) => {
        targetStatus.expired[k] = true;
      });
      group.clear();
    }
  }
}

//** POST message to App**
function postUpdate(immediate = false) {
  if (!msgInterval || immediate) {
    const msg = new UpdateMessage();
    msg.playback = playbackMode;
    vessels.aisStatus.updated = Object.keys(targetStatus.updated);
    vessels.aisStatus.stale = Object.keys(targetStatus.stale);
    vessels.aisStatus.expired = Object.keys(targetStatus.expired);
    msg.result = vessels;
    msg.timestamp = playbackMode
      ? playbackTime
      : vessels.self.lastUpdated.toISOString();
    postMessage(msg);
    initAisTargetStatus();
    vessels.self.resourceUpdates = [];
    // cleanup and extent calc
    if (extRecalcCounter === 0) {
      processAISStatus();
      if (vessels.self['positionReceived'] && targetFilter?.signalk.maxRadius) {
        targetExtent = GeoUtils.calcMapifiedExtent(
          vessels.self.position,
          targetFilter.signalk.maxRadius
        );
        extRecalcCounter++;
        //console.log('** AIS status & targetExtent**', targetExtent);
      }
    }
    extRecalcCounter =
      extRecalcCounter >= extRecalcInterval ? 0 : extRecalcCounter + 1;
  }
}

// **************************************

// ** start message timers
function startTimers() {
  if (msgInterval && typeof msgInterval === 'number') {
    timers.push(
      setInterval(() => {
        if (updateReceived) {
          postUpdate(true);
          updateReceived = false;
        }
      }, msgInterval)
    );
  }
  timers.push(
    setInterval(() => {
      //console.warn('hasTrackPlugin', hasTrackPlugin);
      if (hasTrackPlugin) {
        getAISTracks();
      }
    }, 60000)
  );
}

// ** clear message timers
function clearTimers() {
  timers.forEach((t) => clearInterval(t));
  timers = [];
}

// ********** Process vessel data *******

// ** return selected SKVessel from vessels.aisTargets
function selectVessel(id: string): SKVessel {
  if (!vessels.aisTargets.has(id)) {
    const vessel = new SKVessel();
    vessel.id = id;
    vessel.position = null;
    vessels.aisTargets.set(id, vessel);
  }
  return vessels.aisTargets.get(id);
}

// ** process common vessel data and true / magnetic preference **
function processVessel(d: SKVessel, v: any, isSelf = false) {
  d.lastUpdated = new Date();

  // ** record received preferred path names for selection
  if (isSelf) {
    const cp =
      v.path.indexOf('course') !== -1
        ? v.path.split('.').slice(0, 2).join('.')
        : v.path;
    if (prefSourcePaths.indexOf(cp) !== -1) {
      vessels.paths[cp] = null;
    }
    // racing properties
    if (v.path.includes('navigation.racing')) {
      d.properties[v.path] = v.value;
    }
  } else {
    // not self
    if (v.path.includes('navigation.distanceToSelf')) {
      d.distanceToSelf = v.value;
    }
  }

  if (v.path === '') {
    if (typeof v.value.name !== 'undefined') {
      d.name = v.value.name;
    }
    if (typeof v.value.mmsi !== 'undefined') {
      d.mmsi = v.value.mmsi;
    }
    if (typeof v.value.registrations !== 'undefined') {
      d.registrations = v.value.registrations;
    }
    if (typeof v.value.buddy !== 'undefined') {
      d.buddy = v.value.buddy;
    }
    if (typeof v.value.communication !== 'undefined') {
      d.callsignVhf = v.value.communication.callsignVhf ?? '';
      d.callsignHf = v.value.communication.callsignHf ?? '';
    }
  } else if (v.path === 'communication.callsignVhf') {
    d.callsignVhf = v.value;
  } else if (v.path === 'communication.callsignHf') {
    d.callsignHf = v.value;
  } else if (v.path === 'performance.beatAngle') {
    d.performance.beatAngle = v.value;
  } else if (v.path === 'performance.gybeAngle') {
    d.performance.gybeAngle = v.value;
  } else if (v.path === 'design.aisShipType') {
    d.type = v.value;
  } else if (v.path === 'navigation.position' && v.value) {
    // position is not null
    if (
      typeof v.value.latitude === 'undefined' ||
      typeof v.value.longitude === 'undefined'
    ) {
      return;
    } // invalid
    d.position = GeoUtils.normaliseCoords([
      v.value.longitude,
      v.value.latitude
    ]);
    d['positionReceived'] = true;
    if (!isSelf) {
      appendTrack(d);
    }
  } else if (v.path === 'navigation.state') {
    d.state = v.value;
  } else if (v.path === 'navigation.speedOverGround') {
    d.sog = v.value;
  }

  // ** environment.wind **
  else if (v.path === 'environment.wind.angleApparent') {
    d.wind.awa = v.value;
  } else if (v.path === 'environment.wind.speedApparent') {
    d.wind.aws = v.value;
  }

  // ** tws **
  else if (v.path === 'environment.wind.speedTrue') {
    d.wind.speedTrue = v.value;
  } else if (v.path === 'environment.wind.speedOverGround') {
    d.wind.sog = v.value;
  }

  // ** wind direction **
  else if (v.path === 'environment.wind.directionTrue') {
    d.wind.twd = v.value;
  } else if (v.path === 'environment.wind.directionMagnetic') {
    d.wind.mwd = v.value;
  }

  // ** environment.mode
  else if (v.path === 'environment.mode') {
    d.mode = v.value;
  }

  // ** course API data
  else if (v.path.indexOf('navigation.course.') !== -1) {
    if (v.path.indexOf('navigation.course.calcValues') !== -1) {
      if (v.path.indexOf('navigation.course.calcValues.previousPoint') === -1) {
        d[`course.${v.path.split('.').slice(-1)[0]}`] = v.value;
      }
    } else if (v.path.indexOf('navigation.course.activeRoute') !== -1) {
      d.courseApi.activeRoute = v.value;
    } else if (v.path.indexOf('navigation.course.nextPoint') !== -1) {
      d.courseApi.nextPoint = v.value;
    } else if (v.path.indexOf('navigation.course.previousPoint') !== -1) {
      d.courseApi.previousPoint = v.value;
    } else if (v.path === 'navigation.course.arrivalCircle') {
      d.courseApi.arrivalCircle = v.value;
    }
  }

  // anchor radius / position
  else if (v.path === 'navigation.anchor.position') {
    d.anchor.position = v.value;
  } else if (v.path === 'navigation.anchor.maxRadius') {
    d.anchor.maxRadius = v.value;
  } else if (v.path === 'navigation.anchor.currentRadius') {
    d.anchor.radius = v.value;
  }

  // resource deltas
  else if (v.path.indexOf('resources.') !== -1) {
    d.resourceUpdates.push(v);
  }

  // steering.autopilot
  else if (v.path === 'steering.autopilot.state' && $source === apDeviceId) {
    d.autopilot.state = v.value;
  } else if (v.path === 'steering.autopilot.mode' && $source === apDeviceId) {
    d.autopilot.mode = v.value;
  } else if (v.path === 'steering.autopilot.target' && $source === apDeviceId) {
    d.autopilot.target = v.value;
  } else if (
    v.path === 'steering.autopilot.engaged' &&
    $source === apDeviceId
  ) {
    d.autopilot.enabled = v.value;
  } else if (v.path === 'steering.autopilot.defaultPilot') {
    d.autopilot.default = v.value;
    apDeviceId = v.value;
  }

  // ** cog **
  else if (v.path === 'navigation.courseOverGroundTrue') {
    d.cogTrue = v.value;
  } else if (v.path === 'navigation.courseOverGroundMagnetic') {
    d.cogMagnetic = v.value;
  }

  // ** heading **
  else if (v.path === 'navigation.headingTrue') {
    d.headingTrue = v.value;
  } else if (v.path === 'navigation.headingMagnetic') {
    d.headingMagnetic = v.value;
  }

  // use preferred heading value for orientation **
  if (
    typeof preferredPaths['heading'] !== 'undefined' &&
    v.path === preferredPaths['heading']
  ) {
    d.orientation = v.value;
  }

  // use preferred path value for tws **
  if (
    typeof preferredPaths['tws'] !== 'undefined' &&
    v.path === preferredPaths['tws']
  ) {
    d.wind.tws = v.value;
  }
  // use preferred path value for twd **
  if (
    typeof preferredPaths['twd'] !== 'undefined' &&
    v.path === preferredPaths['twd']
  ) {
    d.wind.direction =
      v.path === 'environment.wind.angleTrueGround' ||
      v.path === 'environment.wind.angleTrueWater'
        ? Convert.angleToDirection(v.value, d.orientation ?? 0)
        : v.value;
  }

  // ** cog vector **
  const cog = d.cogTrue ?? d.cogMagnetic ?? undefined;
  if (typeof cog !== 'undefined' && d.position) {
    const cogLen = isSelf ? vesselPrefs.cogLine : vesselPrefs.aisCogLine;
    const cvlen = (d.sog ?? 0) * (cogLen * 60);
    d.vectors.cog = [
      d.position,
      GeoUtils.destCoordinate(d.position, cog, cvlen)
    ];
  }
}

// process notification messages **
function processNotifications(v: PathValue) {
  if (v.path.includes('notifications.')) {
    const msg: NotificationMessage = new NotificationMessage();
    msg.playback = playbackMode;
    msg.result = {
      path: v.path,
      value: v.value,
      sourceRef: $source
    };
    postMessage(msg);
  }
}

// process / cleanup stale / obsolete AIS vessels, aircraft, SaR targets
function processAISStatus() {
  const now = new Date().valueOf();
  vessels.aisTargets.forEach((v, k) => {
    //if not present then mark for deletion
    if (v.lastUpdated.valueOf() < now - aisMgr.maxAge) {
      targetStatus.expired[k] = true;
      vessels.aisTargets.delete(k);
    } else if (v.lastUpdated.valueOf() < now - aisMgr.staleAge) {
      //if stale then mark inactive
      targetStatus.stale[k] = true;
    }
  });
  vessels.aircraft.forEach((v, k) => {
    //if not present then mark for deletion
    if (v.lastUpdated.valueOf() < now - aisMgr.maxAge) {
      targetStatus.expired[k] = true;
      vessels.aircraft.delete(k);
    } else if (v.lastUpdated.valueOf() < now - aisMgr.staleAge) {
      //if stale then mark inactive
      targetStatus.stale[k] = true;
    }
  });
  vessels.sar.forEach((v, k) => {
    //if not present then mark for deletion
    if (v.lastUpdated.valueOf() < now - aisMgr.maxAge) {
      targetStatus.expired[k] = true;
      vessels.sar.delete(k);
    } else if (v.lastUpdated.valueOf() < now - aisMgr.staleAge) {
      //if stale then mark inactive
      targetStatus.stale[k] = true;
    }
  });
}

// process AtoN values
function processAtoN(id: string, v): string {
  let isBaseStation = false;
  if (id.indexOf('shore.basestations') !== -1) {
    isBaseStation = true;
  }
  if (!vessels.atons.has(id)) {
    const aton = new SKAtoN();
    aton.id = id;
    aton.position = null;
    if (isBaseStation) {
      aton.type.id = -1;
      aton.type.name = 'Basestation';
    }
    vessels.atons.set(id, aton);
  }
  const d = vessels.atons.get(id);
  if (v.path === '') {
    if (typeof v.value.name !== 'undefined') {
      d.name = v.value.name;
    }
    if (typeof v.value.mmsi !== 'undefined') {
      d.mmsi = v.value.mmsi;
    }
    if (typeof v.value.atonType !== 'undefined') {
      d.type = v.value.atonType;
    }
  } else if (v.path === 'atonType') {
    d.type = v.value;
  } else if (v.path === 'virtual') {
    d.virtual = v.value;
  } else if (v.path === 'navigation.position') {
    d.position = [v.value.longitude, v.value.latitude];
    d['positionReceived'] = true;
  }
  // properties
  else {
    d.properties[v.path] = v.value;
  }

  return id;
}

// process SaR values
function processSaR(id: string, v) {
  if (!vessels.sar.has(id)) {
    const sar = new SKSaR();
    sar.id = id;
    sar.position = null;
    sar.type.id = -1;
    sar.type.name = 'SaR Beacon';
    vessels.sar.set(id, sar);
  }
  const d = vessels.sar.get(id);
  if (v.path === '') {
    if (typeof v.value.name !== 'undefined') {
      d.name = v.value.name;
    }
    if (typeof v.value.mmsi !== 'undefined') {
      d.mmsi = v.value.mmsi;
    }
    if (typeof v.value.communication !== 'undefined') {
      d.callsignVhf = v.value.communication.callsignVhf ?? '';
      d.callsignHf = v.value.communication.callsignHf ?? '';
    }
  } else if (v.path === 'communication.callsignVhf') {
    d.callsignVhf = v.value;
  } else if (v.path === 'communication.callsignHf') {
    d.callsignHf = v.value;
  } else if (v.path === 'navigation.position' && v.value) {
    d.position = GeoUtils.normaliseCoords([
      v.value.longitude,
      v.value.latitude
    ]);
    d['positionReceived'] = true;
  }
}

// process Meteo values
function processMeteo(id: string, v) {
  if (!vessels.meteo.has(id)) {
    const meteo = new SKMeteo();
    meteo.id = id;
    meteo.position = null;
    meteo.type.id = -1;
    meteo.type.name = 'Weather Station';
    vessels.meteo.set(id, meteo);
  }
  const d = vessels.meteo.get(id);
  if (v.path === '') {
    if (typeof v.value.name !== 'undefined') {
      d.name = v.value.name;
    }
    if (typeof v.value.mmsi !== 'undefined') {
      const nid = id.split(':').slice(-2); //meteo extended id
      d.mmsi = nid.length === 2 ? `${nid[0]}:${nid[1]}` : v.value.mmsi;
    }
    if (typeof v.value.communication !== 'undefined') {
      d.callsignVhf = v.value.communication.callsignVhf ?? '';
      d.callsignHf = v.value.communication.callsignHf ?? '';
    }
  } else if (v.path === 'communication.callsignVhf') {
    d.callsignVhf = v.value;
  } else if (v.path === 'communication.callsignHf') {
    d.callsignHf = v.value;
  } else if (v.path === 'environment.outside.temperature') {
    d.temperature = v.value;
  } else if (v.path === 'environment.wind.directionTrue') {
    d.twd = v.value;
  } else if (v.path === 'environment.wind.averageSpeed') {
    d.tws = v.value;
  } else if (v.path === 'navigation.position' && v.value) {
    d.position = GeoUtils.normaliseCoords([
      v.value.longitude,
      v.value.latitude
    ]);
    d['positionReceived'] = true;
  }
}

function processAircraft(id: string, v) {
  if (!vessels.aircraft.has(id)) {
    const aircraft = new SKAircraft();
    aircraft.id = id;
    aircraft.position = null;
    vessels.aircraft.set(id, aircraft);
  }
  const d = vessels.aircraft.get(id);
  if (v.path === '') {
    if (typeof v.value.name !== 'undefined') {
      d.name = v.value.name;
    }
    if (typeof v.value.mmsi !== 'undefined') {
      d.mmsi = v.value.mmsi;
    }
    if (typeof v.value.communication !== 'undefined') {
      d.callsignVhf = v.value.communication.callsignVhf ?? '';
      d.callsignHf = v.value.communication.callsignHf ?? '';
    }
  } else if (v.path === 'communication.callsignVhf') {
    d.callsignVhf = v.value;
  } else if (v.path === 'communication.callsignHf') {
    d.callsignHf = v.value;
  } else if (v.path === 'navigation.position' && v.value) {
    d.position = GeoUtils.normaliseCoords([
      v.value.longitude,
      v.value.latitude
    ]);
    d['positionReceived'] = true;
    appendTrack(d);
  } else if (v.path === 'navigation.courseOverGroundTrue') {
    d.orientation = v.value;
  } else if (v.path === 'navigation.speedOverGround') {
    d.sog = v.value;
  }
}

// ** append track data to up to value of maxTrack **
function appendTrack(d: SKAircraft | SKVessel) {
  if (d.track && d.track.length === 0) {
    d.track.push([d.position]);
  } else {
    const l = d.track[d.track.length - 1].length;
    const lastPoint = d.track[d.track.length - 1][l - 1];
    if (lastPoint[0] !== d.position[0] && lastPoint[1] !== d.position[1]) {
      d.track[d.track.length - 1].push(d.position);
    }
  }
  d.track[d.track.length - 1] = d.track[d.track.length - 1].slice(
    0 - aisMgr.maxTrack
  );
}
