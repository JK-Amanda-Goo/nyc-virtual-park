// NYC 1 m topobathymetric LiDAR DEM (2017), served by NY State ITS, for the area around the park.
import { mkdir, writeFile } from 'node:fs/promises';
import { WIDE } from './boundary.mjs';

const lat0 = (WIDE.minLat + WIDE.maxLat) / 2;
const mLat = 111320, mLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
const PX_M = 4; // metres per raster pixel
const w = Math.round(((WIDE.maxLon - WIDE.minLon) * mLon) / PX_M);
// The server keeps pixels square in degrees, so size the height to match or it widens the extent.
const h = Math.round((w * (WIDE.maxLat - WIDE.minLat)) / (WIDE.maxLon - WIDE.minLon));
const url = 'https://elevation.its.ny.gov/arcgis/rest/services/NYC_TopoBathymetric_2017_1_meter/ImageServer/exportImage?' +
  new URLSearchParams({
    bbox: `${WIDE.minLon},${WIDE.minLat},${WIDE.maxLon},${WIDE.maxLat}`, bboxSR: '4326', imageSR: '4326',
    size: `${w},${h}`, format: 'tiff', pixelType: 'F32', interpolation: 'RSP_BilinearInterpolation', f: 'image',
  });
const res = await fetch(url);
if (!res.ok || !res.headers.get('content-type')?.includes('tiff')) throw new Error(`terrain: ${res.status} ${res.headers.get('content-type')}`);
await mkdir(new URL('../raw/', import.meta.url), { recursive: true });
await writeFile(new URL('../raw/dem.tif', import.meta.url), Buffer.from(await res.arrayBuffer()));
console.log(`dem.tif requested ${w}x${h}px (${PX_M} m)`);
