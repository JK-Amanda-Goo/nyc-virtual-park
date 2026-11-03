// NYC Building Footprints (Socrata 5zhs-2jue) around the park: polygon, roof height (ft) and year built.
import { mkdir, writeFile } from 'node:fs/promises';
import { WIDE } from './boundary.mjs';

const box = `${WIDE.minLat},${WIDE.minLon},${WIDE.maxLat},${WIDE.maxLon}`;
const url = 'https://data.cityofnewyork.us/resource/5zhs-2jue.json?' + new URLSearchParams({
  $select: 'bin,height_roof,ground_elevation,construction_year,feature_code,the_geom',
  $where: `within_box(the_geom,${box})`, $limit: '50000',
});
const res = await fetch(url);
if (!res.ok) throw new Error(`footprints: HTTP ${res.status} ${await res.text()}`);
const rows = await res.json();
await mkdir(new URL('../raw/', import.meta.url), { recursive: true });
await writeFile(new URL('../raw/footprints.json', import.meta.url), JSON.stringify(rows));
const withH = rows.filter((r) => r.height_roof && +r.height_roof > 0);
console.log('footprints', rows.length, 'with roof height', withH.length, 'max ft', Math.max(...withH.map((r) => +r.height_roof)));
console.log('feature codes', Object.entries(rows.reduce((a, r) => ((a[r.feature_code] = (a[r.feature_code] || 0) + 1), a), {})).join(' '));
