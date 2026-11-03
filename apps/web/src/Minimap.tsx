import { useEffect, useMemo, useRef } from 'react';
import type { ParkData } from './types';
import type { PlayerState } from './player';
import type { Terrain } from './terrain';
import { paintGround } from './groundTexture';
import { theme } from './theme';

const SIZE = 180; // CSS pixels, local view
const FULL_H = 380; // CSS pixels tall, whole-park view
const FULL_MARGIN_M = 150;
const RADIUS_M = 150; // default metres from the player to the edge of the map
const MIN_RADIUS_M = 50, MAX_RADIUS_M = 800, ZOOM_STEP = 1.6;
const MAX_BASE_PX = 25e6; // keep the prebuilt map image a sane size

/** Round top-down map around the player; the camera's view direction is always up. */
export function Minimap({ data, terrain, player }: { data: ParkData; terrain: Terrain; player: React.RefObject<PlayerState> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const full = useRef(false);
  const radius = useRef(RADIUS_M);
  const zoomBox = useRef<HTMLDivElement>(null);
  const zoom = (f: number) => { radius.current = Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, radius.current * f)); };

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

  // Whole park, north up: the official boundary's extent plus a margin.
  const bounds = useMemo(() => {
    const pts = data.boundary.flat();
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) - FULL_MARGIN_M, x1 = Math.max(...xs) + FULL_MARGIN_M;
    const z0 = Math.min(...zs) - FULL_MARGIN_M, z1 = Math.max(...zs) + FULL_MARGIN_M;
    return { x0, z0, w: x1 - x0, h: z1 - z0 };
  }, [data]);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    const g = cv.getContext('2d')!;
    const fullW = Math.round(FULL_H * bounds.w / bounds.h);
    let raf = 0, last = 0, shown = false;

    const layout = () => {
      const f = full.current;
      const w = f ? fullW : SIZE, h = f ? FULL_H : SIZE;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      cv.style.borderRadius = f ? '10px' : '50%';
      if (zoomBox.current) zoomBox.current.style.display = f ? 'none' : 'flex';
      cv.width = w * dpr; cv.height = h * dpr;
    };
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyM' && !e.repeat) { full.current = !full.current; layout(); } };
    const onClick = () => { full.current = !full.current; layout(); };
    window.addEventListener('keydown', onKey);
    cv.addEventListener('click', onClick);
    layout();

    const arrow = (x: number, y: number, angle: number) => {
      g.save();
      g.translate(x, y); g.rotate(angle);
      g.fillStyle = '#2b66d9'; g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(0, -9 * dpr); g.lineTo(6 * dpr, 7 * dpr); g.lineTo(0, 3 * dpr); g.lineTo(-6 * dpr, 7 * dpr); g.closePath();
      g.stroke(); g.fill();
      g.restore();
    };
    const dots = (toXY: (e: { x: number; z: number }) => [number, number], maxR: number) => {
      for (const e of data.entrances) {
        const [dx, dz] = toXY(e);
        if (Math.hypot(dx, dz) > maxR) continue;
        g.fillStyle = e.verified ? theme.marker : theme.markerHover;
        g.strokeStyle = '#fff'; g.lineWidth = 1.5 * dpr;
        g.beginPath(); g.arc(dx, dz, 4 * dpr, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    };

    const drawLocal = (p: PlayerState) => {
      const R = radius.current, half = cv.width / 2, k = half / R; // device pixels per metre
      const { c, s } = base;
      g.save();
      g.beginPath(); g.arc(half, half, half, 0, Math.PI * 2); g.clip();
      g.fillStyle = theme.city; g.fillRect(0, 0, cv.width, cv.height);
      // World x east, z south; rotating by the camera yaw puts the view direction at the top.
      g.translate(half, half);
      g.rotate(p.view);
      g.drawImage(c, (p.x - terrain.minX - R) * s, (p.z - terrain.minZ - R) * s, 2 * R * s, 2 * R * s,
        -R * k, -R * k, 2 * R * k, 2 * R * k);
      dots((e) => [(e.x - p.x) * k, (e.z - p.z) * k], half);
      g.restore();

      // You: an arrow pointing the way your character faces, relative to the view.
      arrow(half, half, p.view - p.heading);

      // Where real north is on the rim.
      const r = half - 11 * dpr, nx = half + Math.sin(p.view) * r, ny = half - Math.cos(p.view) * r;
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath(); g.arc(nx, ny, 8 * dpr, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#222'; g.font = `bold ${11 * dpr}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('N', nx, ny + dpr * 0.5);
    };

    const drawFull = (p: PlayerState) => {
      const { c, s } = base, k = cv.width / bounds.w; // device pixels per metre
      g.fillStyle = theme.city; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(c, (bounds.x0 - terrain.minX) * s, (bounds.z0 - terrain.minZ) * s, bounds.w * s, bounds.h * s, 0, 0, cv.width, cv.height);
      g.save();
      g.translate(-bounds.x0 * k, -bounds.z0 * k);
      dots((e) => [e.x * k, e.z * k], Infinity);
      g.restore();
      // North is up here, so the arrow turns by the character's heading alone.
      arrow((p.x - bounds.x0) * k, (p.z - bounds.z0) * k, -p.heading);
      g.fillStyle = '#222'; g.font = `bold ${12 * dpr}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText('N ↑', 8 * dpr, 6 * dpr);
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const p = player.current;
      if (!p || now - last < 33) return; // about 30 fps is plenty
      last = now;
      if (p.walking !== shown) { shown = p.walking; cv.style.visibility = shown ? 'visible' : 'hidden'; if (zoomBox.current) zoomBox.current.style.visibility = shown ? 'visible' : 'hidden'; }
      if (!p.walking) return;
      g.clearRect(0, 0, cv.width, cv.height);
      if (full.current) drawFull(p); else drawLocal(p);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      cv.removeEventListener('click', onClick);
    };
  }, [base, bounds, data, terrain, player]);

  const btn: React.CSSProperties = { width: 32, height: 32, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,.9)', boxShadow: '0 1px 4px rgba(0,0,0,.3)', fontSize: 20, lineHeight: '30px', cursor: 'pointer', padding: 0 };
  return (
    <>
      <canvas ref={ref} style={{ position: 'absolute', left: 16, bottom: 16, width: SIZE, height: SIZE, borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,.3)', visibility: 'hidden', cursor: 'pointer' }} title="Click or press M: whole park" />
      <div ref={zoomBox} style={{ position: 'absolute', left: SIZE + 30, bottom: 16, display: 'flex', flexDirection: 'column', gap: 6, visibility: 'hidden' }}>
        <button style={btn} onClick={() => zoom(1 / ZOOM_STEP)} title="Zoom the minimap in" aria-label="Zoom minimap in">+</button>
        <button style={btn} onClick={() => zoom(ZOOM_STEP)} title="Zoom the minimap out" aria-label="Zoom minimap out">−</button>
      </div>
    </>
  );
}
