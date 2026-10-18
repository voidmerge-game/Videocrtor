/** Screen areas reserved by HUD elements (archive cards, year badge, stat counter).
 *  Country names, city labels, flags and callouts must never sit under them. Pure function → also used by the QA checker. */
import {ARCHIVE} from '../events';
import {T, E, FIRST_VO, END_VO} from '../timeline';
import type {Rect} from './labels';

export type Reserved = Rect & {t0: number; t1: number; id: string; /** when the element is actually visible */ v0: number; v1: number};
const PAD = 18;
const LEAD = 0.45; // seconds before/after a card during which names underneath are already/still hidden

export const reservedAt = (tSec: number): Reserved[] => {
  const out: Reserved[] = [];
  for (const a of ARCHIVE) {
    if (a.wall) continue; // full-screen wall segments are handled by the scene itself
    const t0 = a.t - LEAD, t1 = a.until + LEAD;
    if (tSec < t0 || tSec > t1) continue;
    const x = a.x ?? 1080, y = a.y ?? 150, w = a.w ?? 720, h = a.h ?? 540;
    out.push({id: a.src, x: x - PAD, y: y - PAD, w: w + 2 * PAD, h: h + 2 * PAD, t0, t1, v0: a.t, v1: a.until});
  }
  if (tSec >= FIRST_VO && tSec < END_VO + 1.5) out.push({id: 'year', x: 1600, y: 30, w: 290, h: 120, t0: FIRST_VO, t1: END_VO + 1.5, v0: FIRST_VO, v1: END_VO + 1.5});
  const ca = T('S5_07') - 0.2, cb = E('S5_07') + 1.2;
  if (tSec >= ca - LEAD && tSec <= cb + LEAD) out.push({id: 'counter', x: 1380, y: 700, w: 460, h: 290, t0: ca - LEAD, t1: cb + LEAD, v0: ca, v1: cb});
  return out;
};

/** 0..1 visibility multiplier for something whose rect overlaps reserved areas (soft fade around the reservation window) */
export const reserveFade = (tSec: number, rects: Reserved[], hits: (r: Reserved) => boolean) => {
  let vis = 1;
  for (const r of rects) {
    if (!hits(r)) continue;
    const inF = Math.min(1, Math.max(0, (tSec - r.t0) / 0.35)), outF = Math.min(1, Math.max(0, (r.t1 - tSec) / 0.35));
    vis = Math.min(vis, 1 - Math.min(inF, outF));
  }
  return vis;
};
