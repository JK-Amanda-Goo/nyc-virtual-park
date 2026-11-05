// Character profile, saved to the account (Supabase). A profile saved in this browser before accounts existed is only used to prefill the first-time form.
import { supabase } from './supabase';

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

const ADJECTIVES = [
  'Sleepy', 'Breezy', 'Mossy', 'Sunny', 'Cozy', 'Misty', 'Fuzzy', 'Gentle', 'Quiet', 'Lazy', 'Happy', 'Dusty', 'Rainy', 'Golden', 'Clever',
  'Wobbly', 'Cheery', 'Sandy', 'Frosty', 'Humble', 'Jolly', 'Plucky', 'Snowy', 'Windy', 'Dreamy', 'Wild', 'Tiny', 'Brave', 'Mellow', 'Peachy',
  'Rusty', 'Shady', 'Silky', 'Speedy', 'Sparkly', 'Velvet', 'Zesty', 'Dappled', 'Curious', 'Sunlit',
];
const NOUNS = [
  'Otter', 'Fox', 'Hedgehog', 'Heron', 'Squirrel', 'Acorn', 'Maple', 'Pebble', 'Willow', 'Clover', 'Fern', 'Daisy', 'Robin', 'Sparrow', 'Turtle',
  'Raccoon', 'Owl', 'Cricket', 'Moss', 'Breeze', 'Brook', 'Meadow', 'Pinecone', 'Ladybug', 'Firefly', 'Mushroom', 'Birch', 'Tulip', 'Badger',
  'Rabbit', 'Falcon', 'Pond', 'Stone', 'Cloud', 'Petal', 'Blossom', 'Lichen', 'Thistle', 'Marmot', 'Dandelion',
];
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** A random "AdjectiveNoun" nickname from nature words, within the length limit. */
export function suggestNickname(): string {
  for (;;) {
    const n = pick(ADJECTIVES) + pick(NOUNS);
    if (n.length <= NICKNAME_MAX) return n;
  }
}

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

/** The signed-in account's profile, or null when none has been saved yet. */
export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('nickname, skin_color, top_color').maybeSingle();
  if (error) throw error;
  return data && { nickname: data.nickname, skin: data.skin_color, top: data.top_color };
}

export async function storeProfile(userId: string, p: Profile) {
  const { error } = await supabase.from('profiles').upsert({ user_id: userId, nickname: p.nickname, skin_color: p.skin, top_color: p.top });
  if (error) throw error;
}
