import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Entrance, ParkData } from './types';
import { World } from './World';
import { CameraRig } from './CameraRig';
import { Entrances } from './Entrances';
import { theme } from './theme';

export function App() {
  const [data, setData] = useState<ParkData | null>(null);
  const [entrance, setEntrance] = useState<Entrance | null>(null);
  useEffect(() => { fetch('/park.json').then((r) => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 24 }}>Loading park…</div>;

  const overlay: React.CSSProperties = { position: 'absolute', top: 16, left: 16, padding: '8px 12px', background: 'rgba(255,255,255,.85)', borderRadius: 6, fontSize: 14 };
  return (
    <>
      <Canvas camera={{ fov: 45, near: 0.1, far: 20000 }} style={{ background: theme.sky }}>
        <fog attach="fog" args={[theme.sky, entrance ? 150 : 1e5, entrance ? 900 : 2e5]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[300, 600, 200]} intensity={1.6} />
        <World data={data} />
        {!entrance && <Entrances items={data.entrances} onPick={setEntrance} />}
        <CameraRig data={data} entrance={entrance} />
      </Canvas>
      <div style={overlay}>
        {entrance ? (
          <>
            WASD / arrows to move, Shift to run, drag to look.{' '}
            <button onClick={() => setEntrance(null)}>Back to map</button>
          </>
        ) : 'Central Park: pick an entrance'}
      </div>
    </>
  );
}
