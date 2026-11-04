import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Character } from './Character';
import { Blanket } from './Blanket';
import { makeBlanket } from './blanketState';
import { LOOK_Y, makePlayer, type PlayerState } from './player';
import type { Peer, Remote } from './multiplayer';
import type { Terrain } from './terrain';
import { theme } from './theme';

const EASE = 10; // how fast a drawn player catches up with the last known position, per second

/** The other players in the park, and their blankets, eased between network updates. */
export function RemotePlayers({ peers, remotes, terrain }: { peers: Peer[]; remotes: React.RefObject<Map<string, Remote>>; terrain: Terrain }) {
  // A player is drawn once their first position has arrived, which is not when presence says they joined.
  const [, redraw] = useState(0);
  const drawn = useRef(0);
  useFrame((_, dt) => {
    if (remotes.current.size !== drawn.current) { drawn.current = remotes.current.size; redraw((n) => n + 1); }
    const k = Math.min(1, dt * EASE);
    for (const { state: s, target: t } of remotes.current.values()) {
      s.x += (t.x - s.x) * k; s.y += (t.y - s.y) * k; s.z += (t.z - s.z) * k;
      s.heading += Math.atan2(Math.sin(t.h - s.heading), Math.cos(t.h - s.heading)) * k; // shortest arc
      s.speed = t.s; s.pose = t.pose; s.lookY = LOOK_Y[t.pose]; // the carried bundle follows the pose
    }
  });
  return (
    <>
      {peers.map((p) => <RemoteFigure key={p.key} peer={p} remotes={remotes} terrain={terrain} />)}
    </>
  );
}

function RemoteFigure({ peer, remotes, terrain }: { peer: Peer; remotes: React.RefObject<Map<string, Remote>>; terrain: Terrain }) {
  const r = remotes.current.get(peer.key);
  const here = peer.inPark && r;
  // Someone who is back at the map has no position, so a blanket they carry is not drawn; one laid out stays.
  const showBlanket = peer.blanket && (here || peer.blanket.phase === 'laid' || peer.blanket.phase === 'laying');
  return (
    <>
      {here && <Character player={{ current: r.state }} nickname={peer.nickname} colors={{ skin: peer.skin, shirt: peer.top, pants: theme.pants }} />}
      {showBlanket && <RemoteBlanket peer={peer} state={r?.state} terrain={terrain} />}
    </>
  );
}

function RemoteBlanket({ peer, state, terrain }: { peer: Peer; state: Remote['state'] | undefined; terrain: Terrain }) {
  const blanket = useRef(makeBlanket());
  // The sheet needs no player once laid out; a stand-in keeps the blanket drawable while its owner is at the map.
  const standIn = useRef(makePlayer());
  const player = useRef<PlayerState>(standIn.current);
  player.current = state ?? standIn.current;
  const b = peer.blanket;
  // Each action by its owner restarts the lay or fold animation here; otherwise the sheet just sits.
  useEffect(() => {
    const cur = blanket.current;
    Object.assign(cur, { phase: b.phase, color: b.color, x: b.x, y: b.y, z: b.z, heading: b.heading, version: b.version, t: 0 });
  }, [b.phase, b.color, b.x, b.y, b.z, b.heading, b.version]);
  return <Blanket blanket={blanket} player={player} terrain={terrain} onPhase={() => {}} />;
}
