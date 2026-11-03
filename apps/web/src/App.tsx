import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Entrance, ParkData } from './types';
import { World } from './World';
import { CameraRig } from './CameraRig';
import { Entrances } from './Entrances';
import { Terrain } from './terrain';
import { Character } from './Character';
import { Minimap } from './Minimap';
import { Blanket } from './Blanket';
import { BlanketPanel } from './BlanketPanel';
import { makeBlanket, type BlanketPhase } from './blanketState';
import { makePlayer } from './player';
import { theme } from './theme';
import { SetupScreen } from './SetupScreen';
import { loadProfile, saveProfile, type Profile } from './profile';

export function App() {
  const [data, setData] = useState<ParkData | null>(null);
  const [entrance, setEntrance] = useState<Entrance | null>(null);
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const player = useRef(makePlayer());
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [editing, setEditing] = useState(false);
  const blanket = useRef(makeBlanket());
  const [bl, setBl] = useState<{ phase: BlanketPhase; color: string }>({ phase: 'none', color: blanket.current.color });
  const setPhase = (phase: BlanketPhase) => { blanket.current.phase = phase; setBl((s) => ({ ...s, phase })); };
  const grab = () => setPhase('held');
  const putAway = () => setPhase('none');
  const lay = () => {
    const b = blanket.current, p = player.current;
    Object.assign(b, { x: p.x, y: p.y, z: p.z, heading: p.heading, t: 0, version: b.version + 1 });
    setPhase('laying');
  };
  const getBack = () => { blanket.current.t = 0; setPhase('folding'); };
  const setColor = (color: string) => { blanket.current.color = color; setBl((s) => ({ ...s, color })); };
  useEffect(() => {
    fetch('/park.json').then((r) => r.json()).then(async (d: ParkData) => { setTerrain(await Terrain.load(d.terrain)); setData(d); });
  }, []);
  if (!profile || editing) {
    return <SetupScreen initial={profile} onCancel={profile ? () => setEditing(false) : undefined}
      onDone={(p) => { saveProfile(p); setProfile(p); setEditing(false); }} />;
  }
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
        {entrance && <Character player={player} nickname={profile.nickname} colors={{ skin: profile.skin, shirt: profile.top, pants: theme.pants }} />}
        {entrance && <Blanket blanket={blanket} player={player} terrain={terrain} onPhase={(phase) => setBl((s) => ({ ...s, phase }))} />}
        <CameraRig data={data} entrance={entrance} player={player} terrain={terrain} />
      </Canvas>
      {entrance && <Minimap data={data} terrain={terrain} player={player} />}
      {entrance && <BlanketPanel phase={bl.phase} color={bl.color} onColor={setColor} onGrab={grab} onLay={lay} onGetBack={getBack} onPutAway={putAway} />}
      <div style={overlay}>
        {entrance ? (
          <>
            WASD move, Shift run, C sit, X lie down, drag to orbit, scroll to zoom.{' '}
            <button onClick={() => setEntrance(null)}>Back to map</button>
          </>
        ) : 'Central Park: pick an entrance'}{' '}
        <button onClick={() => setEditing(true)}>Edit character</button>
      </div>
    </>
  );
}
