// Knowledgia-style "signpost": wooden post + crossbar + name plate (+crown) + hanging banner with a portrait.
// Anchored to a projected map point (screen px). Drops in with a spring, sways, settles; casts a soft shadow.
import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type SignpostSpec = {
  kind: 'signpost';
  id: string;
  lng: number;
  lat: number;
  name: string; // plate text, e.g. "KING BÉLA IV\nOF HUNGARY"
  portrait: string; // staticFile path, e.g. 'mongols/portraits/bela4.jpg'
  crown: boolean;
  from: number; // first frame (enter)
  to: number; // last frame (exit)
  cloth: string; // banner colour
};

const WOOD = 'linear-gradient(90deg, #3d2712 0%, #7a4f26 35%, #a6743a 50%, #7a4f26 70%, #3d2712 100%)';
const WOOD_H = 'linear-gradient(180deg, #8a5a2b 0%, #5a3a1e 60%, #2e1b0c 100%)';

export const Crown: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 100 70" style={{display: 'block', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))'}}>
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9a3" />
        <stop offset="0.5" stopColor="#e0b43a" />
        <stop offset="1" stopColor="#9a6d12" />
      </linearGradient>
    </defs>
    <path d="M8 62 L4 22 L30 40 L50 6 L70 40 L96 22 L92 62 Z" fill="url(#gold)" stroke="#6b4a0a" strokeWidth="3" strokeLinejoin="round" />
    <rect x="8" y="56" width="84" height="12" rx="3" fill="#c9962a" stroke="#6b4a0a" strokeWidth="3" />
    <circle cx="50" cy="8" r="5" fill="#d63a3a" stroke="#6b4a0a" strokeWidth="2" />
    <circle cx="4" cy="22" r="4.5" fill="#3a73d6" stroke="#6b4a0a" strokeWidth="2" />
    <circle cx="96" cy="22" r="4.5" fill="#3a73d6" stroke="#6b4a0a" strokeWidth="2" />
    <circle cx="30" cy="62" r="3" fill="#d63a3a" />
    <circle cx="50" cy="62" r="3" fill="#2f9e5a" />
    <circle cx="70" cy="62" r="3" fill="#d63a3a" />
  </svg>
);

export const Signpost: React.FC<{spec: SignpostSpec; x: number; y: number; scale: number}> = ({spec, x, y, scale}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < spec.from || frame > spec.to) return null;

  // enter: drop from above with overshoot
  const enter = spring({frame: frame - spec.from, fps, config: {damping: 11, stiffness: 150, mass: 0.9}});
  // exit: quick shrink + fade over 10 frames
  const exitT = interpolate(frame, [spec.to - 10, spec.to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dropY = interpolate(enter, [0, 1], [-420, 0]);
  const sc = interpolate(enter, [0, 1], [0.7, 1]) * (1 - exitT * 0.5);
  const alpha = Math.min(1, enter * 2) * (1 - exitT);
  // sway after landing (decaying)
  const tl = Math.max(0, frame - spec.from - 8) / fps;
  const sway = Math.sin(tl * 7) * 4 * Math.exp(-tl * 1.6);

  const S = scale; // px multiplier
  const postH = 200 * S, postW = 9 * S;
  const barW = 150 * S, barH = 12 * S;
  const plateW = 126 * S, plateH = 38 * S;
  const bannerW = 104 * S, bannerH = 132 * S;

  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, opacity: alpha, pointerEvents: 'none'}}>
      {/* ground shadow (light from upper-left → shadow to lower-right) */}
      <div
        style={{
          position: 'absolute', left: -18 * S, top: -10 * S, width: 36 * S, height: 16 * S, borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)', filter: `blur(${4 * S}px)`, transform: `scale(${sc})`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: -2 * S, top: -postH * 0.26, width: bannerW * 0.62, height: postH * 0.26, transformOrigin: '0 100%',
          transform: `scale(${sc}) skewX(-55deg)`, background: 'rgba(0,0,0,0.17)', filter: `blur(${5 * S}px)`,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        }}
      />
      {/* the post + everything above it; origin at the ground point */}
      <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translateY(${dropY * S}px) scale(${sc}) rotate(${sway}deg)`}}>
        {/* pole */}
        <div style={{position: 'absolute', left: -postW / 2, top: -postH, width: postW, height: postH, background: WOOD, borderRadius: postW / 2, boxShadow: `${2 * S}px 0 ${3 * S}px rgba(0,0,0,0.35)`}} />
        {/* crossbar (top) */}
        <div style={{position: 'absolute', left: -barW / 2, top: -postH, width: barW, height: barH, background: WOOD_H, borderRadius: 3 * S, boxShadow: `0 ${2 * S}px ${3 * S}px rgba(0,0,0,0.45)`}} />
        {/* crown */}
        {spec.crown && (
          <div style={{position: 'absolute', left: -22 * S, top: -postH - 30 * S}}>
            <Crown size={44 * S} />
          </div>
        )}
        {/* name plate */}
        <div
          style={{
            position: 'absolute', left: -plateW / 2, top: -postH + barH + 2 * S, width: plateW, height: plateH,
            background: 'linear-gradient(180deg, #f3e9cf 0%, #e2d2ad 100%)', border: `${1.5 * S}px solid #4a3418`, borderRadius: 3 * S,
            boxShadow: `0 ${2 * S}px ${3 * S}px rgba(0,0,0,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: 13 * S, lineHeight: 1.05, color: '#2b1d0e', textAlign: 'center',
            letterSpacing: 0.5 * S, whiteSpace: 'pre-line', textTransform: 'uppercase',
          }}
        >
          {spec.name}
        </div>
        {/* second crossbar */}
        <div style={{position: 'absolute', left: -barW / 2, top: -postH + barH + plateH + 6 * S, width: barW, height: barH, background: WOOD_H, borderRadius: 3 * S, boxShadow: `0 ${2 * S}px ${3 * S}px rgba(0,0,0,0.45)`}} />
        {/* banner cloth (swallow-tail) */}
        <div
          style={{
            position: 'absolute', left: -bannerW / 2, top: -postH + 2 * barH + plateH + 8 * S, width: bannerW, height: bannerH,
            background: `linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 18%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.35) 100%), ${spec.cloth}`,
            clipPath: 'polygon(0 0, 100% 0, 100% 86%, 82% 100%, 50% 90%, 18% 100%, 0 86%)',
            filter: `drop-shadow(0 ${3 * S}px ${3 * S}px rgba(0,0,0,0.5))`,
          }}
        >
          <div style={{position: 'absolute', left: 8 * S, top: 8 * S, width: bannerW - 16 * S, height: bannerH * 0.74, border: `${2 * S}px solid rgba(255,230,160,0.85)`, overflow: 'hidden', background: '#201812'}}>
            <Img src={staticFile(spec.portrait)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top'}} />
          </div>
        </div>
      </div>
    </div>
  );
};
