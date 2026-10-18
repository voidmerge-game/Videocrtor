/**
 * Country-name layout + collision rectangles (shared by BigLabel, Main, FlagDrop, City).
 * A name is ALWAYS fully inside its territory polygon (band tables from scripts/label_fit.ts).
 */
export type Fit = {th: number; L0: number; Lv: number; La: number; Lp: number; ratio: number; r: number; bh: number[]; ba: number[]};
export type Layout = {fontPx: number; rotDeg: number; lines: string[]};
export type Rect = {x: number; y: number; w: number; h: number};

const OFFS = [0, 0.3, 0.6, 1.0, 1.5, 2.2, 3.0];
export const CHAR_EM = 1.02; // Montserrat 700 caps advance (~0.74em) + 0.28em tracking
export const LINE_H = 1.15;

const bandLen = (band: number[], halfH: number) => {
  let L = band[0];
  for (let i = 1; i < OFFS.length; i++) {
    if (OFFS[i] <= halfH) L = Math.min(L, band[i]);
    else { const f = (halfH - OFFS[i - 1]) / (OFFS[i] - OFFS[i - 1]); L = Math.min(L, band[i - 1] + (band[i] - band[i - 1]) * f); return L; }
  }
  return halfH > OFFS[OFFS.length - 1] ? L * 0.6 : L;
};
const split2 = (label: string): string[] | null => {
  const w = label.split(' ');
  if (w.length < 2) return null;
  let best: string[] | null = null, bestLen = Infinity;
  for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(a.length, b.length); if (m < bestLen) { bestLen = m; best = [a, b]; } }
  return best;
};
const fitFont = (lines: string[], band: number[], ppd: number) => {
  const chars = Math.max(...lines.map((l) => l.length));
  let lo = 6, hi = 130;
  const ok = (f: number) => chars * CHAR_EM * f <= 0.88 * bandLen(band, (lines.length * LINE_H * f) / 2 / ppd) * ppd;
  if (!ok(lo)) return 0;
  for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return lo;
};

/** layout for a fitted name at the current zoom (px per degree); null = too small to draw */
export const layoutFitted = (label: string, fit: Fit, ppd: number): Layout | null => {
  const two = split2(label);
  const cands: {f: number; real: number; rot: number; lines: string[]}[] = [];
  const h1 = fitFont([label], fit.bh, ppd); cands.push({f: h1, real: h1, rot: 0, lines: [label]});
  if (two) { const h2 = fitFont(two, fit.bh, ppd); cands.push({f: h2 * 0.9, real: h2, rot: 0, lines: two}); }
  if (Math.abs(fit.th) > 12) {
    const a1 = fitFont([label], fit.ba, ppd); cands.push({f: a1 / 1.4, real: a1, rot: -fit.th, lines: [label]});
    if (two) { const a2 = fitFont(two, fit.ba, ppd); cands.push({f: (a2 * 0.9) / 1.4, real: a2, rot: -fit.th, lines: two}); }
  }
  cands.sort((p, q) => q.f - p.f);
  const best = cands[0];
  const fontPx = Math.min(120, best.real);
  if (fontPx < 13) return null;
  return {fontPx, rotDeg: best.rot, lines: best.lines};
};
export const layoutManual = (label: string, size: number, rot: number, scale: number): Layout => ({
  fontPx: Math.min(120, size * 1.2 * Math.pow(scale / 2400, 0.7)), rotDeg: rot, lines: [label],
});

/** axis-aligned screen rectangle of a laid-out name centred at (cx, cy), with padding */
export const layoutRect = (cx: number, cy: number, L: Layout, pad = 10): Rect => {
  const chars = Math.max(...L.lines.map((l) => l.length));
  const w = chars * CHAR_EM * L.fontPx, h = L.lines.length * LINE_H * L.fontPx;
  const a = (L.rotDeg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const bw = w * c + h * s, bh = w * s + h * c;
  return {x: cx - bw / 2 - pad, y: cy - bh / 2 - pad, w: bw + 2 * pad, h: bh + 2 * pad};
};
export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** smallest translation that moves `r` out of every rect in `avoid` (pushes away from the rect centre; a few passes) */
export const pushOut = (r: Rect, avoid: Rect[]): [number, number] => {
  let dx = 0, dy = 0;
  for (let pass = 0; pass < 8; pass++) {
    const cur = {...r, x: r.x + dx, y: r.y + dy};
    const hit = avoid.find((a) => intersects(cur, a));
    if (!hit) break;
    const cx = cur.x + cur.w / 2 - (hit.x + hit.w / 2), cy = cur.y + cur.h / 2 - (hit.y + hit.h / 2);
    const ox = (cur.w + hit.w) / 2 - Math.abs(cx) + 4, oy = (cur.h + hit.h) / 2 - Math.abs(cy) + 4;
    // move along the axis that needs the smaller displacement, away from the name's centre
    if (oy <= ox) dy += (cy >= 0 ? 1 : -1) * oy; else dx += (cx >= 0 ? 1 : -1) * ox;
  }
  return [dx, dy];
};
