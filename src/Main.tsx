import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {WorldMap, Layer} from './components/WorldMap';
import {useTopo} from './lib/geo';
import {camAt, prog, clamp01, easeOutCubic} from './lib/anim';
import {C, FONT, Power} from './theme';
import {FlagDrop, MapLabel, YearBadge, TitleCard, Grain, WallArchive, QuoteCard, CardPop} from './components/Ui';
import {ensureFonts} from './lib/fonts';
import {PARAS, TOTAL, FIRST_VO, COLD_OPEN, END_VO, OUTRO, T, E, P, voActive} from './timeline';
import {OWNER_1880, OWNER_1914, AFRICA_1914, acqOf, FLAGS, LABELS, ARCHIVE, QUOTES, yearAt, CAM4, SFX, MUSIC, BIG, CITIES, CALLOUTS, ROUTES, PULSES, LIGHT_LABELS, FLAGS_EXTRA} from './events';
import {BigLabel, City, Callout, Route, Pulse, LabelGuard} from './components/Motion';

export const MAIN_DURATION_SEC = TOTAL;

// African states shown on the 1870 map (only the major, named polities — keeps the map legible)
const STATES_1870 = new Set(['Sokoto Caliphate', 'Ethiopia', 'Zululand', 'Asante', 'Buganda', 'Morocco', 'Egypt', 'Sultanate of Zanzibar',
  'Dahomey', 'Imerina', 'Transvaal', 'Orange Free State', 'Liberia']);
const STATE_FILL: Record<string, string> = {
  'Sokoto Caliphate': 'rgba(120,150,90,0.55)', Ethiopia: 'rgba(170,110,70,0.55)', Zululand: 'rgba(150,80,70,0.55)', Asante: 'rgba(170,140,60,0.55)',
  Buganda: 'rgba(100,130,150,0.5)', Morocco: 'rgba(150,100,90,0.5)', 'Sultanate of Zanzibar': 'rgba(120,100,140,0.5)', Dahomey: 'rgba(160,120,90,0.5)',
  'Kanem-Bornu': 'rgba(110,120,150,0.45)', 'Wadai Empire': 'rgba(150,130,100,0.45)', 'Tukular Caliphate': 'rgba(130,140,110,0.5)', Imerina: 'rgba(150,110,120,0.5)',
  Transvaal: 'rgba(140,130,100,0.45)', 'Orange Free State': 'rgba(150,140,110,0.45)', Liberia: 'rgba(140,120,80,0.45)',
};
// small labels superseded by CITIES / CALLOUTS in v3
const DUP_LABELS = new Set(['Léopoldville', 'Stanley Falls', 'Boma', 'Cairo', 'Cape Town', 'Dakar', 'Timbuktu', 'Berlin', 'Paris', 'London', 'Brussels',
  'Khartoum', 'Omdurman', 'Isandlwana', 'Fashoda', 'Adwa', 'Agadir', 'Ouargla', 'Suez Canal', 'Brazzaville', 'Upper Nile', 'Wassoulou Empire of Samori Touré', 'Bloemfontein', 'Pretoria', 'Fez', 'Liberia']);
// atlas palette: printed with 'multiply' over the shaded relief
// v5 palette measured from the reference (wash + multiply over the relief): British pink, French steel blue, German slate,
// Belgian ochre, Portuguese moss, Italian dark olive, Spanish red, Ottoman plum
const POWER_FILL: Record<Power, string> = {
  britain: '#b47a70', france: '#6f93a8', germany: '#8c8a7a', belgium: '#bc965c', portugal: '#86a06c',
  italy: '#6d7250', spain: '#b8503c', ottoman: '#8e7f98', independent: '#cdb38a',
};
const STATE_FILL4: Record<string, string> = {
  'Sokoto Caliphate': '#9aa86e', Ethiopia: '#b88a62', Zululand: '#b07a6a', Asante: '#c0a85c', Buganda: '#8aa0a8', Morocco: '#b08a78',
  'Sultanate of Zanzibar': '#a090a8', Dahomey: '#b49470', Imerina: '#b08a90', Transvaal: '#b8ac86', 'Orange Free State': '#bfb48e', Liberia: '#b4a070',
};

const splitCaption = (c: string): [string, string | undefined] => {
  const i = c.indexOf(' — ');
  if (i > 0) return [c.slice(0, i), c.slice(i + 3)];
  const j = c.lastIndexOf(', ');
  if (j > 0) return [c.slice(0, j), c.slice(j + 2)];
  return [c, undefined];
};

/* ---------- percentage counter ---------- */
const Counter: React.FC<{t: number}> = ({t}) => {
  const a = T('S5_07'), b = T('S5_07', '90');
  const end = E('S5_07') + 1.2;
  if (t < a - 0.2 || t > end) return null;
  const pct = Math.round(interpolate(t, [a, b + 0.3], [10, 90], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const op = interpolate(t, [a - 0.2, a + 0.4, end - 0.6, end], [0, 1, 1, 0]);
  return (
    <div style={{position: 'absolute', right: 96, bottom: 110, textAlign: 'right', opacity: op}}>
      <div style={{fontFamily: FONT.label, fontSize: 26, letterSpacing: 5, color: C.gold}}>UNDER EUROPEAN RULE</div>
      <div style={{fontFamily: FONT.title, fontSize: 150, fontWeight: 700, color: C.white, lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,0.9)'}}>{pct}%</div>
      <div style={{fontFamily: FONT.label, fontSize: 30, letterSpacing: 3, color: 'rgba(255,255,255,0.8)'}}>1870 → 1900</div>
    </div>
  );
};

/* ---------- credits ---------- */
const Credits: React.FC<{t0: number}> = ({t0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps - t0;
  if (t < 0) return null;
  const lines = [
    ['THE SCRAMBLE FOR AFRICA', 'h'],
    ['Written, designed & produced with Remotion', ''],
    ['', ''],
    ['MAPS', 'h2'], ['Natural Earth (public domain)', ''], ['historical-basemaps — A. Ourednik et al. (CC BY-NC-SA 4.0)', ''], ['NASA Blue Marble (public domain)', ''],
    ['', ''],
    ['ARCHIVE IMAGES', 'h2'], ['Wikimedia Commons — public domain / no known restrictions', ''],
    ['', ''],
    ['MUSIC', 'h2'], ['Kevin MacLeod (incompetech.com) — CC BY 4.0', ''], ['“Virtutes Instrumenti” · “Lightless Dawn” · “Impact Lento”', ''], ['“Long Note Two” · “Dark Times” · “Private Reflection”', ''],
    ['', ''],
    ['SOURCES', 'h2'], ['T. Pakenham, The Scramble for Africa · A. Hochschild, King Leopold’s Ghost', ''], ['H. L. Wesseling, Divide and Rule · R. Reid, A History of Modern Africa', ''],
  ];
  const y = interpolate(t, [0, OUTRO.credits], [1080, -lines.length * 44 - 80]);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center'}}>
      <div style={{position: 'absolute', top: y, textAlign: 'center', width: 1400}}>
        {lines.map(([txt, k], i) => (
          <div key={i} style={{
            fontFamily: k === 'h' ? FONT.title : FONT.label, fontSize: k === 'h' ? 54 : k === 'h2' ? 26 : 28,
            letterSpacing: k ? 6 : 1.5, color: k === 'h2' ? C.gold : C.white, height: 44, lineHeight: '44px',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)', fontWeight: k ? 700 : 400,
          }}>{txt}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => { ensureFonts().then(() => continueRender(h)); }, [h]);

  const land = useTopo('land_world');
  const af1880 = useTopo('africa_1880');
  const af1914 = useTopo('colonies_1914');
  const modern = useTopo('countries_world');

  // v5: the camera never rests — a slow organic drift (in screen pixels, converted to degrees) on top of the keyframes
  const cam = (() => {
    const c = camAt(CAM4, t);
    const degPerPx = 57.2958 / c.scale;
    const dz = 1 + 0.012 * Math.sin(t * 0.21) + 0.006 * Math.sin(t * 0.53);
    return {...c, lon: c.lon + (16 * Math.sin(t * 0.17) + 6 * Math.sin(t * 0.41)) * degPerPx, lat: c.lat + (11 * Math.cos(t * 0.13) + 5 * Math.cos(t * 0.37)) * degPerPx, scale: c.scale * dz};
  })();
  // v5: fast camera moves get a motion blur (reference: radial blur on the zoom in/out between regions)
  const moveBlur = (() => {
    const a = camAt(CAM4, t - 1 / fps), b = camAt(CAM4, t + 1 / fps);
    const zoomRate = Math.abs(Math.log(b.scale / a.scale)) / 2;
    const panPx = (Math.hypot(b.lon - a.lon, b.lat - a.lat) / 2) * (cam.scale / 57.3);
    return Math.min(6, Math.max(0, zoomRate * 90 + panPx * 0.022 - 0.5));
  })();

  // ----- layer opacities over time -----
  const pre1880On = prog(frame, (FIRST_VO + 1.5) * fps, (FIRST_VO + 4.5) * fps); // fade in during S1
  const preFadeOut = 1 - prog(frame, T('S5_01') * fps, (T('S5_01') + 4) * fps); // 1870 polities fade out as the partition begins
  const modernOn = prog(frame, T('S8_03', 'borders') * fps, (T('S8_03', 'borders') + 2.5) * fps) * (1 - prog(frame, T('S8_04', 'In') * fps, (T('S8_04', 'In') + 2) * fps));
  const quoteOn = QUOTES.some((q) => t >= q.t && t <= q.until);
  // de-emphasise the partition fills during the resistance scene (1879–1898)
  const postMul = 1 - 0.45 * (prog(frame, (T('S6_01') - 1.5) * fps, (T('S6_01') + 1) * fps) - prog(frame, (T('S7_01') - 2) * fps, T('S7_01') * fps));
  const inTitle = t >= COLD_OPEN.quote && t < FIRST_VO;
  const atlas = prog(frame, (FIRST_VO - 4) * fps, (FIRST_VO + 0.5) * fps);

  const layers: Layer[] = useMemo(() => {
    const L: Layer[] = [];
    // 1880 polities: European enclaves tinted, African states as faint outlines
    L.push({
      id: 'pre', fc: af1880,
      filter: (f) => !!f.properties.NAME && (!!OWNER_1880[f.properties.NAME] || STATES_1870.has(f.properties.NAME)),
      fill: (f) => {
        const p = OWNER_1880[f.properties.NAME];
        if (p === 'ottoman') return '#8e7f98';
        return p ? POWER_FILL[p] : STATE_FILL4[f.properties.NAME] ?? '#d8c8ac';
      },
      strokeFn: (f) => (OWNER_1880[f.properties.NAME] ? 'rgba(235,220,200,0.8)' : 'rgba(235,220,200,0.6)'),
      strokeWidth: 1.5,
      blend: 'multiply', wash: 0.42, strokeOnTop: true, shadow: true,
      opacity: (f) => (OWNER_1880[f.properties.NAME] ? 0.9 : 0.8) * pre1880On * preFadeOut,
    });
    // 1914 territories revealed over time
    L.push({
      id: 'post', fc: af1914,
      filter: (f) => AFRICA_1914.has(f.properties.NAME),
      fill: (f) => POWER_FILL[OWNER_1914[f.properties.NAME]],
      stroke: 'rgba(235,220,200,0.8)', strokeWidth: 1.5,
      blend: 'multiply', wash: 0.45, strokeOnTop: true, shadow: true,
      emphasis: (f) => {
        const a = acqOf(f.properties.NAME);
        if (!a) return 0;
        return 1 - prog(frame, (a.t + 5) * fps, (a.t + 8) * fps);
      },
      opacity: (f) => {
        const p = OWNER_1914[f.properties.NAME];
        if (p === 'independent') {
          // Ethiopia & Liberia glow in scene 6 and at the 1914 summary
          const a = prog(frame, T('S6_04', 'Ethiopia') * fps, (T('S6_04', 'Ethiopia') + 1.5) * fps) * (1 - prog(frame, E('S6_04') * fps, (E('S6_04') + 3) * fps));
          const b = prog(frame, T('S8_02', 'except') * fps, (T('S8_02', 'except') + 1.5) * fps);
          return 0.9 * Math.max(a, b) * (1 - modernOn * 0.6);
        }
        return 0.95 * (0.55 + 0.45 * postMul) * (1 - modernOn * 0.45);
      },
      reveal: (f) => {
        const a = acqOf(f.properties.NAME);
        if (!a) return 0;
        return prog(frame, a.t * fps, (a.t + (a.dur ?? 1.2)) * fps, easeOutCubic);
      },
      revealFrom: (f) => acqOf(f.properties.NAME)?.from,
    });
    // modern borders overlay
    L.push({
      id: 'modern', fc: modern,
      filter: (f) => f.properties.CONTINENT === 'Africa',
      fill: () => 'rgba(255,255,255,0.0)', stroke: 'rgba(255,245,235,0.95)', strokeWidth: 1.4,
      opacity: () => modernOn,
    });
    return L;
  }, [af1880, af1914, modern, frame, fps, pre1880On, preFadeOut, modernOn, postMul]);

  const vignette = quoteOn ? 0.9 : 0.55;

  return (
    <AbsoluteFill style={{background: '#050a12'}}>
      <AbsoluteFill style={moveBlur > 0.2 ? {filter: `blur(${moveBlur.toFixed(1)}px)`, transform: `scale(${1 + moveBlur * 0.006})`} : undefined}>
      <WorldMap cam={cam} land={land} layers={layers} vignette={vignette} atlas={atlas} clouds={atlas} cloudDrift={t * 0.012}>
        {ROUTES.map((r, i) => (
          <Route key={`r${i}`} pts={r.pts} at={Math.round(r.t * fps)} until={Math.round(r.until * fps)} color={r.color} width={r.width} dashed={r.dashed} drawDur={r.drawDur} head={r.head} />
        ))}
        {PULSES.map((p, i) => (
          <Pulse key={`p${i}`} lon={p.lon} lat={p.lat} at={Math.round(p.t * fps)} until={Math.round(p.until * fps)} color={p.color} />
        ))}
        {/* country names — always inside their borders */}
        {BIG.map((b, i) => (
          <BigLabel key={`b${i}`} lon={b.lon} lat={b.lat} text={b.text} at={Math.round(b.t * fps)} until={b.until ? Math.round(b.until * fps) : undefined} size={b.size} rot={b.rot} minScale={b.minScale} fit={b.fit} tone={LIGHT_LABELS.has(b.text) ? 'light' : 'dark'} />
        ))}
        {/* everything below keeps clear of the country names (LabelGuard = collision rectangles for this frame) */}
        <LabelGuard labels={BIG} fps={fps}>
          {CITIES.map((c, i) => (
            <City key={`c${i}`} lon={c.lon} lat={c.lat} name={c.name} at={Math.round((c.t ?? 0) * fps)} until={c.until ? Math.round(c.until * fps) : undefined} minScale={c.minScale} capital={c.capital} side={c.side} />
          ))}
          {LABELS.filter((l) => l.kind !== 'region' && !DUP_LABELS.has(l.text)).map((l, i) => (
            <MapLabel key={i} lon={l.lon} lat={l.lat} text={l.text} at={Math.round(l.t * fps)} until={l.until ? Math.round(l.until * fps) : undefined} kind={l.kind ?? 'city'} size={l.size ?? 26} />
          ))}
          {[...FLAGS, ...FLAGS_EXTRA].map((f, i) => (
            <FlagDrop key={i} lon={f.lon} lat={f.lat} power={f.power} at={Math.round(f.t * fps)} until={f.until ? Math.round(f.until * fps) : undefined} label={f.label} width={f.w ?? 72} />
          ))}
        </LabelGuard>
        {CALLOUTS.map((c, i) => (
          <Callout key={`k${i}`} lon={c.lon} lat={c.lat} text={c.text} sub={c.sub} at={Math.round(c.t * fps)} until={Math.round(c.until * fps)} dx={0} dy={-270} />
        ))}
      </WorldMap>
      </AbsoluteFill>

      {/* HUD */}
      {!quoteOn && t >= FIRST_VO && t < END_VO + 1.5 && <YearBadge year={yearAt(t)} />}
      {/* v5: archive = framed cards popping over the map; a few longer segments go to the brick wall */}
      {ARCHIVE.map((a, i) => {
        const [cap, sub] = splitCaption(a.caption);
        if (a.wall) {
          const prev = ARCHIVE[(i + ARCHIVE.length - 1) % ARCHIVE.length].src, next = ARCHIVE[(i + 1) % ARCHIVE.length].src;
          return <WallArchive key={i} src={a.src} caption={a.caption} at={Math.round(a.t * fps)} until={Math.round(a.until * fps)} sides={[prev, next]} sepia={a.sepia ?? 0.25} sign={a.sign} />;
        }
        return <CardPop key={i} src={a.src} caption={cap} sub={sub} at={Math.round(a.t * fps)} until={Math.round(a.until * fps)} x={a.x} y={a.y} w={a.w} h={a.h} sepia={a.sepia ?? 0.25} />;
      })}
      <Counter t={t} />

      {/* Title */}
      <TitleCard title="THE SCRAMBLE FOR AFRICA" sub="How Europe carved up a continent · 1870 — 1914" at={Math.round((COLD_OPEN.quote + 0.8) * fps)} until={Math.round((FIRST_VO + 0.5) * fps)} />

      {/* Quote cards (full-screen) */}
      {QUOTES.map((q, i) => <QuoteCard key={i} text={q.text} author={q.author} source={q.source} at={Math.round(q.t * fps)} until={Math.round(q.until * fps)} />)}

      {t >= END_VO + 1.5 + OUTRO.card - 1 && (
        <AbsoluteFill style={{background: 'rgba(3,6,12,0.62)', opacity: clamp01((t - (END_VO + 1.5 + OUTRO.card - 1)) / 1.5)}} />
      )}
      <Credits t0={END_VO + 1.5 + OUTRO.card} />
      <Grain amount={0.06} />

      {/* ---------- AUDIO ---------- */}
      {PARAS.map((p) => (
        <Sequence key={p.id} from={Math.round(p.start * fps)} durationInFrames={Math.round((p.duration + 0.3) * fps)} name={p.id}>
          <Audio src={staticFile(p.file)} volume={1} />
        </Sequence>
      ))}
      {MUSIC.map((m, i) => {
        const from = Math.max(0, Math.round(m.t * fps));
        const dur = Math.round((m.until - m.t) * fps);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={`music-${i}`}>
            <Audio
              src={staticFile(m.src)}
              startFrom={Math.round((m.offset ?? 0) * fps)}
              volume={(f) => {
                const tt = m.t + f / fps;
                const fi = m.fadeIn ? clamp01(f / (m.fadeIn * fps)) : 1;
                const fo = m.fadeOut ? clamp01((dur - f) / (m.fadeOut * fps)) : 1;
                // ducking under narration (soft, looks ahead a little)
                const duck = voActive(tt) ? 0.5 : 1;
                return m.gain * fi * fo * duck * 0.9;
              }}
            />
          </Sequence>
        );
      })}
      {SFX.map((s, i) => (
        <Sequence key={`sfx${i}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(6.5 * fps)} name="sfx">
          <Audio src={staticFile(s.src)} volume={s.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
