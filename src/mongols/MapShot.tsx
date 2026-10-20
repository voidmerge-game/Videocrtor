// Deterministic MapLibre shot inside Remotion (pattern: remotion-dev/maplibre-example).
// Each frame: set camera → wait for map 'idle' → continueRender.
import maplibregl, {type Map as MLMap} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, {useEffect, useRef, useState} from 'react';
import {Signpost, type SignpostSpec} from './Signpost';
import {Card, YearTag, type CardSpec} from './Card';
import {ensureFonts} from '../lib/fonts';
import {AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {buildStyle, SEA_DEEP, type Palette} from './mapStyle';
import {fitLabel} from './labels';
import * as turf from '@turf/turf';
import {staticFile} from 'remotion';
import type {Feature, FeatureCollection, MultiPolygon, Polygon, Position} from 'geojson';

export type CameraKey = {center: [number, number]; zoom: number; pitch: number; bearing: number};

export type MapShotProps = {
  year: number;
  from: CameraKey;
  to: CameraKey;
  palette: Palette;
  exaggeration: number;
  adminLevels: number[];
  nativeLabels: boolean;
  /** realms taken from the fallback basemap (names as in world_1200.json) */
  fallbackNames: string[];
  /** which sea names to show (empty = automatic by rank) */
  seaNames: string[];
  /** period-correct city handling: modern name -> historical name ('' = hide) */
  cityRenames: Record<string, string>;
  /** extra (medieval) places: [name, lon, lat, rank] */
  extraCities: [string, number, number, number][];
  /** 0..1 – how far along the move the frame is forced to (debug/stills). -1 = use frame */
  forceT: number;
  /** map-anchored overlays (signposts …) */
  overlays: OverlaySpec[];
  /** screen-space cards */
  cards: CardSpec[];
  /** year tag text ('' = none) */
  yearTag: string;
};
export type OverlaySpec = SignpostSpec;

type Realm = {name: string; feature: Feature<Polygon | MultiPolygon>; source: 'ohm' | 'fallback'};

const unionAll = (feats: Feature<Polygon | MultiPolygon>[]): Feature<Polygon | MultiPolygon> | null => {
  let acc: Feature<Polygon | MultiPolygon> | null = null;
  for (const f of feats) {
    try {
      acc = acc ? (turf.union(turf.featureCollection([acc, f])) as Feature<Polygon | MultiPolygon> | null) : f;
    } catch {
      /* skip invalid piece */
    }
  }
  return acc;
};

/**
 * 1) Rebuild each OHM realm polygon (for this year) from the loaded tile pieces.
 * 2) Fallback realms (aourednik 1200) minus everything OHM covers → OHM always wins.
 * 3) Fit one label per realm fully inside its polygon (size/rotation/line-breaks) → 'labels' source.
 */
/** exact text width with the real label font (loaded via FontFace) incl. MapLibre letter-spacing (em) */
async function makeMeasurer(family: string, file: string, letterSpacingEm: number) {
  try {
    const ff = new FontFace(family, `url(${staticFile(file)})`);
    await ff.load();
    document.fonts.add(ff);
  } catch (e) {
    console.log('FONT_LOAD_ERROR', family, String(e));
  }
  const ctx = document.createElement('canvas').getContext('2d')!;
  return (text: string, size: number) => {
    ctx.font = `${size}px "${family}"`;
    return ctx.measureText(text).width + letterSpacingEm * size * Math.max(0, text.length - 1);
  };
}

/** lon/lat bbox of the actually visible screen area (inset a little), robust to pitch */
const visibleBBox = (m: MLMap, inset = 0.06): [number, number, number, number] => {
  const c = m.getContainer();
  const W = c.clientWidth, H = c.clientHeight;
  const pts = [
    [W * inset, H * inset], [W * (1 - inset), H * inset], [W * inset, H * (1 - inset)], [W * (1 - inset), H * (1 - inset)],
    [W / 2, H * inset], [W / 2, H * (1 - inset)], [W * inset, H / 2], [W * (1 - inset), H / 2],
  ];
  let w = 180, s = 90, e = -180, n = -90;
  for (const [x, y] of pts) {
    const ll = m.unproject([x, y]);
    if (!isFinite(ll.lng) || !isFinite(ll.lat)) continue;
    w = Math.min(w, ll.lng); e = Math.max(e, ll.lng); s = Math.min(s, ll.lat); n = Math.max(n, ll.lat);
  }
  return [w, s, e, n];
};

/** polygon (lon/lat) of the visible screen area – with pitch the view is a trapezoid, not a lon/lat box */
const visiblePolygon = (m: MLMap, inset = 0.05): Feature<Polygon> => {
  const c = m.getContainer();
  const W = c.clientWidth, H = c.clientHeight;
  const ring: Position[] = [];
  const N = 12;
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const ll = m.unproject([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      ring.push([Math.max(-179.9, Math.min(179.9, ll.lng)), Math.max(-85, Math.min(85, ll.lat))]);
    }
  };
  const l = W * inset, r = W * (1 - inset), t = H * inset, b = H * (1 - inset);
  edge(l, t, r, t); edge(r, t, r, b); edge(r, b, l, b); edge(l, b, l, t);
  ring.push(ring[0]);
  return turf.polygon([ring]) as Feature<Polygon>;
};

const clipToView = (f: Feature<Polygon | MultiPolygon>, viewPoly: Feature<Polygon>): Feature<Polygon | MultiPolygon> | null => {
  try {
    const r = turf.intersect(turf.featureCollection([f, viewPoly])) as Feature<Polygon | MultiPolygon> | null;
    if (!r || !r.geometry || !r.geometry.coordinates || r.geometry.coordinates.length === 0) return null;
    return r;
  } catch {
    return null;
  }
};

/** Chaikin corner cutting – only for coarse polygons (long straight segments), keeps detailed ones intact */
const smoothCoarse = (f: Feature<Polygon | MultiPolygon>, zoom: number): Feature<Polygon | MultiPolygon> => {
  const pxPerDeg = (256 * Math.pow(2, zoom)) / 360;
  const chaikin = (ring: Position[], iters: number): Position[] => {
    let r = ring.slice(0, -1);
    for (let k = 0; k < iters; k++) {
      const out: Position[] = [];
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
        out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
      }
      r = out;
    }
    return [...r, r[0]];
  };
  const doRing = (ring: Position[]): Position[] => {
    if (ring.length < 5) return ring;
    let len = 0;
    for (let i = 0; i < ring.length - 1; i++) len += Math.hypot(ring[i + 1][0] - ring[i][0], ring[i + 1][1] - ring[i][1]);
    const avgSegPx = (len / (ring.length - 1)) * pxPerDeg;
    if (avgSegPx < 5) return ring; // already detailed
    return chaikin(ring, avgSegPx > 20 ? 3 : 2);
  };
  const g = f.geometry;
  if (g.type === 'Polygon') return turf.feature({type: 'Polygon', coordinates: g.coordinates.map(doRing)}, f.properties) as Feature<Polygon>;
  return turf.feature({type: 'MultiPolygon', coordinates: g.coordinates.map((p) => p.map(doRing))}, f.properties) as Feature<MultiPolygon>;
};

const makeDiamond = (size = 32): ImageData => {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const h = size / 2;
  ctx.translate(h, h); ctx.rotate(Math.PI / 4);
  const r = size * 0.28;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(20,16,10,0.9)'; ctx.lineWidth = size * 0.07;
  ctx.beginPath(); ctx.rect(-r, -r, 2 * r, 2 * r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(20,16,10,0.9)';
  ctx.beginPath(); ctx.rect(-r * 0.38, -r * 0.38, r * 0.76, r * 0.76); ctx.fill();
  return ctx.getImageData(0, 0, size, size);
};

async function applyCities(m: MLMap, renames: Record<string, string>, extra: [string, number, number, number][]) {
  const fc = (await (await fetch(staticFile('data/cities.json'))).json()) as FeatureCollection;
  const feats: Feature[] = [];
  for (const f of fc.features) {
    const n = String(f.properties?.name ?? '');
    if (n in renames) {
      if (renames[n] === '') continue;
      f.properties = {...f.properties, name: renames[n]};
    }
    feats.push(f);
  }
  for (const [name, lon, lat, rank] of extra) feats.push({type: 'Feature', properties: {name, rank, cap: 0}, geometry: {type: 'Point', coordinates: [lon, lat]}});
  (m.getSource('cities') as maplibregl.GeoJSONSource).setData({type: 'FeatureCollection', features: feats});
}

async function prepareSeas(m: MLMap, zoom: number, seaNames: string[] | null, measure: (t: string, s: number) => number) {
  const fc = (await (await fetch(staticFile('data/seas.json'))).json()) as FeatureCollection<Polygon | MultiPolygon>;
  const viewPoly = visiblePolygon(m, 0.06);
  const out = [];
  for (const f of fc.features) {
    const name = String(f.properties?.name ?? '');
    if (!name) continue;
    if (seaNames && !seaNames.includes(name)) continue;
    if (!seaNames && (f.properties?.rank ?? 9) > 4) continue;
    const g = clipToView(f, viewPoly);
    if (!g) continue;
    const label = name.replace(/^INDIAN OCEAN$/, 'Indian Ocean');
    const l = fitLabel(g, name, label, zoom, {maxSize: 30, minSize: 12, pad: 10, measure});
    if (l.fit) out.push(l);
  }
  (m.getSource('sea_labels') as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: out.map((l) => ({type: 'Feature', properties: {name: l.name, label: l.label, angle: l.angle, size: l.size}, geometry: {type: 'Point', coordinates: [l.lon, l.lat]}})),
  });
  console.log('SEA_LABELS', JSON.stringify(out.map((l) => [l.name, Math.round(l.angle), l.size])));
}

/** screen boxes occupied by overlays (signposts) → lon/lat polygons the label fitter must avoid */
const overlayKeepouts = (m: MLMap, overlays: OverlaySpec[], cards: CardSpec[] = []): Feature<Polygon>[] => {
  const W = m.getContainer().clientWidth, H = m.getContainer().clientHeight;
  const S = W / 1920;
  const out: Feature<Polygon>[] = [];
  const rects: [number, number, number, number][] = [];
  for (const o of overlays) {
    const p = m.project([o.lng, o.lat]);
    rects.push([p.x - 95 * S, p.y - 270 * S, p.x + 95 * S, p.y + 14 * S]);
  }
  for (const c of cards) {
    const cw = 500 * S, ch = 640 * S, margin = 70 * S;
    const x0 = c.side === 'right' ? W - cw - margin : margin;
    const y0 = (H - ch) / 2 + 10 * S;
    rects.push([x0 - 10 * S, y0 - 10 * S, x0 + cw + 10 * S, y0 + ch + 10 * S]);
  }
  for (const [l, t, r, b] of rects) {
    const pts: Position[] = [];
    const N = 6;
    const edge = (x0: number, y0: number, x1: number, y1: number) => {
      for (let i = 0; i < N; i++) {
        const k = i / N;
        const ll = m.unproject([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
        pts.push([ll.lng, ll.lat]);
      }
    };
    edge(l, t, r, t); edge(r, t, r, b); edge(r, b, l, b); edge(l, b, l, t);
    pts.push(pts[0]);
    out.push(turf.polygon([pts]) as Feature<Polygon>);
  }
  return out;
};

async function prepareRealms(m: MLMap, year: number, adminLevels: number[], fallbackNames: string[], palette: Palette, zoom: number, measure: (t: string, s: number) => number, overlays: OverlaySpec[] = [], cards: CardSpec[] = []) {
  const ohmPieces = m.querySourceFeatures('ohm_admin', {
    sourceLayer: 'boundaries',
    filter: [
      'all',
      ['<=', ['get', 'start_decdate'], year],
      ['any', ['!', ['has', 'end_decdate']], ['>=', ['get', 'end_decdate'], year]],
      ['in', ['get', 'admin_level'], ['literal', adminLevels]],
      ['has', 'name'],
      ['>=', ['coalesce', ['get', 'area'], 1e20], 2e10],
    ],
  });
  const t0 = performance.now();
  // work only inside the (padded) view: clip + simplify every tile piece first (huge realms like the
  // Mongol Empire span dozens of tiles – unioning them whole takes minutes)
  const view = visibleBBox(m, -0.25); // expanded beyond the screen
  const viewPoly = visiblePolygon(m, -0.25);
  const labelPoly = visiblePolygon(m, 0.04); // labels must sit in the visible part
  const keepouts = overlayKeepouts(m, overlays, cards);
  const tolDeg = (360 / (256 * Math.pow(2, zoom))) * 0.15; // ~0.15 px (union speed only; shapes stay crisp)
  const byName = new Map<string, Feature<Polygon | MultiPolygon>[]>();
  for (const f of ohmPieces) {
    const g = f.geometry;
    if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue;
    const name = String(f.properties?.name_en ?? f.properties?.name);
    let piece: Feature<Polygon | MultiPolygon>;
    try {
      const pre = turf.bboxClip(turf.feature(g) as Feature<Polygon | MultiPolygon>, view) as Feature<Polygon | MultiPolygon>;
      if (!pre.geometry || pre.geometry.coordinates.length === 0) continue;
      const simp = turf.simplify(pre, {tolerance: tolDeg, highQuality: false, mutate: true}) as Feature<Polygon | MultiPolygon>;
      const cl = clipToView(simp, viewPoly);
      if (!cl) continue;
      piece = cl;
      if (turf.area(piece) < 1e8) continue; // < 100 km² slivers
    } catch {
      continue;
    }
    const arr = byName.get(name) ?? [];
    arr.push(piece);
    byName.set(name, arr);
  }
  const realms: Realm[] = [];
  for (const [name, pieces] of byName) {
    const u = unionAll(pieces);
    if (u) realms.push({name, feature: smoothCoarse(u, zoom), source: 'ohm'});
  }
  const t1 = performance.now();
  const cover = unionAll(realms.map((r) => r.feature));
  const t2 = performance.now();
  console.log('REALM_TIMING', 'pieces', ohmPieces.length, 'union/realm', Math.round(t1 - t0), 'ms', 'cover', Math.round(t2 - t1), 'ms');

  const clipped: Feature[] = [];
  if (fallbackNames.length > 0) {
    const fc = (await (await fetch(staticFile('data/world_1200.json'))).json()) as FeatureCollection<Polygon | MultiPolygon>;
    for (const f of fc.features) {
      const name = String(f.properties?.name ?? '');
      if (!fallbackNames.includes(name)) continue;
      let g: Feature<Polygon | MultiPolygon> | null = clipToView(smoothCoarse(f, zoom), viewPoly);
      if (!g) continue;
      if (cover) {
        try {
          g = turf.difference(turf.featureCollection([g, cover])) as Feature<Polygon | MultiPolygon> | null;
        } catch {
          g = f;
        }
      }
      if (!g || !g.geometry || !g.geometry.coordinates || g.geometry.coordinates.length === 0) continue;
      if (turf.area(g) < 5e9) continue; // < 5,000 km² left after clipping → not worth a label/fill
      g.properties = {name};
      clipped.push(g);
      realms.push({name, feature: g, source: 'fallback'});
    }
  }
  (m.getSource('fallback') as maplibregl.GeoJSONSource).setData({type: 'FeatureCollection', features: clipped});
  // all realms (OHM + fallback) rendered from one processed source → consistent, smooth, morphable
  (m.getSource('realms') as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: realms.map((r) => ({type: 'Feature', properties: {name: r.name, src: r.source}, geometry: r.feature.geometry})),
  });

  const labels = realms.map((r) => {
    try {
      let vis = clipToView(r.feature, labelPoly);
      for (const ko of keepouts) {
        if (!vis) break;
        try {
          vis = (turf.difference(turf.featureCollection([vis, ko])) as Feature<Polygon | MultiPolygon> | null) ?? null;
        } catch {
          /* keep vis */
        }
      }
      if (!vis) return {name: r.name, label: r.name, lon: 0, lat: 0, angle: 0, size: 0, fit: false};
      return fitLabel(vis, r.name, palette[r.name + '@label'] ?? r.name, zoom, {measure});
    } catch (e) {
      console.log('FIT_ERROR', r.name, String(e));
      return {name: r.name, label: r.name, lon: 0, lat: 0, angle: 0, size: 0, fit: false};
    }
  });
  // QA gate: a label that cannot be placed fully inside its border is NOT drawn (logged instead)
  (m.getSource('labels') as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: labels.filter((l) => l.fit).map((l) => ({type: 'Feature', properties: {name: l.name, label: l.label, angle: l.angle, size: l.size, fit: l.fit}, geometry: {type: 'Point', coordinates: [l.lon, l.lat]}})),
  });
  console.log('LABEL_FIT', JSON.stringify(labels.map((l) => [l.name, l.label.replace('\n', '|'), Math.round(l.angle), l.size, l.fit, +l.lon.toFixed(2), +l.lat.toFixed(2), l.dbg ?? ''])));
  console.log('REALMS', JSON.stringify(realms.map((r) => [r.name, r.source])));
}

const lerpKey = (a: CameraKey, b: CameraKey, t: number): CameraKey => ({
  center: [a.center[0] + (b.center[0] - a.center[0]) * t, a.center[1] + (b.center[1] - a.center[1]) * t],
  zoom: a.zoom + (b.zoom - a.zoom) * t,
  pitch: a.pitch + (b.pitch - a.pitch) * t,
  bearing: a.bearing + (b.bearing - a.bearing) * t,
});

export const MapShot: React.FC<MapShotProps> = ({year, from, to, palette, exaggeration, adminLevels, nativeLabels, fallbackNames, seaNames, cityRenames, extraCities, forceT, overlays, cards, yearTag}) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const [loadHandle] = useState(() => delayRender('MapLibre load', {timeoutInMilliseconds: 600000}));
  const [map, setMap] = useState<MLMap | null>(null);
  const [anchors, setAnchors] = useState<Record<string, [number, number]>>({});
  const [fontsHandle] = useState(() => delayRender('fonts', {timeoutInMilliseconds: 60000}));
  useEffect(() => {
    ensureFonts().then(() => continueRender(fontsHandle));
  }, [fontsHandle]);

  useEffect(() => {
    if (!ref.current) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: buildStyle(year, palette, {adminLevels, nativeLabels, fallbackNames}),
      center: from.center,
      zoom: from.zoom,
      pitch: from.pitch,
      bearing: from.bearing,
      maxPitch: 75,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {preserveDrawingBuffer: true, antialias: true},
    });
    m.on('error', (e) => console.log('MAPLIBRE_ERROR', (e as unknown as {error?: Error}).error?.message ?? String(e)));
    m.on('load', () => {
      console.log('MAPLIBRE_LOADED');
      m.setTerrain({source: 'dem', exaggeration});
      m.once('idle', async () => {
        try {
          if (!m.hasImage('diamond')) m.addImage('diamond', makeDiamond(32), {pixelRatio: 2});
          await applyCities(m, cityRenames, extraCities);
          const measureBold = await makeMeasurer('GaramondXB', 'fonts/EBGaramond-ExtraBold.ttf', 0.06);
          const measureItalic = await makeMeasurer('GaramondIt', 'fonts/EBGaramond-SemiBoldItalic.ttf', 0.12);
          await prepareRealms(m, year, adminLevels, fallbackNames, palette, from.zoom, measureBold, overlays, cards);
          await prepareSeas(m, from.zoom, seaNames.length > 0 ? seaNames : null, measureItalic);
        } catch (e) {
          console.log('FALLBACK_CLIP_ERROR', String(e));
        }
        m.once('idle', () => {
          console.log('MAPLIBRE_IDLE');
          try {
            const placed = m.queryRenderedFeatures(undefined, {layers: ['labels']});
            console.log('LABELS_PLACED', JSON.stringify(placed.map((f) => [f.layer.id, f.properties?.name_en ?? f.properties?.name])));
          } catch (e) {
            console.log('LABELS_QA_ERROR', String(e));
          }
          setMap(m);
          continueRender(loadHandle);
        });
        m.triggerRepaint();
      });
    });
    return () => {
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    const h = delayRender(`MapLibre frame ${frame}`, {timeoutInMilliseconds: 120000});
    const t =
      forceT >= 0
        ? forceT
        : interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.cubic),
          });
    map.jumpTo(lerpKey(from, to, t));
    // project overlay anchors for this camera (sync after jumpTo)
    const a: Record<string, [number, number]> = {};
    for (const o of overlays) {
      const p = map.project([o.lng, o.lat]);
      a[o.id] = [p.x, p.y];
    }
    setAnchors(a);
    map.once('idle', () => continueRender(h));
    map.triggerRepaint();
  }, [map, frame, forceT, from, to, durationInFrames, overlays]);

  return (
    <AbsoluteFill style={{backgroundColor: SEA_DEEP}}>
      <div ref={ref} style={{position: 'absolute', width, height}} />
      {/* horizon softening (DoF feel) – top 22% */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width, height: height * 0.16,
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* sheen: soft specular light from the upper-left (reference has a glossy highlight on the water) */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'soft-light',
          background: 'linear-gradient(115deg, rgba(255,250,235,0.55) 0%, rgba(255,255,255,0.12) 40%, rgba(0,0,0,0.18) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen',
          background: 'radial-gradient(ellipse 48% 38% at 42% 22%, rgba(255,250,236,0.16) 0%, rgba(255,250,236,0.05) 50%, rgba(255,250,236,0) 75%)',
        }}
      />
      {/* vignette */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.38) 100%)', pointerEvents: 'none'}} />
      {/* map-anchored overlays */}
      {overlays.map((o) => {
        const a = anchors[o.id];
        if (!a) return null;
        if (o.kind === 'signpost') return <Signpost key={o.id} spec={o} x={a[0]} y={a[1]} scale={width / 1920} />;
        return null;
      })}
      {cards.map((c, i) => <Card key={i} spec={c} />)}
      {yearTag ? <YearTag year={yearTag} from={0} /> : null}
    </AbsoluteFill>
  );
};

// Default test shot = the Iberia reference frame (Knowledgia v1, ~1241)
export const IBERIA_PALETTE: Palette = {
  'Crown of Castile': '#bcab38',
  'Crown of Castile@label': 'Castile',
  'Crown of Aragon@label': 'Aragon',
  'Emirate of Granada@label': 'Granada',
  'Almohad Caliphate@label': 'Almohads',
  'Portugal@label': 'Portugal',
  'Corona Castellae': '#bcab38',
  'Kingdom of Portugal': '#4b7a8a',
  'Reino de Portugal': '#4b7a8a',
  'Crown of Aragon': '#883a5e',
  'Aragonum et Catalonie': '#883a5e',
  'Kingdom of Navarre': '#7a8a3c',
  'Kingdom of Navarre@label': 'Navarre',
  'Emirate of Granada': '#8cc478',
  'مملكة غرناطة': '#8cc478',
  'Hafsid': '#4f9a4a',
  'Marinid': '#5aa850',
  'Kingdom of France': '#5f6f9a',
  // fallback basemap names (aourednik world_1200)
  Portugal: '#4b7a8a',
  Navarre: '#6b7f3a',
  'Navarre@label': 'Navarre',
  'Almohad Caliphate': '#5aa850',
};

export const iberiaDefaults: MapShotProps = {
  year: 1241.5,
  from: {center: [-4.2, 38.4], zoom: 5.85, pitch: 36, bearing: -5},
  to: {center: [-3.6, 38.7], zoom: 5.95, pitch: 36, bearing: -2},
  palette: IBERIA_PALETTE,
  exaggeration: 1.6,
  adminLevels: [2],
  nativeLabels: false,
  fallbackNames: ['Portugal', 'Almohad Caliphate'],
  seaNames: ['Bay of Biscay', 'Mediterranean Sea', 'Balearic Sea', 'Alboran Sea', 'North Atlantic Ocean', 'Strait of Gibraltar'],
  cityRenames: {},
  extraCities: [],
  forceT: -1,
  overlays: [],
  cards: [],
  yearTag: '',
};

// Scene 1 — Eastern Europe, spring 1241 (Legnica 9 April, Mohi 11 April)
export const EAST_1241_PALETTE: Palette = {
  'Mongol Empire': '#8b2f33',
  'Mongol Empire@label': 'Mongol Empire',
  'Kingdom of Hungary': '#5aa850',
  'Kingdom of Hungary@label': 'Hungary',
  Poland: '#c9a93a',
  'Holy Roman Empire': '#7f7aa6',
  'Bulgar Khanate': '#b07a3c',
  'Bulgar Khanate@label': 'Bulgaria',
  'Principality of Galicia-Volhynia': '#6f8f5a',
  'Principality of Galicia-Volhynia@label': 'Galicia–Volhynia',
  'Other Rus Principalities': '#8a9a6a',
  'Other Rus Principalities@label': "Rus' Principalities",
  'Principality of Vladimir-Suzdal': '#9aa070',
  'Principality of Vladimir-Suzdal@label': 'Vladimir-Suzdal',
  'Novgorod Republic': '#4b7a8a',
  'Novgorod Republic@label': 'Novgorod',
  'State of the Teutonic Order': '#d9d3c3',
  'State of the Teutonic Order@label': 'Teutonic Order',
  'Empire of Nicaea': '#8e3962',
  'Empire of Nicaea@label': 'Nicaea',
  'Latin Empire': '#b8862b',
  'Kingdom of Sicily': '#6b8e4e',
  'Kingdom of Sicily@label': 'Sicily',
  'Papal States': '#d2c48a',
  'Republic of Venice': '#c26a3d',
  'Republic of Venice@label': 'Venice',
  Denmark: '#a0493f',
  'Kingdom of France': '#4f6ea0',
  'Kingdom of France@label': 'France',
  'Kingdom of Sweden': '#c7b04e',
  'Kingdom of Sweden@label': 'Sweden',
  'Kingdom of Norway': '#8c6b4e',
  'Kingdom of Norway@label': 'Norway',
  'Kingdom of England': '#b04a4a',
  'Kingdom of England@label': 'England',
  'Empire of Trebizond': '#7c5a8c',
  'Empire of Trebizond@label': 'Trebizond',
  'Abbasid Caliphate': '#3f6d5a',
  'Abbasid Caliphate@label': 'Abbasids',
  'Cuman Khanates': '#a89060',
  'Cuman Khanates@label': 'Cumans',
  'Empire of Thessalonica': '#a35a7a',
  'Empire of Thessalonica@label': 'Thessalonica',
  'Principality of Murom-Ryazan': '#9aa070',
  'Principality of Murom-Ryazan@label': 'Ryazan',
};

export const east1241Defaults: MapShotProps = {
  year: 1241.3,
  from: {center: [24.5, 48.0], zoom: 4.55, pitch: 42, bearing: -8},
  to: {center: [25.5, 48.3], zoom: 4.65, pitch: 42, bearing: -5},
  palette: EAST_1241_PALETTE,
  exaggeration: 1.6,
  adminLevels: [2],
  nativeLabels: false,
  fallbackNames: ['Holy Roman Empire', 'Poland', 'Bulgar Khanate', 'Principality of Galicia-Volhynia', 'Other Rus Principalities', 'Principality of Vladimir-Suzdal', 'Denmark', 'Kingdom of France', 'Cuman Khanates'],
  seaNames: ['Black Sea', 'Baltic Sea', 'Adriatic Sea', 'Mediterranean Sea', 'Sea of Azov', 'Aegean Sea'],
  cityRenames: {Istanbul: 'Constantinople', Amsterdam: '', Berlin: '', Stockholm: '', Geneva: '', Athens: '', Vienna: 'Vienna', Kyiv: 'Kiev'},
  extraCities: [
    ['Kraków', 19.94, 50.06, 2], ['Legnica', 16.16, 51.21, 1], ['Mohi', 20.93, 47.98, 1], ['Esztergom', 18.74, 47.79, 2],
    ['Pest', 19.05, 47.5, 2], ['Vladimir', 40.41, 56.13, 2], ['Sarai', 47.5, 48.2, 2], ['Ryazan', 39.74, 54.63, 3], ['Wrocław', 17.03, 51.11, 2],
  ],
  forceT: -1,
  overlays: [
    {kind: 'signpost', id: 'bela', lng: 19.05, lat: 47.5, name: 'King Béla IV\nof Hungary', portrait: 'mongols/portraits/bela4.jpg', crown: true, from: 0, to: 9999, cloth: '#6e1f24'},
  ],
  cards: [
    {
      title: 'The Mongol Army in 1241',
      image: 'mongols/portraits/mohi_chronicon.jpg',
      caption: 'Mongol riders pursue King Béla IV – Chronicon Pictum, c. 1360',
      facts: [
        ['Strength', 'roughly 40,000 to 70,000 horsemen'],
        ['Command', 'Batu Khan, with Subutai as strategist'],
        ['Tactics', 'feigned retreat, encirclement, siege engines'],
      ],
      from: 0,
      to: 9999,
      side: 'right',
    },
  ],
  yearTag: '1241',
};
