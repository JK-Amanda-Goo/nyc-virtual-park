// Downloads raw OSM data (with geometry) for the area around the official boundary into data/raw/.
import { mkdir, writeFile } from 'node:fs/promises';
import { WIDE } from './boundary.mjs';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const B = `(${WIDE.minLat},${WIDE.minLon},${WIDE.maxLat},${WIDE.maxLon})`;
const GATE_NAMES = ["Mariner's Gate", 'Gate of All Saints', 'Pioneers Gate', 'Farmers Gate', "Engineers' Gate", "Girls' Gate", "Boys' Gate", "Women's Gate", "Children's Gate", "Strangers' Gate", "Artists' Gate", "Artisans' Gate", "Merchants' Gate", "Scholars' Gate", 'Warriors Gate', "Warriors' Gate", 'Hunters Gate', "Hunters' Gate", 'Woodmans Gate', "Woodman's Gate", 'Miners Gate', "Miners' Gate", 'Inventors Gate', "Inventors' Gate", 'Cultivators Gate', "Cultivators' Gate", "Explorers' Gate"];

const queries = {
  inside: `[out:json][timeout:180];(
    way${B}["highway"~"footway|path|pedestrian|steps|cycleway|track|service|residential|tertiary|secondary|primary|unclassified|living_street"];
    way${B}["landuse"~"grass|meadow"];
    way${B}["natural"~"grassland|water|wood|scrub"];
    way${B}["leisure"~"pitch|playground|garden"];
    way${B}["building"];
    rel${B}["natural"="water"];
    node${B}["natural"="tree"];
  );out geom;`,
  gates: `[out:json][timeout:60];node${B}[name~"^(${GATE_NAMES.map((n) => n.replace(/[()]/g, '')).join('|')})$"];out;`,
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
