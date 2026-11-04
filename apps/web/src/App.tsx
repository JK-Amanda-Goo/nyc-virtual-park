import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
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
import { fetchProfile, loadProfile, storeProfile, type Profile } from './profile';
import { supabase } from './supabase';
import { AuthScreen } from './AuthScreen';
import { joinPark, type Peer, type Remote } from './multiplayer';
import { RemotePlayers } from './RemotePlayers';
import { trackSession } from './sessionTracker';
import { ParkHud } from './ParkHud';

export function App() {
  const [data, setData] = useState<ParkData | null>(null);
  const [entrance, setEntrance] = useState<Entrance | null>(null);
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const player = useRef(makePlayer());
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined: still checking
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // null: none saved yet
  const [editing, setEditing] = useState(false);
  const [profileError, setProfileError] = useState(''); // loading the profile failed
  const [saveError, setSaveError] = useState('');
  const userId = session?.user.id;
  const remotes = useRef(new Map<string, Remote>());
  const [roster, setRoster] = useState<{ everyone: Peer[]; me: string }>({ everyone: [], me: '' });
  const blanket = useRef(makeBlanket());
  const [bl, setBl] = useState<{ phase: BlanketPhase; color: string }>({ phase: 'none', color: blanket.current.color });
  const setPhase = (phase: BlanketPhase) => { blanket.current.phase = phase; setBl((s) => ({ ...s, phase })); room.current?.shareBlanket(); };
  const grab = () => setPhase('held');
  const putAway = () => setPhase('none');
  const lay = () => {
    const b = blanket.current, p = player.current;
    Object.assign(b, { x: p.x, y: p.y, z: p.z, heading: p.heading, t: 0, version: b.version + 1 });
    setPhase('laying');
  };
  const getBack = () => { blanket.current.t = 0; setPhase('folding'); };
  const setColor = (color: string) => { blanket.current.color = color; setBl((s) => ({ ...s, color })); room.current?.shareBlanket(); };
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setProfile(undefined); setEditing(false); setEntrance(null);
    if (!userId) return;
    fetchProfile().then(setProfile).catch((e: Error) => setProfileError(e.message));
  }, [userId]);
  // Signed in with a character: join the shared room, so the map shows who is in the park too.
  const room = useRef<ReturnType<typeof joinPark> | null>(null);
  useEffect(() => {
    if (!userId || !profile) return;
    const r = joinPark({ profile, player, blanket, remotes: remotes.current, onRoster: (everyone, me) => setRoster({ everyone, me }) });
    room.current = r;
    return () => { r.leave(); room.current = null; setRoster({ everyone: [], me: '' }); };
  }, [userId, profile]);
  useEffect(() => { room.current?.setInPark(!!entrance); }, [entrance, userId, profile]);
  // One visit = from picking a gate to going back to the map (or signing out).
  useEffect(() => {
    if (!userId || !entrance) return;
    return trackSession({ gateId: entrance.id, player, blanket, remotes: remotes.current });
  }, [userId, entrance]);
  useEffect(() => {
    fetch('/park.json').then((r) => r.json()).then(async (d: ParkData) => { setTerrain(await Terrain.load(d.terrain)); setData(d); });
  }, []);
  if (session === undefined) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!session) return <AuthScreen />;
  if (profileError) return <div style={{ padding: 24 }}>Could not load your profile: {profileError}</div>;
  if (profile === undefined) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!profile || editing) {
    return <SetupScreen initial={profile ?? loadProfile()} error={saveError} onCancel={profile ? () => setEditing(false) : undefined}
      onDone={async (p) => {
        setSaveError('');
        try { await storeProfile(session.user.id, p); setProfile(p); setEditing(false); }
        catch (e) { setSaveError((e as Error).message); }
      }} />;
  }
  if (!data || !terrain) return <div style={{ padding: 24 }}>Loading park…</div>;

  const inPark = roster.everyone.filter((p) => p.inPark);
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
        {entrance && <RemotePlayers peers={roster.everyone.filter((p) => p.key !== roster.me)} remotes={remotes} terrain={terrain} />}
        {entrance && <Blanket blanket={blanket} player={player} terrain={terrain} onPhase={(phase) => setBl((s) => ({ ...s, phase }))} />}
        <CameraRig data={data} entrance={entrance} player={player} terrain={terrain} />
      </Canvas>
      <ParkHud peers={inPark} me={roster.me} />
      {entrance && <Minimap data={data} terrain={terrain} player={player} />}
      {entrance && <BlanketPanel phase={bl.phase} color={bl.color} onColor={setColor} onGrab={grab} onLay={lay} onGetBack={getBack} onPutAway={putAway} />}
      <div style={overlay}>
        {entrance ? (
          <>
            WASD move, Shift run, C sit, X lie down, drag to orbit, scroll to zoom.{' '}
            <button onClick={() => setEntrance(null)}>Back to map</button>
          </>
        ) : 'Central Park: pick an entrance'}{' '}
        <button onClick={() => setEditing(true)}>Edit character</button>{' '}
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </>
  );
}
