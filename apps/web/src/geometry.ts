import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pt } from './types';

// World axes: x = east, z = south, y = up. A Shape(x, -z) rotated -90deg about X lands on (x, 0, z).
const toShape = (ring: Pt[]) => {
  const pts = ring.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, -z));
  return new THREE.Shape(pts);
};

const merge = (geos: THREE.BufferGeometry[]) => (geos.length ? mergeGeometries(geos, false) : null);

export function flatPolygons(rings: Pt[][], y: number) {
  const geos = rings.filter((r) => r.length > 3).map((r) => {
    const g = new THREE.ShapeGeometry(toShape(r));
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return g;
  });
  return merge(geos);
}

export function extrudedBuildings(items: { h: number; p: Pt[] }[]) {
  const geos = items.filter((b) => b.p.length > 3).map((b) => {
    const g = new THREE.ExtrudeGeometry(toShape(b.p), { depth: b.h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g.index ? g.toNonIndexed() : g;
  });
  return merge(geos);
}

export function ribbons(lines: { p: Pt[] }[], width: (i: number) => number, y: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  lines.forEach((l, li) => {
    const w = width(li) / 2;
    const base = pos.length / 3;
    for (let i = 0; i < l.p.length; i++) {
      const prev = l.p[Math.max(0, i - 1)], next = l.p[Math.min(l.p.length - 1, i + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const [x, z] = l.p[i];
      pos.push(x - dz * w, y, z + dx * w, x + dz * w, y, z - dx * w);
      if (i > 0) { const a = base + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
