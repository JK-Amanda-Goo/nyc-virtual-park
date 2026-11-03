import * as THREE from 'three';
import type { ParkData, Pt } from './types';
import type { Terrain } from './terrain';
import { theme } from './theme';

const PX_PER_M = 0.5; // 2 m per texel

/** Land-use colours painted top-down on a canvas whose row 0 is the north edge. */
export function paintGround(d: ParkData, t: Terrain, pxPerM: number) {
  const w = Math.round((t.maxX - t.minX) * pxPerM), h = Math.round((t.maxZ - t.minZ) * pxPerM);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = theme.city;
  g.fillRect(0, 0, w, h);
  const fill = (rings: Pt[][], color: string) => {
    g.fillStyle = color;
    for (const r of rings) {
      g.beginPath();
      r.forEach(([x, z], i) => { const px = (x - t.minX) * pxPerM, pz = (z - t.minZ) * pxPerM; i ? g.lineTo(px, pz) : g.moveTo(px, pz); });
      g.closePath();
      g.fill();
    }
  };
  fill(d.boundary, theme.park);
  fill(d.grass, theme.grass);
  fill(d.woods, theme.wood);
  fill(d.gardens, theme.garden);
  fill(d.pitches, theme.pitch);
  fill(d.playgrounds, theme.playground);
  fill(d.water, theme.water);
  return c;
}

/** Land-use colours painted top-down, then draped over the terrain mesh. */
export function groundTexture(d: ParkData, t: Terrain, maxAniso: number) {
  const tex = new THREE.CanvasTexture(paintGround(d, t, PX_PER_M));
  tex.flipY = false; // canvas row 0 is the north edge, matching uv v = 0
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}
