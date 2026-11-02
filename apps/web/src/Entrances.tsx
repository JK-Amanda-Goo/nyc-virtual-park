import { useState } from 'react';
import { Html } from '@react-three/drei';
import type { Entrance } from './types';
import type { Terrain } from './terrain';
import { theme } from './theme';

export function Entrances({ items, terrain, onPick }: { items: Entrance[]; terrain: Terrain; onPick: (e: Entrance) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <group>
      {items.map((e) => (
        <group key={e.id} position={[e.x, terrain.heightAt(e.x, e.z), e.z]}>
          <mesh
            position={[0, 20, 0]}
            scale={hover === e.id ? 1.6 : 1}
            onPointerOver={(ev) => { ev.stopPropagation(); setHover(e.id); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHover(null); document.body.style.cursor = 'auto'; }}
            onClick={(ev) => { ev.stopPropagation(); document.body.style.cursor = 'auto'; onPick(e); }}
          >
            <cylinderGeometry args={[22, 22, 40, 16]} />
            <meshBasicMaterial color={hover === e.id ? theme.markerHover : theme.marker} />
          </mesh>
          {hover === e.id && <Html position={[0, 60, 0]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap', fontSize: 12, background: 'rgba(255,255,255,.9)', padding: '2px 6px', borderRadius: 4 }}>
            {e.name}{e.verified ? ' ✓' : ' (unverified)'}
          </Html>}
        </group>
      ))}
    </group>
  );
}
