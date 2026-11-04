import { supabase } from './supabase';
import type { PlayerState, Pose } from './player';
import type { BlanketState } from './blanketState';
import type { Remote } from './multiplayer';

const SAMPLE_MS = 250;
const PING_MS = 30_000; // heartbeat: also the latest a closed tab could have been seen
const IDLE_MS = 60_000; // no key or mouse for this long counts as away
const NEAR_M = 20; // "with someone": within this distance of another player
const RUN_SPEED = 2.5; // the character runs above this speed (m/s)
const MAX_JUMP_M = 10; // a bigger step between samples is a respawn, not walking
const BLANKET_HALF = { w: 1.0, d: 0.75 }; // half of the 2.0 x 1.5 m sheet

/** Is this spot on a blanket that is laid out? Same turn as the sheet's own rotation. */
function onBlanket(b: BlanketState, x: number, z: number) {
  if (b.phase !== 'laid' && b.phase !== 'laying') return false;
  const dx = x - b.x, dz = z - b.z, c = Math.cos(b.heading), s = Math.sin(b.heading);
  return Math.abs(dx * c - dz * s) <= BLANKET_HALF.w && Math.abs(dx * s + dz * c) <= BLANKET_HALF.d;
}

/**
 * Record one visit to the park: who came in where, how long and how actively, how far they walked,
 * and where they sat, lay down or laid a blanket. Totals go up every 30 s; nothing here may break the game.
 * Returns a function that ends the visit.
 */
export function trackSession(opts: {
  gateId: string;
  player: React.RefObject<PlayerState>;
  blanket: React.RefObject<BlanketState>;
  remotes: Map<string, Remote>;
}): () => void {
  const { gateId, player, blanket, remotes } = opts;
  const session = crypto.randomUUID();
  const total = { active: 0, walk: 0, run: 0, blankets: 0, maxOthers: 0, near: 0 };
  let lastInput = performance.now();
  let prev: { x: number; z: number } | null = null;
  let pose: Pose = 'stand';
  let phase = blanket.current.phase;
  let rest: { id: string; kind: 'sit' | 'lie' } | null = null;
  let activeMs = 0, nearMs = 0;

  const warn = (what: string) => ({ error }: { error: { message: string } | null }) => { if (error) console.warn(`${what}: ${error.message}`); };
  // Everything waits for the visit row to exist.
  let queue = supabase.rpc('start_session', { p_id: session, p_gate: gateId }).then(warn('start_session'), () => {});
  const send = (fn: () => PromiseLike<unknown>) => { queue = queue.then(() => fn()).then(() => {}, () => {}); };

  const logEvent = (id: string, kind: 'sit' | 'lie' | 'blanket_lay' | 'blanket_pickup', x: number, z: number, end: boolean, color: string | null) => {
    const spot = (kind === 'sit' || kind === 'lie') && onBlanket(blanket.current, x, z); // for blanket events it would be trivially true
    send(() => supabase.rpc('log_event', { p_id: id, p_session: session, p_kind: kind, p_x: x, p_z: z, p_on_blanket: spot, p_color: color, p_end: end }).then(warn('log_event')));
  };
  const ping = (end = false) => send(() => supabase.rpc('ping_session', {
    p_id: session, p_active: Math.floor(total.active), p_walk: total.walk, p_run: total.run, p_blankets: total.blankets,
    p_max_others: total.maxOthers, p_near: Math.floor(total.near), p_end: end,
  }).then(warn('ping_session')));

  const touch = () => { lastInput = performance.now(); };
  const events = ['keydown', 'pointerdown', 'pointermove', 'wheel'] as const;
  events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

  const sample = () => {
    const p = player.current, b = blanket.current;
    if (!p || !p.walking) { prev = null; return; }
    const dt = SAMPLE_MS / 1000;

    if (prev) {
      const d = Math.hypot(p.x - prev.x, p.z - prev.z);
      if (d < MAX_JUMP_M) { if (p.speed > RUN_SPEED) total.run += d; else total.walk += d; }
    }
    prev = { x: p.x, z: p.z };

    if (performance.now() - lastInput < IDLE_MS) { activeMs += SAMPLE_MS; total.active = activeMs / 1000; }

    let near = false;
    for (const r of remotes.values()) if (Math.hypot(r.state.x - p.x, r.state.z - p.z) <= NEAR_M) { near = true; break; }
    if (near) { nearMs += SAMPLE_MS; total.near = nearMs / 1000; }
    total.maxOthers = Math.max(total.maxOthers, remotes.size);

    // Sitting and lying: one event from getting down to getting up.
    if (p.pose !== pose) {
      if (rest) { logEvent(rest.id, rest.kind, p.x, p.z, true, null); rest = null; }
      if (p.pose === 'sit' || p.pose === 'lie') { rest = { id: crypto.randomUUID(), kind: p.pose }; logEvent(rest.id, rest.kind, p.x, p.z, false, null); }
      pose = p.pose;
    }
    // Laying out or taking back a blanket.
    if (b.phase !== phase) {
      if (b.phase === 'laying') { total.blankets++; logEvent(crypto.randomUUID(), 'blanket_lay', b.x, b.z, true, b.color); }
      if (b.phase === 'folding') logEvent(crypto.randomUUID(), 'blanket_pickup', b.x, b.z, true, b.color);
      phase = b.phase;
    }
  };

  const sampler = window.setInterval(sample, SAMPLE_MS);
  const heartbeat = window.setInterval(() => ping(), PING_MS);
  return () => {
    window.clearInterval(sampler); window.clearInterval(heartbeat);
    events.forEach((e) => window.removeEventListener(e, touch));
    const p = player.current;
    if (rest && p) logEvent(rest.id, rest.kind, p.x, p.z, true, null);
    ping(true);
  };
}
