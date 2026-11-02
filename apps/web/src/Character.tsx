import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerState } from './player';
import { theme } from './theme';

type Colors = { skin: string; shirt: string; pants: string };

// Placeholder figure built from boxes. Forward is -Z.
export function Character({ player, colors = theme }: { player: React.RefObject<PlayerState>; colors?: Colors }) {
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null), legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null), armR = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((_, dt) => {
    const p = player.current;
    if (!root.current || !p) return;
    root.current.position.set(p.x, p.y, p.z);
    root.current.rotation.y = p.heading;
    const moving = p.speed > 0.05;
    phase.current += dt * (p.speed > 2.5 ? 12 : 8) * (moving ? 1 : 0);
    const amp = moving ? (p.speed > 2.5 ? 0.9 : 0.55) : 0;
    const swing = Math.sin(phase.current) * amp;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing;
    if (armR.current) armR.current.rotation.x = swing;
  });

  return (
    <group ref={root}>
      <group ref={legL} position={[-0.11, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]}><boxGeometry args={[0.18, 0.8, 0.2]} /><meshLambertMaterial color={colors.pants} /></mesh>
      </group>
      <group ref={legR} position={[0.11, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]}><boxGeometry args={[0.18, 0.8, 0.2]} /><meshLambertMaterial color={colors.pants} /></mesh>
      </group>
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.48, 0.6, 0.26]} /><meshLambertMaterial color={colors.shirt} /></mesh>
      <group ref={armL} position={[-0.31, 1.38, 0]}>
        <mesh position={[0, -0.26, 0]}><boxGeometry args={[0.12, 0.55, 0.14]} /><meshLambertMaterial color={colors.skin} /></mesh>
      </group>
      <group ref={armR} position={[0.31, 1.38, 0]}>
        <mesh position={[0, -0.26, 0]}><boxGeometry args={[0.12, 0.55, 0.14]} /><meshLambertMaterial color={colors.skin} /></mesh>
      </group>
      <mesh position={[0, 1.58, 0]}><boxGeometry args={[0.26, 0.26, 0.26]} /><meshLambertMaterial color={colors.skin} /></mesh>
      {/* Eyes mark the front so the back view is distinguishable. */}
      <mesh position={[-0.06, 1.6, -0.135]}><boxGeometry args={[0.04, 0.04, 0.01]} /><meshBasicMaterial color="#222" /></mesh>
      <mesh position={[0.06, 1.6, -0.135]}><boxGeometry args={[0.04, 0.04, 0.01]} /><meshBasicMaterial color="#222" /></mesh>
    </group>
  );
}
