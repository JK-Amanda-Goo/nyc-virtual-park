import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Character } from './Character';
import { theme } from './theme';
import { makePlayer, type PlayerState } from './player';
import {
  DEFAULT_PROFILE, NEON_SKIN, NICKNAME_MAX, NICKNAME_MIN, SKIN_TONES, TOP_COLORS,
  cleanNickname, validNickname, type Profile,
} from './profile';

function Turntable({ player }: { player: React.RefObject<PlayerState> }) {
  useFrame((_, dt) => { player.current.heading += dt * 0.6; });
  return null;
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'center', gap: 8 }}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {colors.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={`${label} ${c}`}
            style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: c === value ? '3px solid #222' : '1px solid #999', padding: 0, cursor: 'pointer' }} />
        ))}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} custom`} style={{ width: 30, height: 26, padding: 0, border: 'none', background: 'none' }} />
      </div>
    </div>
  );
}

/** Pick a nickname, skin tone and clothes colours before entering the park. */
export function SetupScreen({ initial, onDone, onCancel }: { initial: Profile | null; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const [p, setP] = useState<Profile>(initial ?? DEFAULT_PROFILE);
  const preview = useRef(makePlayer());
  const ok = validNickname(p.nickname);
  const set = (patch: Partial<Profile>) => setP((s) => ({ ...s, ...patch }));
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 16, flexWrap: 'wrap', background: '#eef3f7' }}>
      <div style={{ width: 260, height: 340, borderRadius: 12, overflow: 'hidden', background: '#cfe3f2', boxShadow: '0 2px 10px rgba(0,0,0,.2)' }}>
        <Canvas camera={{ position: [0, 1.2, 3.6], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.95, 0)}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} />
          <Character player={preview} colors={{ skin: p.skin, shirt: p.top, pants: theme.pants }} />
          <Turntable player={preview} />
        </Canvas>
      </div>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 340, fontSize: 14 }}
        onSubmit={(e) => { e.preventDefault(); if (ok) onDone({ ...p, nickname: cleanNickname(p.nickname) }); }}>
        <h2 style={{ margin: 0 }}>Your character</h2>
        <label style={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'center', gap: 8 }}>
          <span>Nickname</span>
          <input value={p.nickname} onChange={(e) => set({ nickname: e.target.value })} maxLength={NICKNAME_MAX * 2} autoFocus placeholder={`${NICKNAME_MIN}-${NICKNAME_MAX} characters`} style={{ padding: '6px 8px', fontSize: 14 }} />
        </label>
        <Swatches label="Skin" colors={[...SKIN_TONES, ...NEON_SKIN]} value={p.skin} onChange={(skin) => set({ skin })} />
        <Swatches label="Top" colors={TOP_COLORS} value={p.top} onChange={(top) => set({ top })} />
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button type="submit" disabled={!ok} style={{ padding: '8px 16px', fontSize: 15 }}>{initial ? 'Save' : 'Enter the park'}</button>
          {onCancel && <button type="button" onClick={onCancel} style={{ padding: '8px 16px', fontSize: 15 }}>Cancel</button>}
        </div>
        <small style={{ color: '#666' }}>Saved in this browser only. Sign-up comes later.</small>
      </form>
    </div>
  );
}
