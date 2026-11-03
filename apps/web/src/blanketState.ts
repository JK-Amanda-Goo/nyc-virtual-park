// Client-only blanket state (no server yet): the daily grab cap and sharing come later.
export type BlanketPhase = 'none' | 'held' | 'laying' | 'laid' | 'folding';

export type BlanketState = {
  phase: BlanketPhase;
  color: string;
  // Where it was laid: ground point under the player, and the way the player faced.
  x: number; y: number; z: number; heading: number;
  t: number; // animation progress 0..1 while laying or folding
  version: number; // bumped each time it is laid, so the draped mesh is rebuilt
};

export const BLANKET_COLORS = ['#e4572e', '#f2a541', '#f6d55c', '#5aa469', '#3caea3', '#4a7fc1', '#9b72cf', '#e98fb0', '#f5f1e8', '#3b3f4a'];

export const makeBlanket = (): BlanketState => ({ phase: 'none', color: BLANKET_COLORS[0], x: 0, y: 0, z: 0, heading: 0, t: 0, version: 0 });
