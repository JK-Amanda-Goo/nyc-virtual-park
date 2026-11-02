import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Entrance, ParkData } from './types';
import { LOOK_Y, type PlayerState } from './player';
import type { Terrain } from './terrain';

const FLIGHT_SECONDS = 3;
const WALK = 1.4, RUN = 4.2;

type Orbit = { yaw: number; pitch: number; dist: number };
type Pose = { pos: THREE.Vector3; quat: THREE.Quaternion };
const makePose = (): Pose => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });

export function CameraRig({ data, entrance, player, terrain }: { data: ParkData; entrance: Entrance | null; player: React.RefObject<PlayerState>; terrain: Terrain }) {
  const { camera, gl, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const probe = useRef(new THREE.PerspectiveCamera()); // cameras aim down -Z, unlike plain objects

  // Map pose: straight down, with the park's long axis pointing up the screen.
  const mapPose = useRef(makePose());
  useEffect(() => {
    // Long axis of the official outline (principal component of the largest part), oriented northward.
    const ring = data.boundary.reduce((m, r) => (r.length > m.length ? r : m));
    const mx = ring.reduce((a, p) => a + p[0], 0) / ring.length, mz = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    let cxx = 0, czz = 0, cxz = 0;
    for (const [x, z] of ring) { cxx += (x - mx) ** 2; czz += (z - mz) ** 2; cxz += (x - mx) * (z - mz); }
    const theta = 0.5 * Math.atan2(2 * cxz, cxx - czz);
    const axis = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
    if (axis.z > 0) axis.negate();
    const across = new THREE.Vector3(-axis.z, 0, axis.x);
    const along = ring.map(([x, z]) => x * axis.x + z * axis.z), side = ring.map(([x, z]) => x * across.x + z * across.z);
    const [a0, a1, s0, s1] = [Math.min(...along), Math.max(...along), Math.min(...side), Math.max(...side)];
    const center = axis.clone().multiplyScalar((a0 + a1) / 2).addScaledVector(across, (s0 + s1) / 2);
    const lengthM = (a1 - a0) * 1.12, widthM = (s1 - s0) * 1.4;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const h = Math.max(lengthM / (2 * t), widthM / (2 * t * (size.width / size.height)));
    const pr = probe.current;
    pr.up.copy(axis);
    pr.position.set(center.x, h, center.z);
    pr.lookAt(center.x, 0, center.z);
    mapPose.current.pos.copy(pr.position);
    mapPose.current.quat.copy(pr.quaternion);
    pr.up.set(0, 1, 0);
    cam.far = h * 3;
    cam.updateProjectionMatrix();
  }, [data, cam, size.width, size.height]);

  const orbit = useRef<Orbit>({ yaw: 0, pitch: 0.35, dist: 5 });
  const flight = useRef({ t: 0, from: makePose(), to: makePose() });
  const mode = useRef<'map' | 'flying' | 'walk'>('map');
  const keys = useRef(new Set<string>());

  // Third-person pose: camera sits behind the player at orbit.yaw, looking at the head.
  const orbitPose = (out: Pose) => {
    const p = player.current!, o = orbit.current;
    const cp = Math.cos(o.pitch);
    out.pos.set(p.x + Math.sin(o.yaw) * cp * o.dist, p.y + p.lookY + Math.sin(o.pitch) * o.dist, p.z + Math.cos(o.yaw) * cp * o.dist);
    const pr = probe.current;
    pr.position.copy(out.pos);
    pr.lookAt(p.x, p.y + p.lookY, p.z);
    out.quat.copy(pr.quaternion);
  };

  useEffect(() => {
    const f = flight.current;
    f.from.pos.copy(cam.position);
    f.from.quat.copy(cam.quaternion);
    f.t = 0;
    mode.current = 'flying';
    if (!entrance) {
      f.to.pos.copy(mapPose.current.pos);
      f.to.quat.copy(mapPose.current.quat);
      return;
    }
    // Spawn just inside the entrance, facing the park centre, camera behind.
    const inward = new THREE.Vector3(-entrance.x, 0, -entrance.z).normalize();
    const p = player.current!;
    p.x = entrance.x + inward.x * 6;
    p.z = entrance.z + inward.z * 6;
    p.y = terrain.heightAt(p.x, p.z);
    p.heading = Math.atan2(-inward.x, -inward.z);
    p.speed = 0;
    p.pose = 'stand';
    p.lookY = LOOK_Y.stand;
    orbit.current = { yaw: p.heading, pitch: 0.3, dist: 5 };
    orbitPose(f.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrance, cam, terrain]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      const p = player.current;
      if (e.repeat || mode.current !== 'walk' || !p) return;
      // C sits, X lies down; pressing the same key again stands up.
      if (e.code === 'KeyC') p.pose = p.pose === 'sit' ? 'stand' : 'sit';
      if (e.code === 'KeyX') p.pose = p.pose === 'lie' ? 'stand' : 'lie';
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    let dragging = false;
    const md = () => { dragging = true; };
    const mu = () => { dragging = false; };
    const mm = (e: MouseEvent) => {
      if (!dragging || mode.current !== 'walk') return;
      orbit.current.yaw -= e.movementX * 0.005;
      orbit.current.pitch = THREE.MathUtils.clamp(orbit.current.pitch + e.movementY * 0.005, 0.05, 1.3);
    };
    const wheel = (e: WheelEvent) => {
      if (mode.current === 'walk') orbit.current.dist = THREE.MathUtils.clamp(orbit.current.dist + e.deltaY * 0.01, 2.5, 14);
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    gl.domElement.addEventListener('pointerdown', md); window.addEventListener('pointerup', mu); window.addEventListener('pointermove', mm);
    gl.domElement.addEventListener('wheel', wheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      gl.domElement.removeEventListener('pointerdown', md); window.removeEventListener('pointerup', mu); window.removeEventListener('pointermove', mm);
      gl.domElement.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const f = flight.current;
    if (mode.current === 'map') {
      cam.position.copy(mapPose.current.pos);
      cam.quaternion.copy(mapPose.current.quat);
      return;
    }
    if (mode.current === 'flying') {
      f.t = Math.min(1, f.t + dt / FLIGHT_SECONDS);
      const e = f.t * f.t * (3 - 2 * f.t);
      cam.position.lerpVectors(f.from.pos, f.to.pos, e);
      cam.quaternion.slerpQuaternions(f.from.quat, f.to.quat, e);
      if (f.t >= 1) mode.current = entrance ? 'walk' : 'map';
      return;
    }

    const k = keys.current, o = orbit.current, p = player.current!;
    o.yaw += ((k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0)) * 1.8 * dt;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const run = k.has('ShiftLeft') || k.has('ShiftRight');

    // Move relative to the camera: "forward" is away from the camera.
    const fx = -Math.sin(o.yaw), fz = -Math.cos(o.yaw);
    let mx = fx * fwd - fz * side, mz = fz * fwd + fx * side; // right = (-fz, fx)
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      p.pose = 'stand'; // moving gets you up
      mx /= len; mz /= len;
      const speed = run ? RUN : WALK;
      p.x += mx * speed * dt;
      p.z += mz * speed * dt;
      p.speed = speed;
      p.y = terrain.heightAt(p.x, p.z);
      // Turn the body toward the movement direction by the shortest arc.
      const target = Math.atan2(-mx, -mz);
      let d = target - p.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.heading += d * Math.min(1, dt * 12);
    } else {
      p.speed = 0;
    }
    p.lookY += (LOOK_Y[p.pose] - p.lookY) * Math.min(1, dt * 6);
    const pose = makePose();
    orbitPose(pose);
    cam.position.copy(pose.pos);
    cam.quaternion.copy(pose.quat);
  });
  return null;
}
