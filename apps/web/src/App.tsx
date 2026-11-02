import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Entrance, ParkData } from './types';
import { World } from './World';
import { CameraRig } from './CameraRig';
import { Entrances } from './Entrances';
import { Terrain } from './terrain';
import { Character } from './Character';
import { makePlayer } from './player';
import { theme } from './theme';

export function App() {
  const [data, setData] = useState<ParkData | null>(null);
  const [entrance, setEntrance] = useState<Entrance | null>(null);
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const player = useRef(makePlayer());
  useEffect(() => {
    fetch('/park.json').then((r) => r.json()).then(async (d: ParkData) => { setTerrain(await Terrain.load(d.terrain)); setData(d); });
  }, []);
  if (!data || !terrain) return <div style={{ padding: 24 }}>Loading park…</div>;

  const overlay: React.CSSProperties = { position: 'absolute', top: 16, left: 16, padding: '8px 12px', background: 'rgba(255,255,255,.85)', borderRadius: 6, fontSize: 14 };
  return (
    <>
      <Canvas camera={{ fov: 45, near: 0.1, far: 20000 }} style={{ background: theme.sky }}>
        <fog attach="fog" args={[theme.sky, entrance ? 150 : 1e5, entrance ? 900 : 2e5]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[300, 600, 200]} intensity={1.6} />
        <World data={data} terrain={terrain} />
        {!entrance && <Entrances items={data.entrances} terrain={terrain} onPick={setEntrance} />}
        {entrance && <Character player={player} />}
        <CameraRig data={data} entrance={entrance} player={player} terrain={terrain} />
      </Canvas>
      <div style={overlay}>
        {entrance ? (
          <>
            WASD move, Shift run, C sit, X lie down, drag to orbit, scroll to zoom.{' '}
            <button onClick={() => setEntrance(null)}>Back to map</button>
          </>
        ) : 'Central Park: pick an entrance'}
      </div>
    </>
  );
}
