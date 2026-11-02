import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pt } from './types';
import type { Terrain } from './terrain';

// World axes: x = east, z = south, y = up. A Shape(x, -z) rotated -90deg about X lands on (x, 0, z).
const toShape = (ring: Pt[]) => new THREE.Shape(ring.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, -z)));

export function terrainMesh(t: Terrain) {
  const { nx, nz, cell, x0, z0 } = t.meta;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cell, z = z0 + j * cell, k = j * nx + i;
    pos.set([x, t.heightAt(x, z), z], k * 3);
    uv.set([i / (nx - 1), j / (nz - 1)], k * 2);
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let n = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.set([a, c, b, b, c, d], n); n += 6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

/** Buildings stand on the terrain: the base follows the lowest footprint point. */
export function extrudedBuildings(items: { h: number; p: Pt[] }[], t: Terrain) {
  const geos = items.filter((b) => b.p.length > 3).map((b) => {
    const hs = b.p.map(([x, z]) => t.heightAt(x, z));
    const lo = Math.min(...hs), hi = Math.max(...hs);
    const g = new THREE.ExtrudeGeometry(toShape(b.p), { depth: b.h + (hi - lo) + 1, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, lo - 1, 0);
    return g.index ? g.toNonIndexed() : g;
  });
  return geos.length ? mergeGeometries(geos, false) : null;
}

/** Flat ribbons draped on the terrain (polylines are densified so they follow the slope). */
export function ribbons(lines: { p: Pt[] }[], width: (i: number) => number, lift: number, t: Terrain) {
  const pos: number[] = [], idx: number[] = [];
  lines.forEach((l, li) => {
    const w = width(li) / 2, pts: Pt[] = [l.p[0]];
    for (let i = 1; i < l.p.length; i++) {
      const [ax, az] = l.p[i - 1], [bx, bz] = l.p[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
      for (let s = 1; s <= steps; s++) pts.push([ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps]);
    }
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const [x, z] = pts[i];
      const lx = x - dz * w, lz = z + dx * w, rx = x + dz * w, rz = z - dx * w;
      pos.push(lx, t.heightAt(lx, lz) + lift, lz, rx, t.heightAt(rx, rz) + lift, rz);
      if (i > 0) { const a = base + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
