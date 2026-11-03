import { useEffect, useMemo, useRef } from 'react';
import type { ParkData } from './types';
import type { PlayerState } from './player';
import type { Terrain } from './terrain';
import { paintGround } from './groundTexture';
import { theme } from './theme';

const HEIGHT = 380; // CSS pixels tall
const MARGIN_M = 150; // around the official boundary
const ZOOM_STEP = 1.6, MAX_ZOOM = 8; // zoom 1 = the entire park
const MAX_BASE_PX = 25e6; // keep the prebuilt map image a sane size

/** North-up map of the park with you on it. Zoomed in, it follows you. */
export function Minimap({ data, terrain, player }: { data: ParkData; terrain: Terrain; player: React.RefObject<PlayerState> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const level = useRef(1);
  const zoomBox = useRef<HTMLDivElement>(null);
  // f > 1 zooms out, f < 1 zooms in.
  const zoom = (f: number) => { level.current = Math.min(MAX_ZOOM, Math.max(1, level.current / f)); };

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

  // The official boundary's extent plus a margin.
  const bounds = useMemo(() => {
    const pts = data.boundary.flat();
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) - MARGIN_M, x1 = Math.max(...xs) + MARGIN_M;
    const z0 = Math.min(...zs) - MARGIN_M, z1 = Math.max(...zs) + MARGIN_M;
    return { x0, z0, w: x1 - x0, h: z1 - z0 };
  }, [data]);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    const g = cv.getContext('2d')!;
    const width = Math.round(HEIGHT * bounds.w / bounds.h);
    let raf = 0, last = 0, shown = false;
    cv.style.width = width + 'px'; cv.style.height = HEIGHT + 'px';
    cv.width = width * dpr; cv.height = HEIGHT * dpr;
    if (zoomBox.current) zoomBox.current.style.left = width + 30 + 'px';

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

    const drawMap = (p: PlayerState) => {
      const { c, s } = base, fz = level.current, w = bounds.w / fz, h = bounds.h / fz, k = cv.width / w; // k: device pixels per metre
      // Zoomed in, the window follows the player but never leaves the park's extent.
      const x0 = Math.min(bounds.x0 + bounds.w - w, Math.max(bounds.x0, p.x - w / 2));
      const z0 = Math.min(bounds.z0 + bounds.h - h, Math.max(bounds.z0, p.z - h / 2));
      g.fillStyle = theme.city; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(c, (x0 - terrain.minX) * s, (z0 - terrain.minZ) * s, w * s, h * s, 0, 0, cv.width, cv.height);
      g.save();
      g.translate(-x0 * k, -z0 * k);
      dots((e) => [e.x * k, e.z * k], Infinity);
      g.restore();
      // The camera's field of view as a wedge, so turning the camera shows up live. North is up, so its angle is -view.
      const px = (p.x - x0) * k, pz = (p.z - z0) * k, reach = 46 * dpr, half = 0.66; // about 76 degrees wide
      g.fillStyle = 'rgba(43,102,217,.28)';
      g.beginPath(); g.moveTo(px, pz); g.arc(px, pz, reach, -Math.PI / 2 - p.view - half, -Math.PI / 2 - p.view + half); g.closePath(); g.fill();
      // North is up, so the arrow turns by the character's heading alone.
      arrow((p.x - x0) * k, (p.z - z0) * k, -p.heading);
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
      drawMap(p);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [base, bounds, data, terrain, player]);

  const btn: React.CSSProperties = { width: 32, height: 32, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,.9)', boxShadow: '0 1px 4px rgba(0,0,0,.3)', fontSize: 20, lineHeight: '30px', cursor: 'pointer', padding: 0 };
  return (
    <>
      <canvas ref={ref} style={{ position: 'absolute', left: 16, bottom: 16, borderRadius: 10, border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,.3)', visibility: 'hidden' }} />
      <div ref={zoomBox} style={{ position: 'absolute', left: 200, bottom: 16, display: 'flex', flexDirection: 'column', gap: 6, visibility: 'hidden' }}>
        <button style={btn} onClick={() => zoom(1 / ZOOM_STEP)} title="Zoom the minimap in" aria-label="Zoom minimap in">+</button>
        <button style={btn} onClick={() => zoom(ZOOM_STEP)} title="Zoom the minimap out" aria-label="Zoom minimap out">−</button>
      </div>
    </>
  );
}
