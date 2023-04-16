// ** Notifications **
export enum ALARM_STATE {
  nominal = 'nominal',
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency'
}

export enum ALARM_METHOD {
  visual = 'visual',
  sound = 'sound'
}

// ** Server Messages **
export interface DeltaMessage {
  path: string;
  value: object | string | number | null;
}

export interface DeltaUpdate {
  updates: [
    {
      values: Array<DeltaMessage>;
    }
  ];
}

export interface DeltaNotification extends DeltaMessage {
  value: {
    state: ALARM_STATE;
    method: Array<ALARM_METHOD>;
    message: string;
  };
}

export interface ActionResult {
  state: string;
  statusCode: number;
  message?: string;
  resultStatus?: number;
}

// Class encapsulating Signal K Notification
export class Notification {
  private _message: DeltaNotification = {
    path: `notifications.`,
    value: {
      state: ALARM_STATE.alarm,
      method: [ALARM_METHOD.sound, ALARM_METHOD.visual],
      message: 'Alarm!'
    }
  };

  constructor(
    path: string,
    msg: string,
    state?: ALARM_STATE,
    method?: ALARM_METHOD[]
  ) {
    this._message.path += path;
    this._message.value.message = msg;
    if (state) {
      this._message.value.state = state;
    }
    if (method) {
      this._message.value.method = method;
    }
  }

  get message(): DeltaNotification {
    return this._message;
  }
}
