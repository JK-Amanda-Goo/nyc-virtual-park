// Shared mutable state for the local player; written by CameraRig, read by Character.
export type Pose = 'stand' | 'sit' | 'lie';

export type PlayerState = {
  x: number;
  y: number; // ground height under the player
  z: number;
  heading: number; // direction the character faces: forward = (-sin h, -cos h)
  speed: number; // metres per second, for animation
  pose: Pose;
  lookY: number; // height above the ground the third-person camera looks at
  view: number; // camera yaw while walking: the camera looks along (-sin v, -cos v)
  walking: boolean; // true only in walk mode, not during the map or flight
};

export const LOOK_Y: Record<Pose, number> = { stand: 1.4, sit: 0.9, lie: 0.35 };

export const makePlayer = (): PlayerState => ({ x: 0, y: 0, z: 0, heading: 0, speed: 0, pose: 'stand', lookY: LOOK_Y.stand, view: 0, walking: false });
