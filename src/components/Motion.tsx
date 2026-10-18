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

/* ---------- Big region label (printed on the map: dark on light terrain, white on dark fills) ---------- */
export const BigLabel: React.FC<{
  lon: number; lat: number; text: string; at: number; until?: number; size?: number; rot?: number; tone?: 'dark' | 'light'; minScale?: number;
}> = ({lon, lat, text, at, until, size = 60, rot = 0, tone = 'dark', minScale = 0}) => {
  const frame = useCurrentFrame();
  const {cam} = useMap();
  const f = frame - at;
  if (f < 0 || (until !== undefined && frame > until) || cam.scale < minScale) return null;
  const op = until !== undefined ? fadeIO(f, until - at, 14, 14) : clamp01(f / 14);
  // label grows with zoom so it sits on the land like print
  const k = 1.5 * Math.pow(cam.scale / 2400, 0.6);
  const light = tone === 'light';
  return (
    <Marker lon={lon} lat={lat}>
      <div
        style={{
          opacity: op, transform: `rotate(${rot}deg) scale(${k})`, transformOrigin: '50% 50%', whiteSpace: 'nowrap',
          fontFamily: FONT.map, fontWeight: 600, fontSize: size, letterSpacing: size * 0.06, textTransform: 'uppercase',
          color: light ? 'rgba(255,255,255,0.96)' : 'rgba(32,24,20,0.92)',
          textShadow: light
            ? '0 2px 3px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.45)'
            : '0 1px 0 rgba(255,255,255,0.35), 0 0 14px rgba(255,235,220,0.45)',
          paddingLeft: size * 0.06,
        }}
      >
        {text}
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
        <div style={{width: dot, height: dot, borderRadius: capital ? 1 : dot, background: '#fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.6)', border: capital ? '2.5px solid #111' : undefined, boxSizing: 'border-box'}} />
        <div style={{position: 'absolute', whiteSpace: 'nowrap', fontFamily: FONT.map, fontSize: capital ? 24 : 21, letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase', textShadow: '0 1px 2px #000, 0 0 8px rgba(0,0,0,0.9)', fontWeight: capital ? 700 : 600, ...pos}}>
          {name}
        </div>
      </div>
    </Marker>
  );
};

/* ---------- Callout: black box + big arrow pointing at the place ---------- */
export const Callout: React.FC<{
  lon: number; lat: number; text: string; sub?: string; at: number; until: number;
  /** offset of the box centre from the point, in px (default: straight above) */
  dx?: number; dy?: number;
}> = ({lon, lat, text, sub, at, until, dx = 0, dy = -230}) => {
  const frame = useCurrentFrame();
  const {projection, visible} = useMap();
  if (frame < at || frame > until || !visible(lon, lat)) return null;
  const p = projection([lon, lat]);
  if (!p) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 8, 12);
  const pop = easeOutCubic(clamp01(f / 14));
  const grow = easeOutCubic(clamp01((f - 6) / 14));
  const [x, y] = p;
  const boxHalfW = 60 + 12 * Math.max(text.length, (sub ?? '').length * 0.8);
  let bx = x + dx, by = y + dy;
  if (by < 110) by = y - dy;          // keep the box on screen: flip below the point
  if (bx < boxHalfW + 40) bx = boxHalfW + 40; else if (bx > W - boxHalfW - 40) bx = W - boxHalfW - 40;
  // arrow from the box edge to the point
  const ang = Math.atan2(y - by, x - bx);
  const boxH = sub ? 128 : 78;
  const startDist = boxH / 2 + 4;
  const sx = bx + Math.cos(ang) * startDist, sy = by + Math.sin(ang) * startDist;
  const full = Math.hypot(x - sx, y - sy);
  const len = Math.max(0, (full - 10) * grow);
  const shaft = 28, headW = 86, headL = 74;
  const tipX = sx + Math.cos(ang) * len, tipY = sy + Math.sin(ang) * len;
  const baseL = Math.max(0, len - headL);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const P = (dAlong: number, dSide: number) => `${(sx + Math.cos(ang) * dAlong + nx * dSide).toFixed(1)},${(sy + Math.sin(ang) * dAlong + ny * dSide).toFixed(1)}`;
  const poly = `${P(0, -shaft / 2)} ${P(baseL, -shaft / 2)} ${P(baseL, -headW / 2)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${P(baseL, headW / 2)} ${P(baseL, shaft / 2)} ${P(0, shaft / 2)}`;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {len > 4 && (
          <g style={{filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.55))'}}>
            <polygon points={poly} fill="#0a0a0a" stroke="#ffffff" strokeWidth={3} strokeLinejoin="round" />
          </g>
        )}
        <circle cx={x} cy={y} r={6} fill="#fff" stroke="#000" strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: 'absolute', left: bx, top: by, transform: `translate(-50%,-50%) scale(${0.8 + 0.2 * pop})`, opacity: pop,
          background: '#0a0a0a', padding: sub ? '12px 26px 10px' : '12px 26px', boxShadow: '0 12px 30px rgba(0,0,0,0.6)', whiteSpace: 'nowrap', textAlign: 'center',
        }}
      >
        <div style={{fontFamily: FONT.map, fontWeight: 700, fontSize: 42, letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase', lineHeight: 1.15}}>{text}</div>
        {sub && <div style={{fontFamily: FONT.map, fontWeight: 600, fontSize: 34, letterSpacing: 1, color: '#fff', textTransform: 'uppercase', lineHeight: 1.2, marginTop: 2}}>{sub}</div>}
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
