export type Pt = [number, number];
export type Way = { t: string; b: number; u: number; p: Pt[] };
export type Building = { h: number; p: Pt[] };
// verified = checked against an independent source (Conservancy map or imagery). OSM-only gates start unverified.
export type Entrance = { id: string; name: string; x: number; z: number; src: string; verified: boolean };
export type TerrainMeta = { x0: number; z0: number; cell: number; nx: number; nz: number; file: string };
export type ParkData = {
  boundary: Pt[][]; paths: Way[]; roads: Way[]; grass: Pt[][]; water: Pt[][]; woods: Pt[][];
  pitches: Pt[][]; playgrounds: Pt[][]; gardens: Pt[][]; buildings: Building[]; skyline: Building[];
  trees: Pt[]; entrances: Entrance[]; terrain: TerrainMeta;
};
