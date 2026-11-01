export type Pt = [number, number];
export type Way = { t: string; b: number; u: number; p: Pt[] };
export type Building = { h: number; p: Pt[] };
export type Entrance = { id: string; x: number; z: number; n: number };
export type ParkData = {
  boundary: Pt[]; paths: Way[]; roads: Way[]; grass: Pt[][]; water: Pt[][]; woods: Pt[][];
  pitches: Pt[][]; playgrounds: Pt[][]; gardens: Pt[][]; buildings: Building[]; skyline: Building[];
  trees: Pt[]; entrances: Entrance[];
};
