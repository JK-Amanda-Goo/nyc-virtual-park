import type { Peer } from './multiplayer';

/** Always-visible panel: how many people are in the park right now, and who. */
export function ParkHud({ peers, me }: { peers: Peer[]; me: string }) {
  const box: React.CSSProperties = { position: 'absolute', top: 16, right: 16, padding: '8px 12px', background: 'rgba(255,255,255,.85)', borderRadius: 6, fontSize: 14, maxWidth: 220 };
  return (
    <div style={box}>
      <strong>{peers.length}</strong> {peers.length === 1 ? 'person' : 'people'} in the park
      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', maxHeight: 160, overflowY: 'auto', fontSize: 12 }}>
        {peers.map((p) => (
          <li key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.skin, border: '1px solid #999', flex: 'none' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}{p.key === me ? ' (you)' : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
