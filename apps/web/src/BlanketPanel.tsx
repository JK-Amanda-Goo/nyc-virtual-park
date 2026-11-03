import { BLANKET_COLORS, type BlanketPhase } from './blanketState';

const box: React.CSSProperties = { position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,.9)', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.25)', fontSize: 14 };

/** Grab a blanket, pick its colour, lay it out, take it back. */
export function BlanketPanel({ phase, color, onColor, onGrab, onLay, onGetBack, onPutAway }: {
  phase: BlanketPhase; color: string; onColor: (c: string) => void;
  onGrab: () => void; onLay: () => void; onGetBack: () => void; onPutAway: () => void;
}) {
  const busy = phase === 'laying' || phase === 'folding';
  const canPick = phase === 'none' || phase === 'held';
  // Keep keyboard focus on the game after a click, so WASD and Enter don't re-press the button.
  const press = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => { fn(); e.currentTarget.blur(); };
  return (
    <div style={box}>
      <strong>Blanket</strong>
      <div style={{ display: 'flex', gap: 4, opacity: canPick ? 1 : 0.4 }}>
        {BLANKET_COLORS.map((c) => (
          <button key={c} disabled={!canPick} onClick={press(() => onColor(c))} aria-label={`Colour ${c}`}
            style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: c === color ? '3px solid #222' : '1px solid #999', padding: 0, cursor: canPick ? 'pointer' : 'default' }} />
        ))}
        <input type="color" value={color} disabled={!canPick} onChange={(e) => onColor(e.target.value)} aria-label="Custom colour" style={{ width: 28, height: 24, padding: 0, border: 'none', background: 'none' }} />
      </div>
      {phase === 'none' && <button onClick={press(onGrab)}>Grab blanket</button>}
      {phase === 'held' && (<><button onClick={press(onLay)}>Lay out here</button><button onClick={press(onPutAway)}>Put away</button></>)}
      {busy && <button disabled>…</button>}
      {phase === 'laid' && <button onClick={press(onGetBack)}>Get blanket back</button>}
    </div>
  );
}
