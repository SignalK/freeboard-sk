
// ** Default Configuration**
export const DefaultRadarConfig: IRadarConfig = {};

export interface IRadarConfig {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

// clean loaded radar config
export function cleanConfig(settings: IRadarConfig) {
    // parse and clean persisted radar configuration
}

