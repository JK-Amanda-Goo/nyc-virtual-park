// Places each Conservancy gate where its two named streets meet, snapped to the official park boundary.
// Prints a table; build-park.mjs uses the same logic. Run after fetch-osm.mjs.
import { readFile } from 'node:fs/promises';
import { PARTS } from './boundary.mjs';
import { GATES } from './gates.mjs';

const MLAT = 111320;
export function locateGates(elements, osmGates) {
  const MLON = 111320 * Math.cos((40.78 * Math.PI) / 180);
  const ways = (name) => elements.filter((e) => e.type === 'way' && e.geometry && e.tags?.name === name);
  const key = (p) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
  const xy = (p) => [p.lon * MLON, p.lat * MLAT];
  const snap = (p) => { // nearest point on the official boundary, as {lat, lon, d}
    let best = { d: Infinity };
    const [px, py] = xy(p);
    for (const ring of PARTS) for (let i = 0; i < ring.length; i++) {
      const a = { lat: ring[i][0], lon: ring[i][1] }, b = { lat: ring[(i + 1) % ring.length][0], lon: ring[(i + 1) % ring.length][1] };
      const [ax, ay] = xy(a), [bx, by] = xy(b), dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d < best.d) best = { d, lat: a.lat + t * (b.lat - a.lat), lon: a.lon + t * (b.lon - a.lon) };
    }
    return best;
  };
  return GATES.map((g) => {
    const out = { ...g, status: 'not located' };
    if (!g.main) return out;
    const mainPts = new Map(ways(g.main).flatMap((w) => w.geometry.map((p) => [key(p), p])));
    const hits = ways(g.cross).flatMap((w) => w.geometry).filter((p) => mainPts.has(key(p)));
    let junction = hits[0], how = 'shared node';
    if (!junction) { // streets that do not share a node: closest pair within 25 m
      let best = { d: 25 };
      for (const m of mainPts.values()) for (const p of ways(g.cross).flatMap((w) => w.geometry)) {
        const d = Math.hypot((m.lon - p.lon) * MLON, (m.lat - p.lat) * MLAT);
        if (d < best.d) best = { d, p };
      }
      junction = best.p; how = 'closest pair <25 m';
    }
    if (!junction) return { ...out, status: 'no junction found' };
    const s = snap(junction);
    const osm = osmGates?.find((o) => o.name.replace(/[’']/g, '').replace(/s? Gate$/, '').toLowerCase() === g.name.replace(/[’']/g, '').replace(/s? Gate$/, '').toLowerCase());
    const dOsm = osm ? Math.hypot((osm.lon - s.lon) * MLON, (osm.lat - s.lat) * MLAT) : null;
    return { ...out, lat: s.lat, lon: s.lon, junction, junctionHow: how, snapMetres: s.d, osmDistance: dOsm, status: 'derived' };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const read = async (n) => JSON.parse(await readFile(new URL(`../raw/${n}.json`, import.meta.url))).elements;
  const res = locateGates(await read('inside'), (await read('gates')).map((g) => ({ name: g.tags.name, lat: g.lat, lon: g.lon })));
  for (const r of res) console.log(r.name.padEnd(24), r.status.padEnd(14), r.lat ? `${r.lat.toFixed(5)},${r.lon.toFixed(5)}` : ''.padEnd(17), r.junctionHow ?? '', r.snapMetres != null ? `snap ${r.snapMetres.toFixed(0)}m` : '', r.osmDistance != null ? `vs OSM gate ${r.osmDistance.toFixed(0)}m` : '', r.note ?? '');
}
