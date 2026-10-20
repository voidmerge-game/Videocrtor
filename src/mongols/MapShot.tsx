// Deterministic MapLibre shot inside Remotion (pattern: remotion-dev/maplibre-example).
// Each frame: set camera → wait for map 'idle' → continueRender.
import maplibregl, {type Map as MLMap} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, {useEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {buildStyle, SEA_DEEP, type Palette} from './mapStyle';
import {fitLabel} from './labels';
import * as turf from '@turf/turf';
import {staticFile} from 'remotion';
import type {Feature, FeatureCollection, MultiPolygon, Polygon} from 'geojson';

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
  /** 0..1 – how far along the move the frame is forced to (debug/stills). -1 = use frame */
  forceT: number;
};

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

async function prepareSeas(m: MLMap, zoom: number, seaNames: string[] | null, measure: (t: string, s: number) => number) {
  const fc = (await (await fetch(staticFile('data/seas.json'))).json()) as FeatureCollection<Polygon | MultiPolygon>;
  const b = m.getBounds();
  const pad = 0.5;
  const view: [number, number, number, number] = [b.getWest() - pad, b.getSouth() - pad, b.getEast() + pad, b.getNorth() + pad];
  const out = [];
  for (const f of fc.features) {
    const name = String(f.properties?.name ?? '');
    if (!name) continue;
    if (seaNames && !seaNames.includes(name)) continue;
    if (!seaNames && (f.properties?.rank ?? 9) > 4) continue;
    let g: Feature<Polygon | MultiPolygon>;
    try {
      g = turf.bboxClip(f, view) as Feature<Polygon | MultiPolygon>;
    } catch {
      continue;
    }
    if (!g.geometry || (g.geometry.type === 'Polygon' ? g.geometry.coordinates.length === 0 : g.geometry.coordinates.length === 0)) continue;
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

async function prepareRealms(m: MLMap, year: number, adminLevels: number[], fallbackNames: string[], palette: Palette, zoom: number, measure: (t: string, s: number) => number) {
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
  const byName = new Map<string, Feature<Polygon | MultiPolygon>[]>();
  for (const f of ohmPieces) {
    const g = f.geometry;
    if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue;
    const name = String(f.properties?.name_en ?? f.properties?.name);
    const arr = byName.get(name) ?? [];
    arr.push(turf.feature(g) as Feature<Polygon | MultiPolygon>);
    byName.set(name, arr);
  }
  const realms: Realm[] = [];
  for (const [name, pieces] of byName) {
    const u = unionAll(pieces);
    if (u) realms.push({name, feature: u, source: 'ohm'});
  }
  const cover = unionAll(realms.map((r) => r.feature));

  const clipped: Feature[] = [];
  if (fallbackNames.length > 0) {
    const fc = (await (await fetch(staticFile('data/world_1200.json'))).json()) as FeatureCollection<Polygon | MultiPolygon>;
    for (const f of fc.features) {
      const name = String(f.properties?.name ?? '');
      if (!fallbackNames.includes(name)) continue;
      let g: Feature<Polygon | MultiPolygon> | null = f;
      if (cover) {
        try {
          g = turf.difference(turf.featureCollection([f, cover])) as Feature<Polygon | MultiPolygon> | null;
        } catch {
          g = f;
        }
      }
      if (!g) continue;
      g.properties = {name};
      clipped.push(g);
      realms.push({name, feature: g, source: 'fallback'});
    }
  }
  (m.getSource('fallback') as maplibregl.GeoJSONSource).setData({type: 'FeatureCollection', features: clipped});

  const labels = realms.map((r) => fitLabel(r.feature, r.name, palette[r.name + '@label'] ?? r.name, zoom, {measure}));
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

export const MapShot: React.FC<MapShotProps> = ({year, from, to, palette, exaggeration, adminLevels, nativeLabels, fallbackNames, seaNames, forceT}) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const [loadHandle] = useState(() => delayRender('MapLibre load', {timeoutInMilliseconds: 120000}));
  const [map, setMap] = useState<MLMap | null>(null);

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
          const measureBold = await makeMeasurer('GaramondXB', 'fonts/EBGaramond-ExtraBold.ttf', 0.06);
          const measureItalic = await makeMeasurer('GaramondIt', 'fonts/EBGaramond-SemiBoldItalic.ttf', 0.12);
          await prepareRealms(m, year, adminLevels, fallbackNames, palette, from.zoom, measureBold);
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
    map.once('idle', () => continueRender(h));
    map.triggerRepaint();
  }, [map, frame, forceT, from, to, durationInFrames]);

  return (
    <AbsoluteFill style={{backgroundColor: SEA_DEEP}}>
      <div ref={ref} style={{position: 'absolute', width, height}} />
      {/* horizon softening (DoF feel) – top 22% */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width, height: height * 0.22,
          backdropFilter: 'blur(2.5px)', WebkitBackdropFilter: 'blur(2.5px)',
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
  forceT: -1,
};
