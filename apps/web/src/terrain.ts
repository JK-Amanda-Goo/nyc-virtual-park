import type { TerrainMeta } from './types';

// Ground height grid from the NYC LiDAR DEM (see data/scripts/build-park.mjs).
export class Terrain {
  constructor(readonly meta: TerrainMeta, private readonly cm: Int16Array) {}

  static async load(meta: TerrainMeta) {
    const buf = await (await fetch('/' + meta.file)).arrayBuffer();
    return new Terrain(meta, new Int16Array(buf));
  }

  get minX() { return this.meta.x0; }
  get maxX() { return this.meta.x0 + (this.meta.nx - 1) * this.meta.cell; }
  get minZ() { return this.meta.z0; }
  get maxZ() { return this.meta.z0 + (this.meta.nz - 1) * this.meta.cell; }

  /** Ground height in metres at local (x, z), bilinear. */
  heightAt(x: number, z: number) {
    const { x0, z0, cell, nx, nz } = this.meta;
    const fx = Math.max(0, Math.min(nx - 1.001, (x - x0) / cell));
    const fz = Math.max(0, Math.min(nz - 1.001, (z - z0) / cell));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const g = (a: number, b: number) => this.cm[b * nx + a] / 100;
    return (g(i, j) * (1 - tx) + g(i + 1, j) * tx) * (1 - tz) + (g(i, j + 1) * (1 - tx) + g(i + 1, j + 1) * tx) * tz;
  }
}
