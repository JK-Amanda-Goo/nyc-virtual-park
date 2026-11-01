import { useState } from 'react';
import type { Entrance } from './types';
import { theme } from './theme';

export function Entrances({ items, onPick }: { items: Entrance[]; onPick: (e: Entrance) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <group>
      {items.map((e) => (
        <mesh
          key={e.id}
          position={[e.x, 20, e.z]}
          scale={hover === e.id ? 1.6 : 1}
          onPointerOver={(ev) => { ev.stopPropagation(); setHover(e.id); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHover(null); document.body.style.cursor = 'auto'; }}
          onClick={(ev) => { ev.stopPropagation(); document.body.style.cursor = 'auto'; onPick(e); }}
        >
          <cylinderGeometry args={[22, 22, 40, 16]} />
          <meshBasicMaterial color={hover === e.id ? theme.markerHover : theme.marker} />
        </mesh>
      ))}
    </group>
  );
}
