// Official Central Park boundary: NYC Parks "Parks Properties" (Socrata enfh-gkve), property M010.
import { mkdir, writeFile } from 'node:fs/promises';

const url = 'https://data.cityofnewyork.us/resource/enfh-gkve.json?' +
  new URLSearchParams({ $where: "gispropnum='M010' AND retired=false", $select: 'signname,acres,gispropnum,multipolygon' });
const res = await fetch(url);
if (!res.ok) throw new Error(`boundary: HTTP ${res.status}`);
const rows = await res.json();
if (rows.length !== 1) throw new Error(`expected 1 row for M010, got ${rows.length}`);
await mkdir(new URL('../raw/', import.meta.url), { recursive: true });
await writeFile(new URL('../raw/boundary.json', import.meta.url), JSON.stringify(rows[0]));
const mp = rows[0].multipolygon;
console.log(rows[0].signname, rows[0].acres, 'acres;', mp.type, 'parts:', mp.coordinates.length,
  'rings per part:', mp.coordinates.map((p) => p.length).join(','), 'vertices:', mp.coordinates.flat(2).length);
