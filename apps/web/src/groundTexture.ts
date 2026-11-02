import * as THREE from 'three';
import type { ParkData, Pt } from './types';
import type { Terrain } from './terrain';
import { theme } from './theme';

const PX_PER_M = 0.5; // 2 m per texel

/** Land-use colours painted top-down, then draped over the terrain mesh. */
export function groundTexture(d: ParkData, t: Terrain, maxAniso: number) {
  const w = Math.round((t.maxX - t.minX) * PX_PER_M), h = Math.round((t.maxZ - t.minZ) * PX_PER_M);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = theme.city;
  g.fillRect(0, 0, w, h);
  const fill = (rings: Pt[][], color: string) => {
    g.fillStyle = color;
    for (const r of rings) {
      g.beginPath();
      r.forEach(([x, z], i) => { const px = (x - t.minX) * PX_PER_M, pz = (z - t.minZ) * PX_PER_M; i ? g.lineTo(px, pz) : g.moveTo(px, pz); });
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
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false; // canvas row 0 is the north edge, matching uv v = 0
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}
