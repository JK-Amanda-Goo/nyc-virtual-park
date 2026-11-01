// Converts raw OSM JSON into one compact world file for the client.
// Coordinates become local metres: x = east, z = south, origin = park centre.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { BOUNDARY } from './boundary.mjs';

const read = async (n) => JSON.parse(await readFile(new URL(`../raw/${n}.json`, import.meta.url))).elements;
const [inside, edge] = [await read('inside'), await read('edge')];

const lat0 = BOUNDARY.reduce((s, p) => s + p[0], 0) / BOUNDARY.length;
const lon0 = BOUNDARY.reduce((s, p) => s + p[1], 0) / BOUNDARY.length;
const MLAT = 111320;
const MLON = 111320 * Math.cos((lat0 * Math.PI) / 180);
const r1 = (n) => Math.round(n * 10) / 10;
const proj = ({ lat, lon }) => [r1((lon - lon0) * MLON), r1(-(lat - lat0) * MLAT)];
const line = (geom) => geom.map(proj);
const boundary = BOUNDARY.map(([lat, lon]) => proj({ lat, lon }));

const inPoly = ([x, z], poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const closed = (pts) => pts.length > 3 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1];
const heightOf = (t) => (t['building:levels'] ? +t['building:levels'] * 3.2 : t.height ? parseFloat(t.height) : 12) || 12;

const world = { origin: { lat: lat0, lon: lon0 }, boundary, paths: [], roads: [], grass: [], water: [], woods: [], pitches: [], playgrounds: [], gardens: [], buildings: [], skyline: [], trees: [], entrances: [] };
const crossings = [];

for (const e of inside) {
  const t = e.tags || {};
  if (e.type === 'node') { world.trees.push(proj(e)); continue; }
  if (e.type === 'relation') {
    for (const m of e.members || []) if (m.role === 'outer' && m.geometry) { const r = line(m.geometry); if (closed(r)) world.water.push(r); }
    continue;
  }
  if (!e.geometry) continue;
  const pts = line(e.geometry);
  if (t.highway) {
    const kind = ['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track'].includes(t.highway) ? 'paths' : 'roads';
    if (t.footway === 'sidewalk' || t.footway === 'crossing' || t.highway === 'service' && t.service === 'driveway') continue;
    world[kind].push({ t: t.highway, b: t.bridge ? 1 : 0, u: t.tunnel ? 1 : 0, p: pts });
    for (let i = 1; i < pts.length; i++) {
      const a = inPoly(pts[i - 1], boundary), b = inPoly(pts[i], boundary);
      if (a !== b) crossings.push(a ? pts[i - 1] : pts[i]);
    }
  } else if (t.building) world.buildings.push({ h: heightOf(t), p: pts });
  else if (t.natural === 'water' || t.waterway) closed(pts) && t.natural === 'water' ? world.water.push(pts) : 0;
  else if (t.natural === 'wood' || t.natural === 'scrub') world.woods.push(pts);
  else if (t.landuse || t.natural === 'grassland') world.grass.push(pts);
  else if (t.leisure === 'pitch') world.pitches.push(pts);
  else if (t.leisure === 'playground') world.playgrounds.push(pts);
  else if (t.leisure === 'garden') world.gardens.push(pts);
}
for (const e of edge) if (e.geometry) world.skyline.push({ h: heightOf(e.tags || {}), p: line(e.geometry) });

// Entrance candidates: where walkways/roads cross the outline, merged within 30 m.
for (const [x, z] of crossings) {
  const hit = world.entrances.find((c) => Math.hypot(c.x - x, c.z - z) < 30);
  if (hit) { hit.x = r1((hit.x * hit.n + x) / (hit.n + 1)); hit.z = r1((hit.z * hit.n + z) / (hit.n + 1)); hit.n++; }
  else world.entrances.push({ x, z, n: 1 });
}
world.entrances.forEach((c, i) => { c.id = `e${i}`; });

await mkdir(new URL('../../apps/web/public/', import.meta.url), { recursive: true });
const out = new URL('../../apps/web/public/park.json', import.meta.url);
await writeFile(out, JSON.stringify(world));
const size = (JSON.stringify(world).length / 1e6).toFixed(2);
console.log(`park.json ${size} MB`);
for (const [k, v] of Object.entries(world)) if (Array.isArray(v)) console.log(k.padEnd(12), v.length);
