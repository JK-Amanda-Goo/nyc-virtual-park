import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { ParkData, Tree } from './types';
import type { Terrain } from './terrain';
import { extrudedBuildings, ribbons, terrainMesh } from './geometry';
import { groundTexture } from './groundTexture';
import { theme } from './theme';

const PATH_WIDTH: Record<string, number> = { footway: 2.5, path: 2, pedestrian: 5, steps: 2, cycleway: 2.5, track: 3 };

export function World({ data, terrain }: { data: ParkData; terrain: Terrain }) {
  const gl = useThree((s) => s.gl);
  const g = useMemo(() => ({
    ground: terrainMesh(terrain),
    tex: groundTexture(data, terrain, gl.capabilities.getMaxAnisotropy()),
    paths: ribbons(data.paths, (i) => PATH_WIDTH[data.paths[i].t] ?? 2.5, 0.12, terrain),
    roads: ribbons(data.roads, () => 7, 0.08, terrain),
    buildings: extrudedBuildings(data.buildings, terrain),
    skyline: extrudedBuildings(data.skyline, terrain),
  }), [data, terrain, gl]);

  const Layer = ({ geo, color, offset = 0 }: { geo: THREE.BufferGeometry | null; color: string; offset?: number }) =>
    geo ? <mesh geometry={geo}><meshLambertMaterial color={color} side={THREE.DoubleSide} polygonOffset={offset > 0} polygonOffsetFactor={-offset} polygonOffsetUnits={-offset} /></mesh> : null;

  return (
    <group>
      <mesh geometry={g.ground}><meshLambertMaterial map={g.tex} /></mesh>
      <Layer geo={g.roads} color={theme.road} offset={1} />
      <Layer geo={g.paths} color={theme.path} offset={2} />
      <Layer geo={g.buildings} color={theme.building} />
      <Layer geo={g.skyline} color={theme.skyline} />
      <Trees points={data.trees} terrain={terrain} />
    </group>
  );
}

// Trunk diameter (inches) is the only size we have. Height and crown radius below are a rough rule of thumb from it,
// not measurements. Unknown sizes (OSM trees) are drawn as a typical 14 in tree.
const DEFAULT_DBH = 14;
const sizeOf = (dbh: number) => {
  const d = dbh > 0 ? dbh : DEFAULT_DBH;
  return { height: Math.min(22, Math.max(6, 5 + d * 0.45)), crown: Math.min(8, Math.max(2, 1.8 + d * 0.13)) };
};

function Trees({ points, terrain }: { points: Tree[]; terrain: Terrain }) {
  const place = (mesh: THREE.InstancedMesh | null, part: 'trunk' | 'crown') => {
    if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    points.forEach(([x, z, dbh], i) => {
      const { height, crown } = sizeOf(dbh), ground = terrain.heightAt(x, z), trunk = height * 0.5;
      if (part === 'trunk') { p.set(x, ground + trunk / 2, z); sc.set(Math.max(0.6, crown / 5), trunk / 3, Math.max(0.6, crown / 5)); }
      else { p.set(x, ground + trunk + crown * 0.6, z); sc.setScalar(crown / 3.2); }
      mesh.setMatrixAt(i, m.compose(p, q, sc));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh args={[undefined, undefined, points.length]} ref={(m) => place(m, 'trunk')}>
        <cylinderGeometry args={[0.25, 0.3, 3]} /><meshLambertMaterial color={theme.trunk} />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, points.length]} ref={(m) => place(m, 'crown')}>
        <icosahedronGeometry args={[3.2, 0]} /><meshLambertMaterial color={theme.leaf} />
      </instancedMesh>
    </>
  );
}
