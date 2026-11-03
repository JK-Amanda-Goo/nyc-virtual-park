// Character profile, saved only in this browser for now. Later it moves to the account (Supabase).
export type Profile = { nickname: string; skin: string; top: string; bottom: string };

export const SKIN_TONES = ['#f6d9bf', '#e8b98f', '#d9a074', '#b97f57', '#8d5a3b', '#5e3b26'];
export const TOP_COLORS = ['#4a7fc1', '#e4572e', '#f2a541', '#5aa469', '#9b72cf', '#e98fb0', '#f5f1e8', '#3b3f4a'];
export const BOTTOM_COLORS = ['#3b3f4a', '#2f4f7f', '#6b5b4b', '#8a8f98', '#556b2f', '#f5f1e8', '#7a3b3b'];

export const DEFAULT_PROFILE: Profile = { nickname: '', skin: SKIN_TONES[1], top: TOP_COLORS[0], bottom: BOTTOM_COLORS[0] };

export const NICKNAME_MIN = 2, NICKNAME_MAX = 16;
export const cleanNickname = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
export const validNickname = (s: string) => { const n = [...cleanNickname(s)].length; return n >= NICKNAME_MIN && n <= NICKNAME_MAX; };

const KEY = 'nyc-virtual-park:profile';

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = { ...DEFAULT_PROFILE, ...JSON.parse(raw) } as Profile;
    return validNickname(p.nickname) ? p : null;
  } catch { return null; }
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private window or blocked storage: the profile just won't persist */ }
}
