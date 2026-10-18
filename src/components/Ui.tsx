import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile} from 'remotion';
import {C, FONT, POWER_NAME, Power} from '../theme';
import {FlagSvg} from './Flags';
import {Marker} from './WorldMap';
import {fadeInOut, easeOutCubic, clamp01} from '../lib/anim';

/* ---------- Flag that drops onto the map with a spring + shadow ---------- */
export const FlagDrop: React.FC<{lon: number; lat: number; power: Power; at: number; width?: number; label?: string}> = ({
  lon, lat, power, at, width = 54, label,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame - at;
  if (f < 0) return null;
  const s = spring({frame: f, fps, config: {damping: 14, stiffness: 160, mass: 0.9}});
  const scale = interpolate(s, [0, 1], [2.2, 1]);
  const y = interpolate(s, [0, 1], [-90, 0]);
  const shadowBlur = interpolate(s, [0, 1], [30, 6]);
  const op = clamp01(f / 6);
  const labelOp = interpolate(f, [8, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Marker lon={lon} lat={lat}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: op}}>
        <div
          style={{
            transform: `translateY(${y}px) scale(${scale})`,
            filter: `drop-shadow(0 ${8 + shadowBlur / 2}px ${shadowBlur}px rgba(0,0,0,0.6))`,
            border: '2px solid rgba(255,255,255,0.85)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <FlagSvg power={power} width={width} />
        </div>
        {label && (
          <div
            style={{
              marginTop: 6, opacity: labelOp, fontFamily: FONT.label, fontWeight: 600, fontSize: 22,
              letterSpacing: 2, color: C.white, textShadow: '0 2px 6px rgba(0,0,0,0.9)', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

/* ---------- Map label (place / region) ---------- */
export const MapLabel: React.FC<{
  lon: number; lat: number; text: string; at: number; size?: number; kind?: 'city' | 'region' | 'sea'; until?: number;
}> = ({lon, lat, text, at, size = 26, kind = 'city', until}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  if (until !== undefined && frame > until) return null;
  const op = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'}) * (until ? fadeInOut(f, until - at, 12, 12) : 1);
  const ty = interpolate(easeOutCubic(clamp01(f / 14)), [0, 1], [10, 0]);
  const base: React.CSSProperties = {
    opacity: op, transform: `translateY(${ty}px)`, whiteSpace: 'nowrap',
    textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)',
  };
  if (kind === 'city')
    return (
      <Marker lon={lon} lat={lat}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, ...base}}>
          <div style={{width: 9, height: 9, borderRadius: 5, background: C.white, boxShadow: '0 0 0 3px rgba(0,0,0,0.45)'}} />
          <span style={{fontFamily: FONT.label, fontSize: size, color: C.white, letterSpacing: 1}}>{text}</span>
        </div>
      </Marker>
    );
  return (
    <Marker lon={lon} lat={lat}>
      <div
        style={{
          ...base, fontFamily: FONT.label, fontWeight: kind === 'region' ? 700 : 400, fontSize: size,
          letterSpacing: kind === 'region' ? 6 : 4, color: kind === 'region' ? 'rgba(255,255,255,0.92)' : 'rgba(200,225,255,0.8)',
          fontStyle: kind === 'sea' ? 'italic' : 'normal', textTransform: 'uppercase',
        }}
      >
        {text}
      </div>
    </Marker>
  );
};

/* ---------- Year badge (top-right, always on) ---------- */
export const YearBadge: React.FC<{year: string}> = ({year}) => (
  <div
    style={{
      position: 'absolute', top: 44, right: 64, fontFamily: FONT.title, fontSize: 54, fontWeight: 700,
      color: C.white, letterSpacing: 4, textShadow: '0 2px 10px rgba(0,0,0,0.9)',
    }}
  >
    {year}
  </div>
);

/* ---------- Lower-third caption bar ---------- */
export const Caption: React.FC<{text: string; sub?: string; at: number; until: number}> = ({text, sub, at, until}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const op = fadeInOut(f, until - at, 10, 12);
  const w = interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 96, bottom: 96, opacity: op}}>
      <div style={{height: 4, width: `${w * 100}%`, background: C.gold, marginBottom: 10, minWidth: 2}} />
      <div style={{fontFamily: FONT.label, fontWeight: 700, fontSize: 40, letterSpacing: 3, color: C.white, textShadow: '0 2px 8px rgba(0,0,0,0.9)', textTransform: 'uppercase'}}>
        {text}
      </div>
      {sub && <div style={{fontFamily: FONT.label, fontSize: 28, letterSpacing: 2, color: C.gold, marginTop: 2}}>{sub}</div>}
    </div>
  );
};

/* ---------- Archive photo in a framed card with Ken Burns ---------- */
export const ArchiveFrame: React.FC<{
  src: string; caption?: string; at: number; until: number;
  x?: number; y?: number; w?: number; h?: number; from?: 'left' | 'right' | 'bottom';
  zoom?: number; sepia?: number;
}> = ({src, caption, at, until, x = 1080, y = 150, w = 720, h = 540, from = 'right', zoom = 1.12, sepia = 0.35}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 14, 14);
  const e = easeOutCubic(clamp01(f / 24));
  const dx = from === 'left' ? -60 * (1 - e) : from === 'right' ? 60 * (1 - e) : 0;
  const dy = from === 'bottom' ? 60 * (1 - e) : 0;
  const kb = 1 + (zoom - 1) * (f / len);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, opacity: op,
        transform: `translate(${dx}px,${dy}px)`,
        background: '#0d0b09', padding: 10,
        boxShadow: '0 30px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.25)',
      }}
    >
      <div style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: '#000'}}>
        <Img
          src={src.startsWith('http') ? src : staticFile(src)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: `scale(${kb})`, transformOrigin: '50% 40%',
            filter: `sepia(${sepia}) contrast(1.05) saturate(0.9)`,
          }}
        />
        <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.65)'}} />
      </div>
      {caption && (
        <div
          style={{
            position: 'absolute', left: 10, right: 10, bottom: 10, padding: '10px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0))',
            fontFamily: FONT.label, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: C.white, textTransform: 'uppercase',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};

/* ---------- Quote card: typewriter on black ---------- */
export const QuoteCard: React.FC<{text: string; author: string; source: string; at: number; until: number}> = ({
  text, author, source, at, until,
}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 10, 18);
  const chars = Math.floor(interpolate(f, [8, Math.min(len - 60, 8 + text.length * 1.1)], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const shown = text.slice(0, chars);
  const metaOp = interpolate(f, [len - 110, len - 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#070605', opacity: op, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 1240, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.type, fontSize: 34, lineHeight: 1.65, color: '#d8cfbd', letterSpacing: 1.5, textTransform: 'uppercase', minHeight: 170}}>
          {shown}
          <span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0}}>▌</span>
        </div>
        <div style={{marginTop: 48, opacity: metaOp, fontFamily: FONT.type, fontSize: 26, color: '#a8a08f', letterSpacing: 3}}>
          {author.toUpperCase()}
          <div style={{fontSize: 22, marginTop: 8, fontStyle: 'italic', letterSpacing: 2}}>{source}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Legend chip for a power ---------- */
export const PowerChip: React.FC<{power: Power; at: number; index: number}> = ({power, at, index}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  const op = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const tx = interpolate(easeOutCubic(clamp01(f / 16)), [0, 1], [-30, 0]);
  return (
    <div style={{position: 'absolute', left: 72, top: 60 + index * 58, opacity: op, transform: `translateX(${tx}px)`, display: 'flex', alignItems: 'center', gap: 12}}>
      <div style={{border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 10px rgba(0,0,0,0.6)'}}>
        <FlagSvg power={power} width={48} />
      </div>
      <div style={{fontFamily: FONT.label, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: C.white, textShadow: '0 2px 6px rgba(0,0,0,0.9)'}}>
        {POWER_NAME[power]}
      </div>
    </div>
  );
};

/* ---------- Big title card ---------- */
export const TitleCard: React.FC<{title: string; sub: string; at: number; until: number}> = ({title, sub, at, until}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 18, 24);
  const e = easeOutCubic(clamp01(f / 40));
  const spread = interpolate(e, [0, 1], [18, 8]);
  const lineW = interpolate(easeOutCubic(clamp01((f - 20) / 40)), [0, 1], [0, 520]);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: op}}>
      <div style={{textAlign: 'center', filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.9))'}}>
        <div style={{fontFamily: FONT.title, fontWeight: 700, fontSize: 112, color: C.white, letterSpacing: spread}}>{title}</div>
        <div style={{height: 3, width: lineW, background: C.gold, margin: '18px auto'}} />
        <div style={{fontFamily: FONT.label, fontSize: 40, color: C.gold, letterSpacing: 10, textTransform: 'uppercase'}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Film grain + letterbox polish ---------- */
export const Grain: React.FC<{amount?: number}> = ({amount = 0.08}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: amount}}>
      <svg width="100%" height="100%">
        <filter id={`g${frame % 7}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 7} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame % 7})`} />
      </svg>
    </AbsoluteFill>
  );
};
