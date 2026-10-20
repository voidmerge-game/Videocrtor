// Realm label fitter (port of label_fit.py, map-plane version).
// For each realm polygon: pick anchor (pole of inaccessibility), rotation (0° or the polygon's
// principal axis) and the largest font size whose text box lies fully INSIDE the polygon.
// Fitting is done in Web-Mercator pixel space at the shot zoom, so `text-rotate` with
// rotation-alignment 'map' is exact and the box stays inside the border on the map plane.
import * as turf from '@turf/turf';
import polylabel from 'polylabel';
import type {Feature, MultiPolygon, Polygon, Position} from 'geojson';

export type FittedLabel = {
  name: string;
  label: string; // with \n line breaks
  lon: number;
  lat: number;
  angle: number; // degrees, clockwise (MapLibre text-rotate)
  size: number; // px at composition resolution
  fit: boolean;
  dbg?: string;
};

const TILE = 256;
const CHAR_W_DEFAULT = 0.56; // em per character (EB Garamond ExtraBold ~0.50 + letter-spacing 0.06)
const LINE_H = 1.15;

const toPx = (lon: number, lat: number, z: number): [number, number] => {
  const s = TILE * Math.pow(2, z);
  const x = ((lon + 180) / 360) * s;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s;
  return [x, y];
};
const fromPx = (x: number, y: number, z: number): [number, number] => {
  const s = TILE * Math.pow(2, z);
  const lon = (x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / s;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lon, lat];
};

export const ringArea = (r: Position[]) => {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(a) / 2;
};

/** principal axis angle (deg, screen convention: y down, clockwise positive) of a ring */
const principalAngle = (ring: Position[]): number => {
  let sx = 0, sy = 0;
  for (const p of ring) { sx += p[0]; sy += p[1]; }
  const n = ring.length; const cx = sx / n, cy = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of ring) { const dx = p[0] - cx, dy = p[1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  return (Math.atan2(2 * sxy, sxx - syy) / 2) * (180 / Math.PI);
};

const splitLines = (name: string): string[][] => {
  const words = name.split(' ');
  const out: string[][] = [[name]];
  if (words.length >= 2) {
    // best 2-line split (balanced)
    let best: string[] | null = null; let bestD = 1e9;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const d = Math.abs(a.length - b.length);
      if (d < bestD) { bestD = d; best = [a, b]; }
    }
    if (best) out.push(best);
  }
  if (words.length >= 3) out.push(words); // one word per line
  return out;
};

const boxInside = (poly: Feature<Polygon | MultiPolygon>, cx: number, cy: number, w: number, h: number, angDeg: number): boolean => {
  const a = (angDeg * Math.PI) / 180; const ca = Math.cos(a), sa = Math.sin(a);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
    const u = (i / 6 - 0.5) * w, v = (j / 2 - 0.5) * h;
    pts.push([cx + u * ca - v * sa, cy + u * sa + v * ca]);
  }
  for (const p of pts) if (!turf.booleanPointInPolygon(turf.point(p), poly)) return false;
  return true;
};

export function fitLabel(
  feature: Feature<Polygon | MultiPolygon>,
  name: string,
  label: string,
  zoom: number,
  opts: {maxSize?: number; minSize?: number; pad?: number; charW?: number; measure?: (text: string, size: number) => number} = {},
): FittedLabel {
  const maxSize = opts.maxSize ?? 72, minSize = opts.minSize ?? 10, pad = opts.pad ?? 4, CHAR_W = opts.charW ?? CHAR_W_DEFAULT;
  const polys: Position[][][] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  // project to px space
  const pxPolys = polys.map((p) => p.map((ring) => ring.map(([lon, lat]) => toPx(lon, lat, zoom))));
  const biggest = pxPolys.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
  const pxFeat = turf.polygon(biggest) as Feature<Polygon>;
  const pole = polylabel(biggest as number[][][], 0.5);
  let [cx, cy] = [pole[0], pole[1]];
  const axis = principalAngle(biggest[0]);
  const axisN = axis > 90 ? axis - 180 : axis < -90 ? axis + 180 : axis;
  const angles = [0, ...(Math.abs(axisN) > 4 ? [axisN] : [])];
  const layouts = splitLines(label);

  let best: FittedLabel | null = null;
  for (const lines of layouts) {
    const chars = Math.max(...lines.map((l) => l.length));
    const widthAt = (size: number) => (opts.measure ? Math.max(...lines.map((l) => opts.measure!(l, size))) : size * CHAR_W * chars);
    for (const ang of angles) {
      // binary search largest size that fits
      let lo = minSize, hi = maxSize, ok = -1;
      for (let it = 0; it < 9; it++) {
        const mid = (lo + hi) / 2;
        const w = widthAt(mid) + pad * 2, h = mid * LINE_H * lines.length + pad * 2;
        if (boxInside(pxFeat, cx, cy, w, h, ang)) { ok = mid; lo = mid; } else hi = mid;
      }
      if (ok < 0) continue;
      // preference: bigger size, slight bias to horizontal & fewer lines
      const score = ok * (ang === 0 ? 1.3 : 1) * (lines.length === 1 ? 1.1 : 1);
      if (!best || score > (best as FittedLabel & {score?: number}).score!) {
        const [lon, lat] = fromPx(cx, cy, zoom);
        best = Object.assign({name, label: lines.join('\n'), lon, lat, angle: ang, size: Math.floor(ok), fit: true}, {score});
      }
    }
  }
  if (best) return best;
  const [lon, lat] = fromPx(cx, cy, zoom);
  const bb = turf.bbox(pxFeat);
  return {name, label: layouts[layouts.length - 1].join('\n'), lon, lat, angle: 0, size: minSize, fit: false, dbg: `bbox ${Math.round(bb[2] - bb[0])}x${Math.round(bb[3] - bb[1])}px polys ${pxPolys.length} pole ${Math.round(cx)},${Math.round(cy)} bb ${bb.map(Math.round).join(',')}`};
}
