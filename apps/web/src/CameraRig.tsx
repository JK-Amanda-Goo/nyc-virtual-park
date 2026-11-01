import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Entrance, ParkData } from './types';

const EYE = 1.7;
const FLIGHT_SECONDS = 3;
const WALK = 1.4, RUN = 4.2;

export function CameraRig({ data, entrance }: { data: ParkData; entrance: Entrance | null }) {
  const { camera, gl, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;

  // Long axis of the park (south edge midpoint to north edge midpoint), used to orient the map.
  const axis = useRef(new THREE.Vector3());
  const mapPose = useRef({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
  useEffect(() => {
    const [sw, se, ne, nw] = data.boundary;
    const south = [(sw[0] + se[0]) / 2, (sw[1] + se[1]) / 2], north = [(ne[0] + nw[0]) / 2, (ne[1] + nw[1]) / 2];
    axis.current.set(north[0] - south[0], 0, north[1] - south[1]).normalize();
    const lengthM = Math.hypot(north[0] - south[0], north[1] - south[1]) * 1.12;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const h = Math.max(lengthM / (2 * t), 1300 / (2 * t * (size.width / size.height)));
    const probe = new THREE.PerspectiveCamera(); // cameras aim down -Z, unlike plain objects
    probe.up.copy(axis.current);
    probe.position.set(0, h, 0);
    probe.lookAt(0, 0, 0);
    mapPose.current.pos.copy(probe.position);
    mapPose.current.quat.copy(probe.quaternion);
    cam.far = h * 3;
    cam.updateProjectionMatrix();
  }, [data, cam, size.width, size.height]);

  const flight = useRef({ t: 0, from: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, to: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, yaw: 0, pitch: 0 });
  const mode = useRef<'map' | 'flying' | 'walk'>('map');
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const f = flight.current;
    if (!entrance) {
      // Back to the map.
      f.from.pos.copy(cam.position); f.from.quat.copy(cam.quaternion);
      f.to.pos.copy(mapPose.current.pos); f.to.quat.copy(mapPose.current.quat);
      f.t = 0; mode.current = 'flying';
      return;
    }
    const inward = new THREE.Vector3(-entrance.x, 0, -entrance.z).normalize();
    const start = new THREE.Vector3(entrance.x, EYE, entrance.z).addScaledVector(inward, 6);
    const probe = new THREE.PerspectiveCamera(); // cameras aim down -Z, unlike plain objects
    probe.position.copy(start);
    probe.lookAt(start.clone().addScaledVector(inward, 20));
    f.from.pos.copy(cam.position); f.from.quat.copy(cam.quaternion);
    f.to.pos.copy(start); f.to.quat.copy(probe.quaternion);
    f.yaw = Math.atan2(-inward.x, -inward.z); f.pitch = 0;
    f.t = 0; mode.current = 'flying';
  }, [entrance, cam]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.code);
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    let dragging = false;
    const md = () => { dragging = true; };
    const mu = () => { dragging = false; };
    const mm = (e: MouseEvent) => {
      if (!dragging || mode.current !== 'walk') return;
      flight.current.yaw -= e.movementX * 0.004;
      flight.current.pitch = THREE.MathUtils.clamp(flight.current.pitch - e.movementY * 0.004, -1.2, 1.2);
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    gl.domElement.addEventListener('pointerdown', md); window.addEventListener('pointerup', mu); window.addEventListener('pointermove', mm);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      gl.domElement.removeEventListener('pointerdown', md); window.removeEventListener('pointerup', mu); window.removeEventListener('pointermove', mm);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const f = flight.current;
    if (mode.current === 'map') {
      cam.position.copy(mapPose.current.pos); cam.quaternion.copy(mapPose.current.quat);
      return;
    }
    if (mode.current === 'flying') {
      f.t = Math.min(1, f.t + dt / FLIGHT_SECONDS);
      const e = f.t * f.t * (3 - 2 * f.t);
      // Rise then dive: keep altitude high in the middle of the flight.
      cam.position.lerpVectors(f.from.pos, f.to.pos, e);
      cam.quaternion.slerpQuaternions(f.from.quat, f.to.quat, e);
      if (f.t >= 1) mode.current = entrance ? 'walk' : 'map';
      return;
    }
    const k = keys.current;
    const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
    f.yaw += turn * 1.8 * dt;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK) * dt;
    const dir = new THREE.Vector3(-Math.sin(f.yaw), 0, -Math.cos(f.yaw));
    const right = new THREE.Vector3(-dir.z, 0, dir.x).negate();
    cam.position.addScaledVector(dir, fwd * speed).addScaledVector(right, -side * speed);
    cam.position.y = EYE;
    cam.quaternion.setFromEuler(new THREE.Euler(f.pitch, f.yaw, 0, 'YXZ'));
  });
  return null;
}
