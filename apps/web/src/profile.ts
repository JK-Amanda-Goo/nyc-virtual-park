// Character profile, saved only in this browser for now. Later it moves to the account (Supabase).
export type Profile = { nickname: string; skin: string; top: string };

export const SKIN_TONES = ['#f6d9bf', '#e8b98f', '#d9a074', '#b97f57', '#8d5a3b', '#5e3b26'];
// Not real skin colours, just fun ones.
export const NEON_SKIN = [
  '#39ff14', '#ccff00', '#ffff33', '#ffae00', '#ff6700', '#ff3131', '#ff1493', '#fe019a',
  '#ff00ff', '#bc13fe', '#7a5cff', '#1f51ff', '#00b7ff', '#00f0ff', '#00ffc8', '#0aff6a',
];
export const TOP_COLORS = ['#4a7fc1', '#e4572e', '#f2a541', '#5aa469', '#9b72cf', '#e98fb0', '#f5f1e8', '#3b3f4a'];

export const DEFAULT_PROFILE: Profile = { nickname: '', skin: SKIN_TONES[1], top: TOP_COLORS[0] };

export const NICKNAME_MIN = 2, NICKNAME_MAX = 16;
export const cleanNickname = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
export const validNickname = (s: string) => { const n = [...cleanNickname(s)].length; return n >= NICKNAME_MIN && n <= NICKNAME_MAX; };

const KEY = 'nyc-virtual-park:profile';

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const p: Profile = { nickname: saved.nickname ?? '', skin: saved.skin ?? DEFAULT_PROFILE.skin, top: saved.top ?? DEFAULT_PROFILE.top };
    return validNickname(p.nickname) ? p : null;
  } catch { return null; }
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private window or blocked storage: the profile just won't persist */ }
}
