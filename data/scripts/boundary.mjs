// Official boundary (NYC Parks M010), as parts of [lat, lon] rings. Run fetch-boundary.mjs first.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../raw/boundary.json', import.meta.url)));
export const PARTS = raw.multipolygon.coordinates.map((poly) => poly[0].slice(0, -1).map(([lon, lat]) => [lat, lon]));
const all = PARTS.flat();
export const BBOX = {
  minLat: Math.min(...all.map((p) => p[0])), maxLat: Math.max(...all.map((p) => p[0])),
  minLon: Math.min(...all.map((p) => p[1])), maxLon: Math.max(...all.map((p) => p[1])),
};
// Margin around the park for skyline buildings and the terrain grid (about 300 m).
export const MARGIN_DEG = 0.003;
export const WIDE = {
  minLat: BBOX.minLat - MARGIN_DEG, maxLat: BBOX.maxLat + MARGIN_DEG,
  minLon: BBOX.minLon - MARGIN_DEG, maxLon: BBOX.maxLon + MARGIN_DEG,
};
