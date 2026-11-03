import { useEffect, useMemo, useRef } from 'react';
import type { ParkData } from './types';
import type { PlayerState } from './player';
import type { Terrain } from './terrain';
import { paintGround } from './groundTexture';
import { theme } from './theme';
import { parkAxis } from './parkAxis';

const HEIGHT = 380; // CSS pixels tall
const MARGIN_M = 150; // around the official boundary
const ZOOM_STEP = 1.6, MAX_ZOOM = 8; // zoom 1 = the entire park
const MAX_BASE_PX = 25e6; // keep the prebuilt map image a sane size

/** Map of the park standing upright with you on it; zoomed in, it follows you. */
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

  // The park stands upright: its long axis points up the screen, like the pick-an-entrance map.
  // `along` runs up the screen, `side` to the right; the extent is the official boundary plus a margin.
  const frame = useMemo(() => {
    const { x: ax, z: az } = parkAxis(data);
    const sx = -az, sz = ax; // screen-right
    const along = data.boundary.flat().map(([x, z]) => x * ax + z * az), side = data.boundary.flat().map(([x, z]) => x * sx + z * sz);
    const a0 = Math.min(...along) - MARGIN_M, a1 = Math.max(...along) + MARGIN_M;
    const s0 = Math.min(...side) - MARGIN_M, s1 = Math.max(...side) + MARGIN_M;
    return { ax, az, sx, sz, a0, a1, s0, s1, angle: Math.atan2(-ax, -az) }; // angle: canvas rotation that puts the axis up
  }, [data]);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    const g = cv.getContext('2d')!;
    const width = Math.round(HEIGHT * (frame.s1 - frame.s0) / (frame.a1 - frame.a0));
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
    const drawMap = (p: PlayerState) => {
      const { c } = base, fz = level.current, { ax, az, sx, sz, a0, a1, s0, s1, angle } = frame;
      const ws = (s1 - s0) / fz, ha = (a1 - a0) / fz, k = cv.width / ws; // k: device pixels per metre
      // Zoomed in, the window follows the player but never leaves the park's extent.
      const cs = Math.min(s1 - ws / 2, Math.max(s0 + ws / 2, p.x * sx + p.z * sz));
      const ca = Math.min(a1 - ha / 2, Math.max(a0 + ha / 2, p.x * ax + p.z * az));
      const cx = cs * sx + ca * ax, cz = cs * sz + ca * az; // world point at the middle of the map
      g.fillStyle = theme.city; g.fillRect(0, 0, cv.width, cv.height);
      g.save();
      g.translate(cv.width / 2, cv.height / 2); g.rotate(angle); g.scale(k, k); g.translate(-cx, -cz);
      g.drawImage(c, terrain.minX, terrain.minZ, terrain.maxX - terrain.minX, terrain.maxZ - terrain.minZ);
      for (const e of data.entrances) {
        g.fillStyle = e.verified ? theme.marker : theme.markerHover;
        g.strokeStyle = '#fff'; g.lineWidth = 1.5 * dpr / k;
        g.beginPath(); g.arc(e.x, e.z, 4 * dpr / k, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();

      // You, in screen space: the map is turned by `angle`, so are the directions.
      const dx = p.x - cx, dz = p.z - cz;
      const px = cv.width / 2 + k * (dx * Math.cos(angle) - dz * Math.sin(angle)), pz = cv.height / 2 + k * (dx * Math.sin(angle) + dz * Math.cos(angle));
      // The camera's field of view as a wedge, so turning the camera shows up live.
      const reach = 46 * dpr, half = 0.66; // about 76 degrees wide
      g.fillStyle = 'rgba(43,102,217,.28)';
      g.beginPath(); g.moveTo(px, pz); g.arc(px, pz, reach, -Math.PI / 2 + angle - p.view - half, -Math.PI / 2 + angle - p.view + half); g.closePath(); g.fill();
      arrow(px, pz, angle - p.heading);

      // Compass: real north, which is no longer straight up.
      const ox = 26 * dpr, oy = 28 * dpr, nx = ox + Math.sin(angle) * 16 * dpr, ny = oy - Math.cos(angle) * 16 * dpr;
      g.strokeStyle = '#222'; g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(nx, ny); g.stroke();
      g.fillStyle = '#222'; g.font = `bold ${12 * dpr}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('N', ox + Math.sin(angle) * 26 * dpr, oy - Math.cos(angle) * 26 * dpr);
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
  }, [base, frame, data, terrain, player]);

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
