import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { PlayerState } from './player';
import { theme } from './theme';

type Colors = { skin: string; shirt: string; pants: string };

const SIT_DROP = 0.62; // hips go from 0.8 m to about 0.18 m above the ground
const LIE_LIFT = 0.14; // half the torso depth, so the back rests on the ground
const BLEND_RATE = 6; // pose transitions per second

// Placeholder figure built from boxes. Forward is -Z.
export function Character({ player, colors = theme, nickname }: { player: React.RefObject<PlayerState>; colors?: Colors; nickname?: string }) {
  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null), legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null), armR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const blend = useRef({ sit: 0, lie: 0 });

  useFrame((_, dt) => {
    const p = player.current;
    if (!root.current || !rig.current || !p) return;
    root.current.position.set(p.x, p.y, p.z);
    root.current.rotation.y = p.heading;

    const b = blend.current, k = Math.min(1, dt * BLEND_RATE);
    b.sit += ((p.pose === 'sit' ? 1 : 0) - b.sit) * k;
    b.lie += ((p.pose === 'lie' ? 1 : 0) - b.lie) * k;
    const still = (1 - b.sit) * (1 - b.lie); // 1 when standing

    const moving = p.speed > 0.05 && still > 0.5;
    phase.current += dt * (p.speed > 2.5 ? 12 : 8) * (moving ? 1 : 0);
    const swing = Math.sin(phase.current) * (moving ? (p.speed > 2.5 ? 0.9 : 0.55) : 0);

    // Sitting lowers the whole figure; lying on the back tips it over (head toward the camera side, face up).
    rig.current.position.y = -SIT_DROP * b.sit * (1 - b.lie) + LIE_LIFT * b.lie;
    rig.current.rotation.x = (Math.PI / 2) * b.lie;
    const legs = (Math.PI / 2) * b.sit * (1 - b.lie); // legs stretch out forward when sitting
    if (legL.current) legL.current.rotation.x = swing * still + legs;
    if (legR.current) legR.current.rotation.x = -swing * still + legs;
    const arms = 0.7 * b.sit * (1 - b.lie); // hands rest toward the knees
    if (armL.current) armL.current.rotation.x = -swing * still + arms;
    if (armR.current) armR.current.rotation.x = swing * still + arms;
  });

  return (
    <group ref={root}>
      {nickname && (
        <Html position={[0, 1.95, 0]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div style={{ padding: '1px 8px', borderRadius: 10, background: 'rgba(255,255,255,.85)', fontSize: 12, fontWeight: 600 }}>{nickname}</div>
        </Html>
      )}
      <group ref={rig}>
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
    </group>
  );
}
