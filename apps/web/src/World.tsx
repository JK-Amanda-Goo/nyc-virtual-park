import { useMemo } from 'react';
import * as THREE from 'three';
import type { ParkData } from './types';
import { extrudedBuildings, flatPolygons, ribbons } from './geometry';
import { theme } from './theme';

const PATH_WIDTH: Record<string, number> = { footway: 2.5, path: 2, pedestrian: 5, steps: 2, cycleway: 2.5, track: 3 };

export function World({ data }: { data: ParkData }) {
  const g = useMemo(() => ({
    park: flatPolygons([data.boundary.concat([data.boundary[0]])], 0.02),
    grass: flatPolygons(data.grass, 0.04),
    woods: flatPolygons(data.woods, 0.06),
    water: flatPolygons(data.water, 0.08),
    pitches: flatPolygons(data.pitches, 0.1),
    playgrounds: flatPolygons(data.playgrounds, 0.1),
    gardens: flatPolygons(data.gardens, 0.1),
    paths: ribbons(data.paths, (i) => PATH_WIDTH[data.paths[i].t] ?? 2.5, 0.14),
    roads: ribbons(data.roads, () => 7, 0.12),
    buildings: extrudedBuildings(data.buildings),
    skyline: extrudedBuildings(data.skyline),
  }), [data]);

  const trees = useMemo(() => {
    const m = new THREE.Matrix4();
    return data.trees.map(([x, z]) => m.clone().setPosition(x, 0, z));
  }, [data]);

  const Layer = ({ geo, color }: { geo: THREE.BufferGeometry | null; color: string }) =>
    geo ? <mesh geometry={geo}><meshLambertMaterial color={color} side={THREE.DoubleSide} /></mesh> : null;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[20000, 20000]} /><meshLambertMaterial color={theme.city} /></mesh>
      <Layer geo={g.park} color={theme.park} />
      <Layer geo={g.grass} color={theme.grass} />
      <Layer geo={g.woods} color={theme.wood} />
      <Layer geo={g.water} color={theme.water} />
      <Layer geo={g.pitches} color={theme.pitch} />
      <Layer geo={g.playgrounds} color={theme.playground} />
      <Layer geo={g.gardens} color={theme.garden} />
      <Layer geo={g.roads} color={theme.road} />
      <Layer geo={g.paths} color={theme.path} />
      <Layer geo={g.buildings} color={theme.building} />
      <Layer geo={g.skyline} color={theme.skyline} />
      <Trees matrices={trees} />
    </group>
  );
}

function Trees({ matrices }: { matrices: THREE.Matrix4[] }) {
  const set = (mesh: THREE.InstancedMesh | null, lift: number) => {
    if (!mesh) return;
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    matrices.forEach((src, i) => { p.setFromMatrixPosition(src); m.setPosition(p.x, lift, p.z); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh args={[undefined, undefined, matrices.length]} ref={(m) => set(m, 1.5)}>
        <cylinderGeometry args={[0.25, 0.3, 3]} /><meshLambertMaterial color={theme.trunk} />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, matrices.length]} ref={(m) => set(m, 6)}>
        <icosahedronGeometry args={[3.2, 0]} /><meshLambertMaterial color={theme.leaf} />
      </instancedMesh>
    </>
  );
}
