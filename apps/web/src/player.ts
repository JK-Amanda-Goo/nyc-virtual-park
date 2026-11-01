// Shared mutable state for the local player; written by CameraRig, read by Character.
export type PlayerState = {
  x: number;
  z: number;
  heading: number; // direction the character faces: forward = (-sin h, -cos h)
  speed: number; // metres per second, for animation
};

export const makePlayer = (): PlayerState => ({ x: 0, z: 0, heading: 0, speed: 0 });
