// Converts raw data (official boundary, OSM features, LiDAR DEM) into the client's world files:
//   apps/web/public/park.json   features in local metres (x = east, z = south, origin = park centre)
//   apps/web/public/terrain.bin ground height grid, Int16 little-endian, centimetres
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PARTS, BBOX, WIDE } from './boundary.mjs';

const read = async (n) => JSON.parse(await readFile(new URL(`../raw/${n}.json`, import.meta.url))).elements;
const [inside, gates] = [await read('inside'), await read('gates')];

const lat0 = (BBOX.minLat + BBOX.maxLat) / 2;
const lon0 = (BBOX.minLon + BBOX.maxLon) / 2;
const MLAT = 111320;
const MLON = 111320 * Math.cos((lat0 * Math.PI) / 180);
const r1 = (n) => Math.round(n * 10) / 10;
const proj = ({ lat, lon }) => [r1((lon - lon0) * MLON), r1(-(lat - lat0) * MLAT)];
const line = (geom) => geom.map(proj);
const parts = PARTS.map((ring) => ring.map(([lat, lon]) => proj({ lat, lon })));

const inPoly = ([x, z], poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const inPark = (pt) => parts.some((p) => inPoly(pt, p));
const segDist = ([px, pz], [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};
const distToPark = (pt) => {
  if (inPark(pt)) return 0;
  let d = Infinity;
  for (const p of parts) for (let i = 0; i < p.length; i++) d = Math.min(d, segDist(pt, p[i], p[(i + 1) % p.length]));
  return d;
};
const near = (pt, m) => distToPark(pt) <= m;
const closed = (pts) => pts.length > 3 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1];
const heightOf = (t) => (t['building:levels'] ? +t['building:levels'] * 3.2 : t.height ? parseFloat(t.height) : 12) || 12;
// Split a polyline into runs that lie inside (or within 10 m of) the park.
const clipRuns = (pts) => {
  const runs = []; let cur = [];
  for (const p of pts) { if (near(p, 10)) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }
  if (cur.length > 1) runs.push(cur);
  return runs;
};

const world = {
  origin: { lat: lat0, lon: lon0 }, boundary: parts, paths: [], roads: [], grass: [], water: [], woods: [],
  pitches: [], playgrounds: [], gardens: [], buildings: [], skyline: [], trees: [], entrances: [], terrain: null,
};
const SKYLINE_M = 250;
const WALK = ['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track'];

for (const e of inside) {
  const t = e.tags || {};
  if (e.type === 'node') { const p = proj(e); if (inPark(p)) world.trees.push(p); continue; }
  if (e.type === 'relation') {
    for (const m of e.members || []) if (m.role === 'outer' && m.geometry) { const r = line(m.geometry); if (closed(r) && r.some(inPark)) world.water.push(r); }
    continue;
  }
  if (!e.geometry) continue;
  const pts = line(e.geometry);
  if (t.highway) {
    if (t.footway === 'sidewalk' || t.footway === 'crossing' || (t.highway === 'service' && t.service === 'driveway')) continue;
    const kind = WALK.includes(t.highway) ? 'paths' : 'roads';
    for (const run of clipRuns(pts)) world[kind].push({ t: t.highway, b: t.bridge ? 1 : 0, u: t.tunnel ? 1 : 0, p: run });
  } else if (t.building) {
    if (inPark(pts[0])) world.buildings.push({ h: heightOf(t), p: pts });
    else if (near(pts[0], SKYLINE_M)) world.skyline.push({ h: heightOf(t), p: pts });
  } else if (pts.some(inPark)) {
    if (t.natural === 'water') closed(pts) && world.water.push(pts);
    else if (t.natural === 'wood' || t.natural === 'scrub') world.woods.push(pts);
    else if (t.landuse || t.natural === 'grassland') world.grass.push(pts);
    else if (t.leisure === 'pitch') world.pitches.push(pts);
    else if (t.leisure === 'playground') world.playgrounds.push(pts);
    else if (t.leisure === 'garden') world.gardens.push(pts);
  }
}

// Entrances: only gates that OSM names. Unverified until checked against the Conservancy map.
world.entrances = gates.map((g, i) => {
  const [x, z] = proj(g);
  return { id: `g${i}`, name: g.tags.name, x, z, src: 'osm', verified: false };
});

// Terrain: resample the lat/lon raster onto a regular local-metre grid.
const tif = await readFile(new URL('../raw/dem.tif', import.meta.url));
const dv = new DataView(tif.buffer, tif.byteOffset, tif.byteLength);
if (dv.getUint16(0, true) !== 0x4949) throw new Error('expected little-endian TIFF');
const ifd = dv.getUint32(4, true), n = dv.getUint16(ifd, true), tag = {};
const typeSize = { 3: 2, 4: 4, 12: 8 };
for (let i = 0; i < n; i++) {
  const o = ifd + 2 + i * 12, id = dv.getUint16(o, true), type = dv.getUint16(o + 2, true), count = dv.getUint32(o + 4, true);
  const size = (typeSize[type] ?? 1) * count, at = size <= 4 ? o + 8 : dv.getUint32(o + 8, true);
  const get = (k) => (type === 3 ? dv.getUint16(at + k * 2, true) : dv.getUint32(at + k * 4, true));
  tag[id] = type === 12 ? [at] : Array.from({ length: count }, (_, k) => get(k)); // doubles: keep the offset
}
const [W, H] = [tag[256][0], tag[257][0]];
if (tag[259][0] !== 1 || tag[258][0] !== 32 || tag[339]?.[0] !== 3 || (tag[317]?.[0] ?? 1) !== 1) throw new Error('unsupported TIFF layout');
const px = new Float32Array(W * H);
// The server writes 128x128 tiles (tags 322-325); edge tiles are padded to full size.
const [TW, TH] = [tag[322][0], tag[323][0]], across = Math.ceil(W / TW);
if (!tag[324] || tag[324].length !== across * Math.ceil(H / TH)) throw new Error('unexpected tile count');
tag[324].forEach((off, t) => {
  const ox = (t % across) * TW, oy = Math.floor(t / across) * TH;
  for (let y = 0; y < TH && oy + y < H; y++) for (let x = 0; x < TW && ox + x < W; x++) px[(oy + y) * W + ox + x] = dv.getFloat32(off + (y * TW + x) * 4, true);
});
const valid = (v) => Number.isFinite(v) && v > -100 && v < 500;

// Georeferencing comes from the GeoTIFF tags (pixel scale 33550, tie point 33922), not from what we requested.
const f64 = (o, c) => Array.from({ length: c }, (_, i) => dv.getFloat64(o + i * 8, true));
const [sx, sy] = f64(tag[33550][0], 3), [, , , tieLon, tieLat] = f64(tag[33922][0], 6);
if (Math.abs(tieLon - WIDE.minLon) > 1e-6 || Math.abs(tieLat - WIDE.maxLat) > 1e-4) throw new Error(`DEM extent differs from request: ${tieLon},${tieLat}`);
const sample = (lat, lon) => {
  const fx = (lon - tieLon) / sx - 0.5;
  const fy = (tieLat - lat) / sy - 0.5;
  const x0 = Math.max(0, Math.min(W - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(H - 2, Math.floor(fy)));
  const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
  const a = px[y0 * W + x0], b = px[y0 * W + x0 + 1], c = px[(y0 + 1) * W + x0], d = px[(y0 + 1) * W + x0 + 1];
  if (![a, b, c, d].every(valid)) return null;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
};
const CELL = 8;
const x0 = Math.floor(((WIDE.minLon - lon0) * MLON) / CELL) * CELL, x1 = Math.ceil(((WIDE.maxLon - lon0) * MLON) / CELL) * CELL;
const z0 = Math.floor((-(WIDE.maxLat - lat0) * MLAT) / CELL) * CELL, z1 = Math.ceil((-(WIDE.minLat - lat0) * MLAT) / CELL) * CELL;
const nx = (x1 - x0) / CELL + 1, nz = (z1 - z0) / CELL + 1;
const grid = new Int16Array(nx * nz);
let missing = 0, last = 0;
for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
  const x = x0 + i * CELL, z = z0 + j * CELL;
  const v = sample(lat0 - z / MLAT, lon0 + x / MLON);
  if (v === null) { missing++; grid[j * nx + i] = last; } else grid[j * nx + i] = last = Math.round(v * 100);
}
world.terrain = { x0, z0, cell: CELL, nx, nz, file: 'terrain.bin' };
const hAt = (lat, lon) => (sample(lat, lon) ?? NaN).toFixed(1);
console.log('terrain grid', nx, 'x', nz, `(${CELL} m), missing ${missing}`);
console.log('check m: Belvedere', hAt(40.7794, -73.9692), 'Pond', hAt(40.7653, -73.9742), 'Reservoir', hAt(40.7835, -73.964), 'Harlem Meer', hAt(40.796, -73.9543), 'Great Hill', hAt(40.7983, -73.9645));

const dir = new URL('../../apps/web/public/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('terrain.bin', dir), Buffer.from(grid.buffer));
await writeFile(new URL('park.json', dir), JSON.stringify(world));
console.log('park.json', (JSON.stringify(world).length / 1e6).toFixed(2), 'MB; terrain.bin', (grid.byteLength / 1e6).toFixed(2), 'MB');
for (const [key, v] of Object.entries(world)) if (Array.isArray(v)) console.log(key.padEnd(12), v.length);
console.log(world.entrances.map((e) => e.name).join(', '));
