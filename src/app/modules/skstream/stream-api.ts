import { Subject, Observable } from 'rxjs';
import * as uuid from 'uuid';
import type {
  Context,
  Delta,
  Path,
  PathValue,
  Timestamp,
  Update,
  Value
} from '@signalk/server-api';
import type {
  SKHelloMessage,
  SKRequestResponse,
  SKStreamMessage,
  SKStreamRequest,
  SKStreamSubscribe,
  SKStreamUnsubscribe,
  SKStreamUpdates,
  SKSubscriptionOptions
} from 'src/app/types/stream';

/** Source label attached to updates sent via the stream */
interface UpdateSource {
  label: string;
}

export class SKStreamAPI {
  private _connect: Subject<Event>;
  private _close: Subject<CloseEvent>;
  private _error: Subject<Event>;
  private _message: Subject<SKStreamMessage>;

  private ws: WebSocket | null;
  private _filter: string = ''; // id of vessel to filter delta messages
  private _wsTimeout = 20000; // websocket connection timeout
  private _token: string = '';
  private _playbackMode: boolean = false;

  // **************** ATTRIBUTES ***************************

  public onConnect: Observable<Event>;
  public onClose: Observable<CloseEvent>;
  public onError: Observable<Event>;
  public onMessage: Observable<SKStreamMessage>;

  public version: number = 1;
  public endpoint: string = '';
  public selfId: string = '';
  public _source: UpdateSource | null = null;

  /** set source label for use in messages */
  set source(val: string) {
    if (!this._source) {
      this._source = { label: val };
    } else {
      this._source.label = val;
    }
  }

  /** set auth token value */
  set authToken(val: string) {
    this._token = val;
  }
  /** get websocket connection timeout value */
  get connectionTimeout(): number {
    return this._wsTimeout;
  }
  /** set websocket connection timeout (3000 <= timeout <= 60000) */
  set connectionTimeout(val: number) {
    this._wsTimeout = val < 3000 ? 3000 : val > 60000 ? 60000 : val;
  }
  /** is WS Stream connected? */
  get isOpen(): boolean {
    return this.ws && this.ws.readyState !== 1 && this.ws.readyState !== 3
      ? true
      : false;
  }
  /** get / set filter to select delta messages just for supplied vessel id */
  get filter(): string {
    return this._filter;
  }
  /** set filter= null to remove message filtering */
  set filter(id: string) {
    if (id && id.indexOf('self') !== -1) {
      // ** self
      this._filter = this.selfId ? this.selfId : '';
    } else {
      this._filter = id;
    }
  }
  /** returns true if Playback Hello message */
  get playbackMode(): boolean {
    return this._playbackMode;
  }

  // ******************************************************

  constructor() {
    this._connect = new Subject<Event>();
    this.onConnect = this._connect.asObservable();
    this._close = new Subject<CloseEvent>();
    this.onClose = this._close.asObservable();
    this._error = new Subject<Event>();
    this.onError = this._error.asObservable();
    this._message = new Subject<SKStreamMessage>();
    this.onMessage = this._message.asObservable();
  }

  /** Close WebSocket connection */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Open a WebSocket at provided url
   * @param url Websocket URL
   * @param subscribe SignalK subscription string
   * @param token Authentication token
   */
  open(url: string, subscribe?: string, token?: string) {
    url = url ? url : this.endpoint;
    if (!url) {
      return;
    }
    const q = url.indexOf('?') === -1 ? '?' : '&';
    if (subscribe) {
      url += `${q}subscribe=${subscribe}`;
    }
    if (this._token || token) {
      url += `${subscribe ? '&' : '?'}token=${this._token || token}`;
    }

    this.close();
    this.ws = new WebSocket(url);
    // ** start connection watchdog **
    setTimeout(() => {
      if (this.ws && this.ws.readyState !== 1 && this.ws.readyState !== 3) {
        console.warn(
          `Connection watchdog expired (${this._wsTimeout / 1000} sec): ${
            this.ws.readyState
          }... aborting connection...`
        );
        this.close();
      }
    }, this._wsTimeout);

    this.ws.onopen = (e: Event) => {
      this._connect.next(e);
    };
    this.ws.onclose = (e: CloseEvent) => {
      this._close.next(e);
    };
    this.ws.onerror = (e: Event) => {
      this._error.next(e);
    };
    this.ws.onmessage = (e: MessageEvent) => {
      this.parseOnMessage(e);
    };
  }

  /** parse received message */
  private parseOnMessage(e: MessageEvent) {
    let data: SKStreamMessage;
    if (typeof e.data === 'string') {
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
    }
    if (this.isHello(data)) {
      this.selfId = data.self;
      this._playbackMode = typeof data.startTime !== 'undefined' ? true : false;
      this._message.next(data);
    } else if (this.isResponse(data)) {
      if (typeof data.login !== 'undefined') {
        if (typeof data.login.token !== 'undefined') {
          this._token = data.login.token;
        }
      }
      this._message.next(data);
    } else if (this._filter && this.isDelta(data)) {
      if (data.context === this._filter) {
        this._message.next(data);
      }
    } else {
      this._message.next(data);
    }
  }

  /** send request via Delta stream */
  sendRequest(value: Record<string, unknown>): string {
    if (typeof value !== 'object') {
      return '';
    }
    const msg = Message.request();
    if (typeof value.login === 'undefined' && this._token) {
      msg['token'] = this._token;
    }
    const keys = Object.keys(value);
    keys.forEach((k) => {
      msg[k] = value[k];
    });
    this.send(msg);
    return msg.requestId;
  }

  /** send put request via Delta stream */
  put(context: string, path: string, value: Value): string {
    const msg = {
      context: context === 'self' ? 'vessels.self' : context,
      put: { path: path, value: value }
    };
    return this.sendRequest(msg);
  }

  /** get auth token for supplied user details */
  login(username: string, password: string) {
    const msg = {
      login: { username: username, password: password }
    };
    return this.sendRequest(msg);
  }

  /** send data to Signal K stream */
  send(data: string | object) {
    if (this.ws) {
      this.ws.send(typeof data === 'object' ? JSON.stringify(data) : data);
    }
  }

  /** send value(s) via delta stream update */
  sendUpdate(context: string, path: Array<PathValue>): void;
  sendUpdate(context: string, path: string, value: Value): void;
  sendUpdate(
    context: string = 'self',
    path: string | Array<PathValue>,
    value?: Value
  ): void {
    const val = Message.updates();
    if (this._token) {
      val['token'] = this._token;
    }
    val.context = (context === 'self' ? 'vessels.self' : context) as Context;
    if (this._token) {
      val['token'] = this._token;
    }

    let uValues: PathValue[] = [];
    if (typeof path === 'string') {
      uValues.push({ path: path as Path, value: value });
    }
    if (typeof path === 'object' && Array.isArray(path)) {
      uValues = path;
    }
    const u: Update = {
      timestamp: new Date().toISOString() as Timestamp,
      values: uValues
    };
    if (this._source) {
      u.source = this._source;
    }
    val.updates.push(u);
    this.send(val);
  }

  /** Subscribe to Delta stream messages options: {..} */
  subscribe(context: string, path: Array<SKSubscriptionOptions>): void;
  subscribe(
    context: string,
    path: string,
    options?: Omit<SKSubscriptionOptions, 'path'>
  ): void;
  subscribe(
    context: string = '*',
    path: string | Array<SKSubscriptionOptions> = '*',
    options?: Omit<SKSubscriptionOptions, 'path'>
  ): void {
    const val = Message.subscribe();
    if (this._token) {
      val['token'] = this._token;
    }
    val.context = (context === 'self' ? 'vessels.self' : context) as Context;
    if (this._token) {
      val['token'] = this._token;
    }

    if (typeof path === 'object' && Array.isArray(path)) {
      val.subscribe = path;
    }
    if (typeof path === 'string') {
      const sValue: SKSubscriptionOptions = { path: path };
      if (options && typeof options === 'object') {
        if (options['period']) {
          sValue['period'] = options['period'];
        }
        if (options['minPeriod']) {
          sValue['minPeriod'] = options['period'];
        }
        if (
          options['format'] &&
          (options['format'] === 'delta' || options['format'] === 'full')
        ) {
          sValue['format'] = options['format'];
        }
        if (
          options['policy'] &&
          (options['policy'] === 'instant' ||
            options['policy'] === 'ideal' ||
            options['policy'] === 'fixed')
        ) {
          sValue['policy'] = options['policy'];
        }
      }
      val.subscribe.push(sValue);
    }
    this.send(val);
  }

  // ** Unsubscribe from Delta stream messages **
  unsubscribe(
    context: string = '*',
    path: string | Array<{ path: string }> = '*'
  ) {
    const val = Message.unsubscribe();
    if (this._token) {
      val['token'] = this._token;
    }
    val.context = (context === 'self' ? 'vessels.self' : context) as Context;
    if (this._token) {
      val['token'] = this._token;
    }

    if (typeof path === 'object' && Array.isArray(path)) {
      val.unsubscribe = path;
    }
    if (typeof path === 'string') {
      val.unsubscribe.push({ path: path });
    }
    this.send(val);
  }

  /** raise alarm for path */
  raiseAlarm(context: string, name: string, alarm: Alarm): void;
  raiseAlarm(context: string, type: AlarmType, alarm: Alarm): void;
  raiseAlarm(
    context: string = '*',
    alarmId: string | AlarmType,
    alarm: Alarm
  ): void {
    let path: string;
    if (typeof alarmId === 'string') {
      path =
        alarmId.indexOf('notifications.') === -1
          ? `notifications.${alarmId}`
          : alarmId;
    } else {
      path = alarmId;
    }
    this.put(context, path, alarm.value);
  }

  /** raise alarm for path */
  clearAlarm(context: string = '*', name: string) {
    const path =
      name.indexOf('notifications.') === -1 ? `notifications.${name}` : name;
    this.put(context, path, null);
  }

  // *************** MESSAGE PARSING ******************************
  /** returns true if message context is 'self' */
  isSelf(msg: Delta): boolean {
    return msg.context === this.selfId;
  }
  /** returns true if message is a Delta message */
  isDelta(msg: SKStreamMessage): msg is Delta {
    return typeof (msg as Delta).context !== 'undefined';
  }
  /** returns true if message is a Hello message */
  isHello(msg: SKStreamMessage): msg is SKHelloMessage {
    return (
      typeof (msg as SKHelloMessage).version !== 'undefined' &&
      typeof (msg as SKHelloMessage).self !== 'undefined'
    );
  }
  /** returns true if message is a request Response message */
  isResponse(msg: SKStreamMessage): msg is SKRequestResponse {
    return typeof (msg as SKRequestResponse).requestId !== 'undefined';
  }
}

/** Message templates */
export class Message {
  /** return UPDATES message object
   * @returns  array of { values: [ {path: xx, value: xx } ] }
   */
  static updates(): SKStreamUpdates {
    return {
      context: null,
      updates: []
    };
  }
  /** 
   * @description return SUBSCRIBE message object
   * @returns array of {
        "path": "path.to.key",
        "period": 1000,
        "format": "delta",
        "policy": "ideal",
        "minPeriod": 200
    } 
    */
  static subscribe(): SKStreamSubscribe {
    return {
      context: null,
      subscribe: []
    };
  }
  /**
   * @description return UNSUBSCRIBE message object
   * @returns array of { "path": "path.to.key" }
   */
  static unsubscribe(): SKStreamUnsubscribe {
    return {
      context: null,
      unsubscribe: []
    };
  }
  /**
   * @description return REQUEST message object
   * @returns value { "requestId": <uuid v4> }
   */
  static request(): SKStreamRequest {
    return {
      requestId: uuid.v4()
    };
  }
}

/** Alarm message */
export class Alarm {
  private _state: AlarmState;
  private _method: Array<AlarmMethod> = [];
  private _message: string = '';

  constructor(
    message: string,
    state?: AlarmState,
    visual?: boolean,
    sound?: boolean
  ) {
    this._message = typeof message !== 'undefined' ? message : '';
    this._state = typeof state !== 'undefined' ? state : AlarmState.alarm;
    if (visual) {
      this._method.push(AlarmMethod.visual);
    }
    if (sound) {
      this._method.push(AlarmMethod.sound);
    }
  }

  get value() {
    return {
      message: this._message,
      state: this._state,
      method: this._method
    };
  }
}

export enum AlarmState {
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency'
}

export enum AlarmMethod {
  visual = 'visual',
  sound = 'sound'
}

export enum AlarmType {
  mob = 'notifications.mob',
  fire = 'notifications.fire',
  sinking = 'notifications.sinking',
  flooding = 'notifications.flooding',
  collision = 'notifications.collision',
  grounding = 'notifications.grounding',
  listing = 'notifications.listing',
  adrift = 'notifications.adrift',
  piracy = 'notifications.piracy',
  abandon = 'notifications.abandon'
}
