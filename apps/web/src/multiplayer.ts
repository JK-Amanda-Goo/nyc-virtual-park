import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { makePlayer, type PlayerState, type Pose } from './player';
import type { Profile } from './profile';
import type { BlanketState } from './blanketState';

const ROOM = 'park:central-park';
const SEND_MS = 100; // position updates per second: 10
const HEARTBEAT_MS = 1000; // while standing still, say so this often

/** Who is in the park, from presence. */
/** The part of a blanket others need to draw it; they run the lay and fold animation themselves. */
export type BlanketWire = Pick<BlanketState, 'phase' | 'color' | 'x' | 'y' | 'z' | 'heading' | 'version'>;
export type Peer = { key: string; nickname: string; skin: string; top: string; inPark: boolean; blanket: BlanketWire };

/** Where another player is now (`target`, from the network) and what we draw (`state`, eased toward it). */
export type Remote = { state: PlayerState; target: { x: number; y: number; z: number; h: number; s: number; pose: Pose } };

type Wire = { id: string; x: number; y: number; z: number; h: number; s: number; pose: Pose };

/**
 * Join the shared park room. Presence tells us who is here; the other players' positions
 * arrive as broadcasts into `remotes`. Everyone signed in is in the room, including people still
 * looking at the map; `inPark` says who has actually entered. Blankets travel in presence too, so
 * someone who joins later still sees the ones already laid. Returns `setInPark`, `shareBlanket` and `leave`.
 */
export function joinPark(opts: {
  profile: Profile;
  player: React.RefObject<PlayerState>;
  blanket: React.RefObject<BlanketState>;
  remotes: Map<string, Remote>;
  onRoster: (everyone: Peer[], me: string) => void;
}) {
  const { profile, player, blanket, remotes, onRoster } = opts;
  let inPark = false;
  const me = crypto.randomUUID(); // one per tab, so the same account in two windows shows up twice
  const channel: RealtimeChannel = supabase.channel(ROOM, { config: { presence: { key: me }, broadcast: { self: false } } });

  channel.on('presence', { event: 'sync' }, () => {
    const everyone: Peer[] = Object.entries(channel.presenceState<Omit<Peer, 'key'>>())
      .map(([key, metas]) => ({ key, nickname: metas[0].nickname, skin: metas[0].skin, top: metas[0].top, inPark: metas[0].inPark, blanket: metas[0].blanket }));
    const here = new Set(everyone.map((e) => e.key));
    for (const key of remotes.keys()) if (!here.has(key)) remotes.delete(key);
    onRoster(everyone, me);
  });

  channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
    const w = payload as Wire;
    let r = remotes.get(w.id);
    if (!r) {
      const state = makePlayer();
      Object.assign(state, { x: w.x, y: w.y, z: w.z, heading: w.h, pose: w.pose });
      r = { state, target: { x: w.x, y: w.y, z: w.z, h: w.h, s: w.s, pose: w.pose } };
      remotes.set(w.id, r);
    }
    r.target = { x: w.x, y: w.y, z: w.z, h: w.h, s: w.s, pose: w.pose };
  });

  const track = () => {
    const { phase, color, x, y, z, heading, version } = blanket.current;
    return channel.track({ nickname: profile.nickname, skin: profile.skin, top: profile.top, inPark, blanket: { phase, color, x, y, z, heading, version } });
  };
  let subscribed = false;
  let timer = 0;
  let last = { x: NaN, z: NaN, h: NaN, pose: '' as string, at: 0 };
  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    subscribed = true;
    track();
    timer = window.setInterval(() => {
      const p = player.current;
      if (!p || !p.walking) return;
      const now = performance.now();
      const same = p.x === last.x && p.z === last.z && p.heading === last.h && p.pose === last.pose;
      if (same && now - last.at < HEARTBEAT_MS) return; // nothing new to say
      last = { x: p.x, z: p.z, h: p.heading, pose: p.pose, at: now };
      const wire: Wire = { id: me, x: p.x, y: p.y, z: p.z, h: p.heading, s: p.speed, pose: p.pose };
      channel.send({ type: 'broadcast', event: 'pos', payload: wire });
    }, SEND_MS);
  });

  return {
    setInPark(value: boolean) { inPark = value; if (subscribed) track(); },
    shareBlanket() { if (subscribed) track(); },
    leave() { window.clearInterval(timer); remotes.clear(); supabase.removeChannel(channel); },
  };
}
