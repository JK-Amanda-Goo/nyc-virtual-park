import type { ParkData } from './types';

/** Unit vector along the park's long axis, pointing north-ish (x east, z south). Principal component of the largest boundary part. */
export function parkAxis(data: ParkData) {
  const ring = data.boundary.reduce((m, r) => (r.length > m.length ? r : m));
  const mx = ring.reduce((a, p) => a + p[0], 0) / ring.length, mz = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  let cxx = 0, czz = 0, cxz = 0;
  for (const [x, z] of ring) { cxx += (x - mx) ** 2; czz += (z - mz) ** 2; cxz += (x - mx) * (z - mz); }
  const theta = 0.5 * Math.atan2(2 * cxz, cxx - czz);
  let x = Math.cos(theta), z = Math.sin(theta);
  if (z > 0) { x = -x; z = -z; }
  return { x, z, ring };
}
