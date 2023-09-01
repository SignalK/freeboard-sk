import {
  SKRoute,
  SKWaypoint,
  SKNote,
  SKChart
} from 'src/app/modules/skresources/resource-classes';

export type FBRoutes = Array<FBRoute>;
export type FBRoute = [string, SKRoute, boolean?];

export type FBWaypoints = Array<FBWaypoint>;
export type FBWaypoint = [string, SKWaypoint, boolean?];

export type FBNotes = Array<FBNote>;
export type FBNote = [string, SKNote, boolean?];

export type FBCharts = Array<FBChart>;
export type FBChart = [string, SKChart, boolean?];

export type FBResourceSelect = {
  id: string;
  value?: boolean;
  type?: string;
  isGroup?: boolean;
};
