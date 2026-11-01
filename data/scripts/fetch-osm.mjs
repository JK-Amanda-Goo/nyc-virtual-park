// Downloads raw OSM data for Central Park (geometry included) into data/raw/.
// OSM has no single "Central Park" boundary (it is split into many relations),
// so we use the park's outline: 59th St to 110th St, 5th Ave to Central Park West.
import { mkdir, writeFile } from 'node:fs/promises';
import { BOUNDARY } from './boundary.mjs';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const poly = BOUNDARY.map(([lat, lon]) => `${lat} ${lon}`).join(' ');
// A wider ring (~250 m) used only for skyline buildings.
const EDGE = [[40.7638, -73.9838], [40.7632, -73.9713], [40.7985, -73.9475], [40.8017, -73.9592]];
const edgePoly = EDGE.map(([lat, lon]) => `${lat} ${lon}`).join(' ');
const P = `(poly:"${poly}")`;

const queries = {
  inside: `[out:json][timeout:180];(
    way${P}["highway"];
    way${P}["landuse"~"grass|meadow"];
    way${P}["natural"~"grassland|water|wood|scrub"];
    way${P}["leisure"~"pitch|playground|garden"];
    way${P}["waterway"];
    way${P}["building"];
    rel${P}["natural"="water"];
    node${P}["natural"="tree"];
  );out geom;`,
  edge: `[out:json][timeout:180];way(poly:"${edgePoly}")["building"];out geom;`,
};

await mkdir(new URL('../raw/', import.meta.url), { recursive: true });
for (const [name, q] of Object.entries(queries)) {
  let text;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'User-Agent': 'nyc-virtual-park/0.1', Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(q),
    });
    if (res.ok) { text = await res.text(); break; }
    console.log(`${name}: HTTP ${res.status}, retry ${attempt}`);
    await new Promise((r) => setTimeout(r, 8000 * attempt));
  }
  if (!text) throw new Error(`${name}: failed`);
  await writeFile(new URL(`../raw/${name}.json`, import.meta.url), text);
  console.log(name, (text.length / 1e6).toFixed(1) + ' MB', JSON.parse(text).elements.length, 'elements');
}
