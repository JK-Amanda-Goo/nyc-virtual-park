import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BlanketPhase, BlanketState } from './blanketState';
import type { PlayerState } from './player';
import type { Terrain } from './terrain';

const W = 2.0, D = 1.5; // laid-out size in metres (across x along the way the player faced)
const FOLDED = { x: 0.5, y: 0.14, z: 0.4 }; // the carried bundle
const HAND = { up: 0.9, side: 0.4, ahead: 0.15 }; // the bundle at the player's right hand, so it shows in the back view
const LAY_SECONDS = 1.1;
const FALL_SHARE = 0.4; // the first part of the animation is the bundle dropping; the rest is unfolding
const LIFT = 0.03; // above the ground, so it doesn't z-fight with the terrain mesh

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (x: number) => { const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

/** World offset of (side, ahead) metres from a point, for a player facing `heading`. */
const handOffset = (heading: number, scale = 1): [number, number] => {
  const c = Math.cos(heading), s = Math.sin(heading), lx = HAND.side * scale, lz = -HAND.ahead * scale;
  return [lx * c + lz * s, -lx * s + lz * c];
};

/** A flat sheet draped over the terrain; vertices are relative to the sheet's centre. */
function drape(w: number, d: number, b: BlanketState, terrain: Terrain, lift: number) {
  const g = new THREE.PlaneGeometry(w, d, 12, 9);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, c = Math.cos(b.heading), s = Math.sin(b.heading);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i);
    // Same turn as a group with rotation.y = heading.
    pos.setY(i, terrain.heightAt(b.x + lx * c + lz * s, b.z - lx * s + lz * c) - b.y + lift);
  }
  g.computeVertexNormals();
  return g;
}

export function Blanket({ blanket, player, terrain, onPhase }: {
  blanket: React.RefObject<BlanketState>; player: React.RefObject<PlayerState>; terrain: Terrain; onPhase: (p: BlanketPhase) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const bundle = useRef<THREE.Mesh>(null);
  const sheet = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Mesh>(null), inner = useRef<THREE.Mesh>(null);
  const built = useRef(-1);
  const trim = useRef(new THREE.Color());

  useEffect(() => () => { outer.current?.geometry.dispose(); inner.current?.geometry.dispose(); }, []);

  useFrame((_, dt) => {
    const b = blanket.current, p = player.current, g = group.current, bu = bundle.current, sh = sheet.current;
    if (!b || !p || !g || !bu || !sh || !outer.current || !inner.current) return;
    g.visible = b.phase !== 'none';
    if (!g.visible) return;

    if (built.current !== b.version && (b.phase === 'laying' || b.phase === 'laid' || b.phase === 'folding')) {
      outer.current.geometry.dispose(); inner.current.geometry.dispose();
      outer.current.geometry = drape(W, D, b, terrain, LIFT);
      inner.current.geometry = drape(W - 0.3, D - 0.3, b, terrain, LIFT + 0.012);
      built.current = b.version;
    }
    (outer.current.material as THREE.MeshLambertMaterial).color.set(b.color);
    (inner.current.material as THREE.MeshLambertMaterial).color.copy(trim.current.set(b.color).lerp(new THREE.Color('#ffffff'), 0.35));
    (bu.material as THREE.MeshLambertMaterial).color.set(b.color);

    if (b.phase === 'held') {
      // Carried in front of the chest; it follows the pose (lower when sitting or lying).
      const rise = THREE.MathUtils.clamp((p.lookY - 0.35) / (1.4 - 0.35), 0, 1);
      const up = 0.35 + (HAND.up - 0.35) * rise, [ox, oz] = handOffset(p.heading);
      g.position.set(p.x + ox, p.y + up, p.z + oz);
      g.rotation.y = p.heading;
      bu.visible = true; sh.visible = false;
      return;
    }

    if (b.phase === 'laying' || b.phase === 'folding') {
      b.t = Math.min(1, b.t + dt / LAY_SECONDS);
      if (b.t >= 1) { b.phase = b.phase === 'laying' ? 'laid' : 'held'; onPhase(b.phase); return; }
    }
    // Folding is the same motion played backwards.
    const t = b.phase === 'folding' ? 1 - b.t : b.phase === 'laid' ? 1 : b.t;
    const fall = smooth(clamp01(t / FALL_SHARE)); // 0 in the hands, 1 on the ground
    const unfold = clamp01((t - FALL_SHARE) / (1 - FALL_SHARE));
    const [ox, oz] = handOffset(b.heading, 1 - fall); // slides from the hand to the spot under the player
    g.position.set(b.x + ox, b.y + HAND.up * (1 - fall * fall), b.z + oz);
    g.rotation.y = b.heading;
    const dropping = t < FALL_SHARE;
    bu.visible = dropping; sh.visible = !dropping;
    bu.position.y = FOLDED.y / 2 + LIFT;
    const grow = easeOutBack(unfold);
    sh.scale.set(THREE.MathUtils.lerp(FOLDED.x / W, 1, grow), 1, THREE.MathUtils.lerp(FOLDED.z / D, 1, grow));
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={bundle}>
        <boxGeometry args={[FOLDED.x, FOLDED.y, FOLDED.z]} />
        <meshLambertMaterial color="#e4572e" />
      </mesh>
      <group ref={sheet}>
        <mesh ref={outer}><planeGeometry args={[0.01, 0.01]} /><meshLambertMaterial side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></mesh>
        <mesh ref={inner}><planeGeometry args={[0.01, 0.01]} /><meshLambertMaterial side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} /></mesh>
      </group>
    </group>
  );
}
