import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { ParkData } from './types';
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

function Trees({ points, terrain }: { points: [number, number][]; terrain: Terrain }) {
  const set = (mesh: THREE.InstancedMesh | null, lift: number) => {
    if (!mesh) return;
    const m = new THREE.Matrix4();
    points.forEach(([x, z], i) => { m.setPosition(x, terrain.heightAt(x, z) + lift, z); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh args={[undefined, undefined, points.length]} ref={(m) => set(m, 1.5)}>
        <cylinderGeometry args={[0.25, 0.3, 3]} /><meshLambertMaterial color={theme.trunk} />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, points.length]} ref={(m) => set(m, 6)}>
        <icosahedronGeometry args={[3.2, 0]} /><meshLambertMaterial color={theme.leaf} />
      </instancedMesh>
    </>
  );
}
