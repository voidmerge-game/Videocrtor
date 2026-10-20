// Knowledgia-style parchment scroll card (lighter than the reference: title, one image, caption, ≤3 facts).
// Screen-space (not map-anchored). Slides in from the right with a spring, slight tilt, drop shadow.
import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type CardSpec = {
  title: string;
  image: string; // staticFile path
  caption: string;
  facts: [string, string][]; // [label, value]
  from: number;
  to: number;
  side: 'left' | 'right';
};

const ROLLER = 'linear-gradient(180deg, #8a5a2b 0%, #5a3a1e 55%, #2e1b0c 100%)';
const PARCH = 'linear-gradient(180deg, #f1e6c8 0%, #e9dcb9 50%, #e2d2ad 100%)';

export const Card: React.FC<{spec: CardSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (frame < spec.from || frame > spec.to) return null;
  const S = width / 1920;
  const enter = spring({frame: frame - spec.from, fps, config: {damping: 14, stiffness: 110, mass: 1}});
  const exitT = interpolate(frame, [spec.to - 12, spec.to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const W = 500 * S, H = 640 * S;
  const margin = 70 * S;
  const x0 = spec.side === 'right' ? width - W - margin : margin;
  const offX = (spec.side === 'right' ? 1 : -1) * (1 - enter) * (W + margin + 40 * S);
  const tilt = (spec.side === 'right' ? -1 : 1) * 2.5;
  const alpha = Math.min(1, enter * 2) * (1 - exitT);
  const y0 = (height - H) / 2 + 10 * S;

  return (
    <div style={{position: 'absolute', left: x0 + offX + exitT * (spec.side === 'right' ? 60 * S : -60 * S), top: y0, width: W, height: H, opacity: alpha, transform: `perspective(${1600 * S}px) rotateY(${tilt * 2}deg) rotate(${tilt * 0.3}deg)`, pointerEvents: 'none'}}>
      {/* shadow on the map */}
      <div style={{position: 'absolute', left: 14 * S, top: 22 * S, width: W, height: H, background: 'rgba(0,0,0,0.35)', filter: `blur(${10 * S}px)`, borderRadius: 6 * S}} />
      {/* parchment */}
      <div style={{position: 'absolute', left: 16 * S, top: 14 * S, width: W - 32 * S, height: H - 28 * S, background: PARCH, boxShadow: 'inset 0 0 40px rgba(120,90,40,0.35)', border: `${1.2 * S}px solid #b89a63`}}>
        <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 2px, rgba(0,0,0,0.025) 2px 5px)', mixBlendMode: 'multiply'}} />
        <div style={{position: 'absolute', left: 30 * S, right: 30 * S, top: 26 * S, textAlign: 'center', fontFamily: 'UnifrakturMaguntia', fontSize: 36 * S, color: '#2b1d0e', lineHeight: 1.05}}>{spec.title}</div>
        <div style={{position: 'absolute', left: 36 * S, right: 36 * S, top: 92 * S, height: 250 * S, border: `${3 * S}px solid #6b4a1e`, boxShadow: `0 ${3 * S}px ${8 * S}px rgba(0,0,0,0.35)`, overflow: 'hidden', background: '#2a2018'}}>
          <Img src={staticFile(spec.image)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
        <div style={{position: 'absolute', left: 36 * S, right: 36 * S, top: 350 * S, textAlign: 'center', fontFamily: 'EB Garamond', fontStyle: 'italic', fontWeight: 600, fontSize: 15 * S, color: '#5a4530'}}>{spec.caption}</div>
        <div style={{position: 'absolute', left: 40 * S, right: 40 * S, top: 392 * S}}>
          {spec.facts.map(([k, v], i) => (
            <div key={i} style={{marginBottom: 16 * S, fontFamily: 'EB Garamond', fontSize: 21 * S, lineHeight: 1.25, color: '#2b1d0e'}}>
              <span style={{fontWeight: 800}}>{k}: </span>
              <span style={{fontWeight: 600}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      {/* rollers */}
      {[0, 1].map((i) => (
        <div key={i} style={{position: 'absolute', left: 0, top: i === 0 ? 0 : H - 26 * S, width: W, height: 26 * S, background: ROLLER, borderRadius: 13 * S, boxShadow: `0 ${3 * S}px ${6 * S}px rgba(0,0,0,0.5)`}}>
          <div style={{position: 'absolute', left: 6 * S, right: 6 * S, top: 4 * S, height: 6 * S, borderRadius: 3 * S, background: 'rgba(255,220,160,0.35)'}} />
          {[0, 1].map((j) => (
            <div key={j} style={{position: 'absolute', top: -4 * S, left: j === 0 ? -8 * S : W - 14 * S, width: 22 * S, height: 34 * S, borderRadius: 11 * S, background: 'radial-gradient(circle at 40% 35%, #c9a05a 0%, #8a5a2b 45%, #3a240f 100%)', boxShadow: `0 ${2 * S}px ${4 * S}px rgba(0,0,0,0.5)`}} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** small parchment year tag with rollers (reference: "1415" bottom-left) */
export const YearTag: React.FC<{year: string; from: number}> = ({year, from}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (frame < from) return null;
  const S = width / 1920;
  const enter = spring({frame: frame - from, fps, config: {damping: 12, stiffness: 140}});
  const W = 150 * S, H = 54 * S;
  return (
    <div style={{position: 'absolute', left: 70 * S, top: height - H - 60 * S, width: W, height: H, opacity: Math.min(1, enter * 2), transform: `scale(${interpolate(enter, [0, 1], [0.6, 1])})`, transformOrigin: '0 100%', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 10 * S, top: 8 * S, width: W - 20 * S, height: H - 16 * S, background: PARCH, border: `${1 * S}px solid #b89a63`, boxShadow: `0 ${3 * S}px ${6 * S}px rgba(0,0,0,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'EB Garamond', fontWeight: 800, fontSize: 26 * S, color: '#2b1d0e', letterSpacing: 2 * S}}>
        {year}
      </div>
      {[0, 1].map((i) => (
        <div key={i} style={{position: 'absolute', top: 0, left: i === 0 ? 0 : W - 14 * S, width: 14 * S, height: H, borderRadius: 7 * S, background: 'linear-gradient(90deg, #8a5a2b 0%, #5a3a1e 55%, #2e1b0c 100%)', boxShadow: `0 ${2 * S}px ${4 * S}px rgba(0,0,0,0.5)`}} />
      ))}
    </div>
  );
};
