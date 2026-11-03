// NYC Parks "Forestry Tree Points" (Socrata hn5i-inap) around the park, kept as raw data in data/raw/trees.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { WIDE } from './boundary.mjs';

const box = `${WIDE.minLat},${WIDE.minLon},${WIDE.maxLat},${WIDE.maxLon}`;
const url = 'https://data.cityofnewyork.us/resource/hn5i-inap.json?' + new URLSearchParams({
  $select: 'objectid,dbh,genusspecies,tpstructure,tpcondition,location',
  $where: `within_box(location,${box}) AND tpstructure != 'Stump' AND tpstructure != 'Retired'`, $limit: '100000',
});
const res = await fetch(url);
if (!res.ok) throw new Error(`trees: HTTP ${res.status} ${await res.text()}`);
const rows = await res.json();
await mkdir(new URL('../raw/', import.meta.url), { recursive: true });
await writeFile(new URL('../raw/trees.json', import.meta.url), JSON.stringify(rows));
console.log('tree points', rows.length);
