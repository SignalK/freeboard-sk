// ** Resource Types **
export * from './resources/signalk';
export * from './resources/custom';
export * from './resources/geojson';
export * from './resources/freeboard';
export * from './stream';

export interface SKApiResponse {
  state: 'FAILED' | 'COMPLETED' | 'PENDING';
  statusCode: number;
  message: string;
  requestId?: string;
  href?: string;
  token?: string;
}
