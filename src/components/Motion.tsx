/** Motion-graphics layer in the style of broadcast history documentaries:
 *  - BigLabel: large, letter-spaced, optionally rotated region names ("F R A N C E")
 *  - Callout: black plate with white caps + animated pointer line to a map point
 *  - Route: animated great-circle arrow (expeditions, campaigns, fleets)
 *  - City: dot + small label, only shown when the camera is close enough
 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {geoInterpolate} from 'd3-geo';
import {useMap, Marker} from './WorldMap';
import {FONT, C, W, H} from '../theme';
import {clamp01, easeOutCubic} from '../lib/anim';

const fadeIO = (f: number, len: number, a = 10, b = 12) => Math.min(clamp01(f / a), clamp01((len - f) / b));

/* ---------- Big region label ---------- */
export const BigLabel: React.FC<{
  lon: number; lat: number; text: string; at: number; until?: number; size?: number; rot?: number; color?: string; minScale?: number;
}> = ({lon, lat, text, at, until, size = 60, rot = 0, color = 'rgba(255,255,255,0.95)', minScale = 0}) => {
  const frame = useCurrentFrame();
  const {cam} = useMap();
  const f = frame - at;
  if (f < 0 || (until !== undefined && frame > until) || cam.scale < minScale) return null;
  const op = until !== undefined ? fadeIO(f, until - at, 14, 14) : clamp01(f / 14);
  // keep label size roughly proportional to zoom (so it sits on the land like print)
  const k = Math.pow(cam.scale / 1800, 0.55);
  const spaced = text.toUpperCase().split('').join('\u2009');
  return (
    <Marker lon={lon} lat={lat}>
      <div
        style={{
          opacity: op, transform: `rotate(${rot}deg) scale(${k})`, transformOrigin: '50% 50%', whiteSpace: 'nowrap',
          fontFamily: FONT.label, fontWeight: 700, fontSize: size, letterSpacing: size * 0.28, color,
          textShadow: '0 2px 2px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.9)',
          paddingLeft: size * 0.28, // optical centering for trailing letter-spacing
        }}
      >
        {spaced}
      </div>
    </Marker>
  );
};

/* ---------- City dot ---------- */
export const City: React.FC<{lon: number; lat: number; name: string; at: number; until?: number; minScale?: number; capital?: boolean; side?: 'r' | 'l' | 'b' | 't'}> = ({
  lon, lat, name, at, until, minScale = 1500, capital = false, side = 'r',
}) => {
  const frame = useCurrentFrame();
  const {cam} = useMap();
  if (frame < at || (until !== undefined && frame > until)) return null;
  const vis = clamp01((cam.scale - minScale) / 250);
  if (vis <= 0) return null;
  const op = vis * (until !== undefined ? fadeIO(frame - at, until - at, 10, 10) : clamp01((frame - at) / 10));
  const dot = capital ? 11 : 8;
  const pos: React.CSSProperties =
    side === 'r' ? {left: dot + 6, top: '50%', transform: 'translateY(-50%)'} :
    side === 'l' ? {right: dot + 6, top: '50%', transform: 'translateY(-50%)'} :
    side === 'b' ? {top: dot + 4, left: '50%', transform: 'translateX(-50%)'} : {bottom: dot + 4, left: '50%', transform: 'translateX(-50%)'};
  return (
    <Marker lon={lon} lat={lat}>
      <div style={{position: 'relative', width: dot, height: dot, opacity: op}}>
        <div style={{width: dot, height: dot, borderRadius: dot, background: '#fff', boxShadow: '0 0 0 2.5px rgba(0,0,0,0.75), 0 0 10px rgba(0,0,0,0.6)', border: capital ? '2px solid #111' : undefined, boxSizing: 'border-box'}} />
        <div style={{position: 'absolute', whiteSpace: 'nowrap', fontFamily: FONT.label, fontSize: capital ? 24 : 21, letterSpacing: 2, color: '#fff', textTransform: 'uppercase', textShadow: '0 1px 2px #000, 0 0 8px rgba(0,0,0,0.9)', fontWeight: capital ? 700 : 500, ...pos}}>
          {name}
        </div>
      </div>
    </Marker>
  );
};

/* ---------- Callout: black plate + pointer line ---------- */
export const Callout: React.FC<{
  lon: number; lat: number; text: string; sub?: string; at: number; until: number;
  /** offset of the plate from the point, in px */
  dx?: number; dy?: number;
}> = ({lon, lat, text, sub, at, until, dx = 140, dy = -120}) => {
  const frame = useCurrentFrame();
  const {projection, visible} = useMap();
  if (frame < at || frame > until || !visible(lon, lat)) return null;
  const p = projection([lon, lat]);
  if (!p) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 10, 12);
  const grow = easeOutCubic(clamp01(f / 16));
  const plate = clamp01((f - 8) / 12);
  const [x, y] = p;
  const ex = x + dx * grow, ey = y + dy * grow;
  const left = dx >= 0;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <line x1={x} y1={y} x2={ex} y2={ey} stroke="#000" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <circle cx={x} cy={y} r={7 * grow} fill="#fff" stroke="#000" strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: 'absolute', left: left ? ex : undefined, right: left ? undefined : W - ex, top: ey,
          transform: `translateY(-50%) scale(${0.9 + 0.1 * plate})`, transformOrigin: left ? 'left center' : 'right center', opacity: plate,
          background: 'rgba(8,8,8,0.92)', border: '1.5px solid rgba(255,255,255,0.85)', padding: '10px 18px 9px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
        }}
      >
        <div style={{fontFamily: FONT.label, fontWeight: 700, fontSize: 26, letterSpacing: 2.5, color: '#fff', textTransform: 'uppercase'}}>{text}</div>
        {sub && <div style={{fontFamily: FONT.label, fontSize: 20, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase', marginTop: 2}}>{sub}</div>}
      </div>
    </div>
  );
};

/* ---------- Animated route arrow along great circles ---------- */
export const Route: React.FC<{
  pts: [number, number][]; at: number; until: number; color?: string; width?: number; dashed?: boolean; drawDur?: number; head?: boolean;
}> = ({pts, at, until, color = '#ffffff', width = 5, dashed = false, drawDur = 45, head = true}) => {
  const frame = useCurrentFrame();
  const {projection, visible} = useMap();
  if (frame < at || frame > until || pts.length < 2) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 6, 14);
  const prog = easeOutCubic(clamp01(f / drawDur));
  // densify along great circles
  const dense: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const ip = geoInterpolate(pts[i], pts[i + 1]);
    const n = 24;
    for (let k = 0; k < n; k++) dense.push(ip(k / n));
  }
  dense.push(pts[pts.length - 1]);
  const total = dense.length - 1;
  const upto = Math.max(1, Math.floor(total * prog));
  const proj = dense.slice(0, upto + 1).filter((q) => visible(q[0], q[1])).map((q) => projection(q)).filter(Boolean) as [number, number][];
  if (proj.length < 2) return null;
  const d = proj.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  // arrow head direction from last two points
  const [ax, ay] = proj[proj.length - 1];
  const [bx, by] = proj[Math.max(0, proj.length - 4)];
  const ang = (Math.atan2(ay - by, ax - bx) * 180) / Math.PI;
  const hs = Math.max(20, width * 3.4);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={width + 10} strokeLinecap="round" strokeLinejoin="round" style={{filter: 'blur(4px)'}} />
      <path d={d} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth={width + 4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 3} ${width * 2.2}` : undefined} />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 3} ${width * 2.2}` : undefined} />
      {head && (
        <g transform={`translate(${ax},${ay}) rotate(${ang})`}>
          <path d={`M${hs * 0.6},0 L${-hs * 0.9},${-hs * 0.75} L${-hs * 0.45},0 L${-hs * 0.9},${hs * 0.75} Z`} fill={color} stroke="rgba(0,0,0,0.8)" strokeWidth={2} strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
};

/* ---------- Pulse marker (battle / event) ---------- */
export const Pulse: React.FC<{lon: number; lat: number; at: number; until: number; color?: string}> = ({lon, lat, at, until, color = '#ff5a3c'}) => {
  const frame = useCurrentFrame();
  const {projection, visible} = useMap();
  if (frame < at || frame > until || !visible(lon, lat)) return null;
  const p = projection([lon, lat]);
  if (!p) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 6, 12);
  const rings = [0, 14, 28].map((o) => ((f + o) % 42) / 42);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      {rings.map((r, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={6 + r * 44} fill="none" stroke={color} strokeWidth={3 * (1 - r) + 0.5} opacity={1 - r} />
      ))}
      <circle cx={p[0]} cy={p[1]} r={7} fill={color} stroke="#000" strokeWidth={2} />
    </svg>
  );
};
