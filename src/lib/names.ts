/** The ONE place that decides which country names are drawn in a frame, where, how big — used by the Names layer,
 *  by LabelGuard (collision rectangles) and by scripts/qa_check.ts. Pure (no React). */
import {geoDistance, type GeoProjection} from 'd3-geo';
import {BIG, type BigEv} from '../events';
import {layoutFitted, layoutRect, shiftedLonLat, dirScaleAt, intersects, type Layout, type Rect} from './labels';
import {reservedAt, reserveFade} from './reserve';

export type Cam = {lon: number; lat: number; scale: number};
export type DrawnName = {ev: BigEv; label: string; lon: number; lat: number; x: number; y: number; L: Layout; rect: Rect; vis: number};

export const namesAt = (frame: number, fps: number, cam: Cam, projection: GeoProjection): DrawnName[] => {
  const t = frame / fps;
  const reserved = reservedAt(t);
  const cand: DrawnName[] = [];
  for (const b of BIG) {
    if (!b.fit) continue; // HARD RULE: only fitted names exist
    const at = Math.round(b.t * fps), until = b.until !== undefined ? Math.round(b.until * fps) : undefined;
    if (frame < at || (until !== undefined && frame > until) || cam.scale < (b.minScale ?? 0)) continue;
    const d = geoDistance([b.lon, b.lat], [cam.lon, cam.lat]);
    if (d > Math.PI / 2 - 0.05) continue;
    // fit against the real on-screen metrics at this spot (foreshortening + tilt of the parallels)
    const L = layoutFitted(b.label ?? b.text.toUpperCase(), b.fit, dirScaleAt((ll) => projection(ll) as [number, number] | null, b.lon, b.lat, b.fit.cs));
    if (!L) continue;
    const [lon, lat] = shiftedLonLat(b.lon, b.lat, L, b.fit.cs);
    const p = projection([lon, lat]);
    if (!p) continue;
    const rect = layoutRect(p[0], p[1], L, 6);
    if (rect.x > 1920 || rect.y > 1080 || rect.x + rect.w < 0 || rect.y + rect.h < 0) continue; // off-screen
    const f = frame - at;
    const io = until !== undefined ? Math.min(1, f / 14, (until - frame) / 14) : Math.min(1, f / 14);
    const hide = reserveFade(t, reserved, (r) => intersects(rect, r));
    const vis = Math.max(0, io) * hide;
    if (vis <= 0.01) continue;
    cand.push({ev: b, label: b.label ?? b.text.toUpperCase(), lon, lat, x: p[0], y: p[1], L, rect, vis});
  }
  // mutual overlap: bigger names win, the smaller one is dropped for this frame
  cand.sort((a, b) => b.L.fontPx - a.L.fontPx);
  const kept: DrawnName[] = [];
  for (const c of cand) if (!kept.some((k) => intersects(k.rect, c.rect))) kept.push(c);
  return kept;
};
