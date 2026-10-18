/**
 * Fit country-name labels to their polygons: pole of inaccessibility (anchor), principal axis (rotation),
 * free length along the axis and across it (for the font size). Output: src/label_pos.json
 */
import * as fs from 'fs';
import * as topojson from 'topojson-client';

type Ring = [number, number][];
const load = (file: string, obj: string) => {
  const topo = JSON.parse(fs.readFileSync(`public/data/${file}.json`, 'utf8'));
  return (topojson.feature(topo, topo.objects[obj]) as any).features as any[];
};
const ringArea = (r: Ring) => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
const inside = (x: number, y: number, r: Ring) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const segDist = (x: number, y: number, r: Ring) => { let d = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; const dx = xj - xi, dy = yj - yi; const l2 = dx * dx + dy * dy || 1e-12; let t = ((x - xi) * dx + (y - yi) * dy) / l2; t = Math.max(0, Math.min(1, t)); const px = xi + t * dx - x, py = yi + t * dy - y; d = Math.min(d, px * px + py * py); } return Math.sqrt(d); };

const fit = (geom: any) => {
  const polys: Ring[][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best: Ring | null = null, bestA = 0;
  for (const p of polys) { const a = ringArea(p[0]); if (a > bestA) { bestA = a; best = p[0]; } }
  if (!best) return null;
  const latc = best.reduce((s, p) => s + p[1], 0) / best.length;
  const cs = Math.cos((latc * Math.PI) / 180);
  const ring: Ring = best.map(([lo, la]) => [lo * cs, la]);
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const N = 70; const P: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = x0 + ((i + 0.5) / N) * (x1 - x0), y = y0 + ((j + 0.5) / N) * (y1 - y0); if (inside(x, y, ring)) P.push([x, y]); }
  if (P.length < 4) return null;
  // pole of inaccessibility
  let pole = P[0], pd = -1;
  for (const [x, y] of P) { const d = segDist(x, y, ring); if (d > pd) { pd = d; pole = [x, y]; } }
  const step = Math.max(x1 - x0, y1 - y0) / N;
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const x = pole[0] + (i * step) / 4, y = pole[1] + (j * step) / 4; if (inside(x, y, ring)) { const d = segDist(x, y, ring); if (d > pd) { pd = d; pole = [x, y]; } } }
  // PCA
  const mx = P.reduce((s, p) => s + p[0], 0) / P.length, my = P.reduce((s, p) => s + p[1], 0) / P.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of P) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const l1 = (sxx + syy) / 2 + Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2), l2 = (sxx + syy) / 2 - Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
  const ratio = Math.sqrt(l1 / Math.max(l2, 1e-9));
  // free length through a point p along direction ang (both ways), 0 if p is outside
  const rayFrom = (px: number, py: number, ang: number) => {
    if (!inside(px, py, ring)) return 0;
    const u = [Math.cos(ang), Math.sin(ang)]; let L = 0;
    for (const sgn of [1, -1]) { let d = 0; const st = step / 3; while (d < 200) { d += st; if (!inside(px + sgn * u[0] * d, py + sgn * u[1] * d, ring)) break; } L += d - st; }
    return L;
  };
  // free length along `ang` within a band of half-height `off` (perpendicular offsets), min over the band
  const OFFS = [0, 0.3, 0.6, 1.0, 1.5, 2.2, 3.0];
  const band = (ang: number) => OFFS.map((off) => {
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    let L = Infinity;
    for (const o of off === 0 ? [0] : [-off, -off / 2, 0, off / 2, off]) L = Math.min(L, rayFrom(pole[0] + nx * o, pole[1] + ny * o, ang));
    return +L.toFixed(2);
  });
  let a = (th * 180) / Math.PI; // math angle (y up); CSS rotation = -a
  while (a > 90) a -= 180; while (a <= -90) a += 180;
  const L0 = rayFrom(pole[0], pole[1], 0), Lv = rayFrom(pole[0], pole[1], Math.PI / 2), Laxis = rayFrom(pole[0], pole[1], th), Lperp = rayFrom(pole[0], pole[1], th + Math.PI / 2);
  return {lon: +(pole[0] / cs).toFixed(3), lat: +pole[1].toFixed(3), th: +a.toFixed(1), L0: +L0.toFixed(2), Lv: +Lv.toFixed(2), La: +Laxis.toFixed(2), Lp: +Lperp.toFixed(2), ratio: +ratio.toFixed(2), r: +pd.toFixed(2), bh: band(0), ba: band(th)};
};

const out: Record<string, Record<string, any>> = {};
for (const [file, obj, key] of [['africa_1880', 'w1880', '1880'], ['africa_1900', 'w1900', '1900'], ['colonies_1914', 'w1914', '1914']] as const) {
  out[key] = {};
  for (const f of load(file, obj)) { const n = f.properties?.NAME; if (!n) continue; const r = fit(f.geometry); if (r) out[key][n] = r; }
}
fs.writeFileSync('src/label_pos.json', JSON.stringify(out));
for (const k of Object.keys(out)) console.log(k, Object.keys(out[k]).length, 'labels');
for (const n of ['French Equatorial Africa', 'Kamerun', 'Nigeria', 'Mozambique', 'Angola', 'German South-West Africa', 'British East Africa', 'Italian Somaliland', 'Libya', 'Anglo-Egyptian Sudan', 'Togoland']) console.log(n, JSON.stringify(out['1914'][n]));
