import {
  SKRoute,
  SKWaypoint,
  SKNote,
  SKChart,
  SKRegion,
  SKTrack,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';

export type FBRoutes = Array<FBRoute>;
export type FBRoute = [string, SKRoute, boolean?];

export type FBWaypoints = Array<FBWaypoint>;
export type FBWaypoint = [string, SKWaypoint, boolean?];

export type FBNotes = Array<FBNote>;
export type FBNote = [string, SKNote, boolean?];

export type FBRegions = Array<FBRegion>;
export type FBRegion = [string, SKRegion, boolean?];

export type FBCharts = Array<FBChart>;
export type FBChart = [string, SKChart, boolean?];

export type FBTracks = Array<FBTrack>;
export type FBTrack = [string, SKTrack, boolean?];

export type FBVessels = Array<FBVessel>;
export type FBVessel = [string, SKVessel, boolean?];

export type FBResource =
  | FBRoute
  | FBWaypoint
  | FBNote
  | FBRegion
  | FBChart
  | FBTrack;

export type FBResourceSelect = {
  id: string;
  value?: boolean;
  type?: string;
  isGroup?: boolean;
};
