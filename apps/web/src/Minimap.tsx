import { useEffect, useMemo, useRef } from 'react';
import type { ParkData } from './types';
import type { PlayerState } from './player';
import type { Terrain } from './terrain';
import { paintGround } from './groundTexture';
import { theme } from './theme';

const SIZE = 180; // CSS pixels
const RADIUS_M = 150; // metres from the player to the edge of the map
const MAX_BASE_PX = 25e6; // keep the prebuilt map image a sane size

/** Round top-down map around the player; the camera's view direction is always up. */
export function Minimap({ data, terrain, player }: { data: ParkData; terrain: Terrain; player: React.RefObject<PlayerState> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  // One image for the whole park, drawn once: land use, then roads and paths on top.
  const base = useMemo(() => {
    const area = (terrain.maxX - terrain.minX) * (terrain.maxZ - terrain.minZ);
    const s = Math.min(1, Math.sqrt(MAX_BASE_PX / area));
    const c = paintGround(data, terrain, s);
    const g = c.getContext('2d')!;
    g.lineCap = g.lineJoin = 'round';
    const line = (pts: [number, number][], color: string, width: number) => {
      g.strokeStyle = color; g.lineWidth = width * s;
      g.beginPath();
      pts.forEach(([x, z], i) => { const px = (x - terrain.minX) * s, pz = (z - terrain.minZ) * s; i ? g.lineTo(px, pz) : g.moveTo(px, pz); });
      g.stroke();
    };
    for (const w of data.roads) line(w.p, theme.road, 7);
    for (const w of data.paths) line(w.p, theme.path, 2.5);
    return { c, s };
  }, [data, terrain]);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.height = SIZE * dpr;
    const g = cv.getContext('2d')!;
    const half = SIZE * dpr / 2, k = half / RADIUS_M; // device pixels per metre
    let raf = 0, last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const p = player.current;
      if (!p || now - last < 33) return; // about 30 fps is plenty
      last = now;
      cv.style.visibility = p.walking ? 'visible' : 'hidden';
      if (!p.walking) return;
      const { c, s } = base;
      g.clearRect(0, 0, cv.width, cv.height);
      g.save();
      g.beginPath(); g.arc(half, half, half, 0, Math.PI * 2); g.clip();
      g.fillStyle = theme.city; g.fillRect(0, 0, cv.width, cv.height);
      // World x east, z south; rotating by the camera yaw puts the view direction at the top.
      g.translate(half, half);
      g.rotate(p.view);
      g.drawImage(c, (p.x - terrain.minX - RADIUS_M) * s, (p.z - terrain.minZ - RADIUS_M) * s, 2 * RADIUS_M * s, 2 * RADIUS_M * s,
        -RADIUS_M * k, -RADIUS_M * k, 2 * RADIUS_M * k, 2 * RADIUS_M * k);
      for (const e of data.entrances) {
        const dx = (e.x - p.x) * k, dz = (e.z - p.z) * k;
        if (Math.hypot(dx, dz) > half) continue;
        g.fillStyle = e.verified ? theme.marker : theme.markerHover;
        g.strokeStyle = '#fff'; g.lineWidth = 1.5 * dpr;
        g.beginPath(); g.arc(dx, dz, 4 * dpr, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();

      // You: an arrow pointing the way your character faces, relative to the view.
      g.save();
      g.translate(half, half);
      g.rotate(p.view - p.heading);
      g.fillStyle = '#2b66d9'; g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(0, -9 * dpr); g.lineTo(6 * dpr, 7 * dpr); g.lineTo(0, 3 * dpr); g.lineTo(-6 * dpr, 7 * dpr); g.closePath();
      g.stroke(); g.fill();
      g.restore();

      // Where real north is on the rim.
      const r = half - 11 * dpr;
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath(); g.arc(half + Math.sin(p.view) * r, half - Math.cos(p.view) * r, 8 * dpr, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#222'; g.font = `bold ${11 * dpr}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('N', half + Math.sin(p.view) * r, half - Math.cos(p.view) * r + dpr * 0.5);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [base, data, terrain, player]);

  return <canvas ref={ref} style={{ position: 'absolute', left: 16, bottom: 16, width: SIZE, height: SIZE, borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,.3)', visibility: 'hidden' }} />;
}
